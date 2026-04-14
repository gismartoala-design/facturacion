import {
  KitchenTicketItemStatus,
  KitchenTicketStatus,
  MovementType,
  Prisma,
  ReferenceType,
  RestaurantOrderChannel,
  RestaurantOrderItemStatus,
  RestaurantOrderStatus,
  TableSessionStatus,
} from "@prisma/client";

import {
  ensureDefaultBusiness,
  getBusinessContextById,
} from "@/core/business/business.service";
import { getActiveCashSession } from "@/core/cash-management/cash-session.service";
import {
  checkoutSchema,
  type CheckoutInput,
} from "@/core/sales/schemas";
import {
  createImmediateCollectionsInTransaction,
  createReceivableForPendingBalanceInTransaction,
  type CheckoutOptions,
} from "@/core/sales/checkout.service";
import { createDocumentForSaleInTransaction, type PendingSaleDocumentAuthorization } from "@/core/sales/document.service";
import { createSaleInTransaction } from "@/core/sales/sale.service";
import { postSaleEntryInTransaction } from "@/core/accounting/accounting-entry.service";
import type { SessionPayload } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { normalizeProductSku, roundMoney } from "@/lib/utils";
import { resolveBillingRuntime } from "@/modules/billing/policies/resolve-billing-runtime";
import { resolveCashRuntime } from "@/modules/cash-management/policies/resolve-cash-runtime";
import { resolvePosRuntime } from "@/modules/pos/policies/resolve-pos-runtime";
import {
  createDiningAreaSchema,
  createKitchenStationSchema,
  createPrepBatchSchema,
  createRecipeSchema,
  createRestaurantMenuProductSchema,
  createRestaurantTableSchema,
  createRestaurantOrderSchema,
  fireRestaurantOrderSchema,
  mergeRestaurantOrderSchema,
  openRestaurantTableSchema,
  settleRestaurantOrderSchema,
  transferRestaurantTableSchema,
  updateDiningAreaSchema,
  updateKitchenStationSchema,
  updateRestaurantMenuProductSchema,
  updateKitchenTicketStatusSchema,
  updateRestaurantTableSchema,
  updateRestaurantOrderSchema,
  type SettleRestaurantOrderInput,
} from "@/modules/restaurant/restaurant.schemas";

const logger = createLogger("RestaurantService");

const DEFAULT_DINING_AREA_CODE = "SG01";
const DEFAULT_DINING_AREA_NAME = "Salón General";

const WALK_IN_CUSTOMER = {
  tipoIdentificacion: "07",
  identificacion: "9999999999999",
  razonSocial: "Consumidor final",
  direccion: "",
  email: "",
  telefono: "",
} as const;

const restaurantOrderInclude = {
  customer: true,
  tableSession: {
    include: {
      table: {
        include: {
          diningArea: true,
        },
      },
    },
  },
  items: {
    include: {
      product: true,
      modifiers: true,
      kitchenTicketItems: {
        include: {
          ticket: true,
        },
      },
      settlements: true,
      prepBatchConsumptions: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  },
  kitchenTickets: {
    include: {
      station: true,
      items: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  },
  sales: {
    include: {
      payments: true,
      document: true,
      sriInvoice: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  },
} satisfies Prisma.RestaurantOrderInclude;

type RestaurantOrderRecord = Prisma.RestaurantOrderGetPayload<{
  include: typeof restaurantOrderInclude;
}>;

type RestaurantContext = {
  business: Awaited<ReturnType<typeof ensureDefaultBusiness>>;
  posRuntime: ReturnType<typeof resolvePosRuntime>;
  billingRuntime: ReturnType<typeof resolveBillingRuntime>;
  cashRuntime: ReturnType<typeof resolveCashRuntime>;
  activeCashSession: Awaited<ReturnType<typeof getActiveCashSession>>;
};

type SettlementSelection = {
  item: RestaurantOrderRecord["items"][number];
  quantity: number;
  subtotal: number;
  taxTotal: number;
  total: number;
};

type MenuRecipeSelectProduct = {
  id: string;
  secuencial: bigint;
  sku: string | null;
  nombre: string;
  tipoProducto: "BIEN" | "SERVICIO";
  activo: boolean;
  precio: Prisma.Decimal;
  restaurantVisible: boolean;
  restaurantCategory: string | null;
  restaurantMenuGroup: string | null;
  restaurantMenuSortOrder: number | null;
  restaurantStationCode: string | null;
  allowsModifiers: boolean;
  prepTimeMinutes: number | null;
  recipeConsumptionEnabled: boolean;
  recipeMenuItems: Array<{
    id: string;
    ingredients: Array<{ id: string }>;
  }>;
};

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value == null) return 0;
  return Number(value);
}

function presentRestaurantMenuProduct(product: MenuRecipeSelectProduct) {
  const recipe = product.recipeMenuItems[0] ?? null;

  return {
    id: product.id,
    codigo: normalizeProductSku(product.sku) || product.secuencial.toString(),
    nombre: product.nombre,
    tipoProducto: product.tipoProducto,
    activo: product.activo,
    precio: toNumber(product.precio),
    restaurantVisible: product.restaurantVisible,
    restaurantCategory: product.restaurantCategory,
    restaurantMenuGroup: product.restaurantMenuGroup,
    restaurantMenuSortOrder: product.restaurantMenuSortOrder,
    restaurantStationCode: product.restaurantStationCode,
    allowsModifiers: product.allowsModifiers,
    prepTimeMinutes: product.prepTimeMinutes,
    recipeConsumptionEnabled: product.recipeConsumptionEnabled,
    hasRecipe: Boolean(recipe),
    ingredientCount: recipe?.ingredients.length ?? 0,
  };
}

function formatIssueDate(date = new Date()) {
  const day = `${date.getDate()}`.padStart(2, "0");
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function normalizeOperationalCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "_");
}

function normalizeOperationalPrefix(value: string, fallback: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 2);

  return normalized || fallback;
}

async function buildNextOperationalCode(params: {
  tx: Prisma.TransactionClient;
  model: "diningArea" | "restaurantTable";
  businessId: string;
  prefix: string;
  padLength: number;
}) {
  const { tx, model, businessId, prefix, padLength } = params;
  const normalizedPrefix = normalizeOperationalPrefix(prefix, "X");
  const rows =
    model === "diningArea"
      ? await tx.diningArea.findMany({
          where: {
            businessId,
            code: {
              startsWith: normalizedPrefix,
            },
          },
          select: { code: true },
        })
      : await tx.restaurantTable.findMany({
          where: {
            businessId,
            code: {
              startsWith: normalizedPrefix,
            },
          },
          select: { code: true },
        });

  const currentMax = rows.reduce((max, row) => {
    const match = row.code.match(
      new RegExp(`^${normalizedPrefix}(\\d+)$`, "i"),
    );

    if (!match) {
      return max;
    }

    const value = Number(match[1]);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);

  return `${normalizedPrefix}${String(currentMax + 1).padStart(padLength, "0")}`;
}

async function buildNextSimpleRestaurantTableCode(
  tx: Prisma.TransactionClient,
  businessId: string,
) {
  const rows = await tx.restaurantTable.findMany({
    where: { businessId },
    select: { code: true },
  });

  const currentMax = rows.reduce((max, row) => {
    const value = Number(row.code);
    return Number.isInteger(value) ? Math.max(max, value) : max;
  }, 0);

  return String(currentMax + 1);
}

async function ensureDefaultDiningAreaInTransaction(
  tx: Prisma.TransactionClient,
  businessId: string,
) {
  const activeAreaCount = await tx.diningArea.count({
    where: {
      businessId,
      active: true,
    },
  });

  if (activeAreaCount > 0) {
    return tx.diningArea.findFirst({
      where: {
        businessId,
        code: DEFAULT_DINING_AREA_CODE,
      },
    });
  }

  const existingDefault = await tx.diningArea.findFirst({
    where: {
      businessId,
      code: DEFAULT_DINING_AREA_CODE,
    },
  });

  if (existingDefault) {
    return tx.diningArea.update({
      where: { id: existingDefault.id },
      data: {
        active: true,
        sortOrder: 0,
      },
    });
  }

  return tx.diningArea.create({
    data: {
      businessId,
      code: DEFAULT_DINING_AREA_CODE,
      name: DEFAULT_DINING_AREA_NAME,
      sortOrder: 0,
      active: true,
    },
  });
}

async function ensureDefaultDiningArea(
  businessId: string,
) {
  return prisma.$transaction((tx) =>
    ensureDefaultDiningAreaInTransaction(tx, businessId),
  );
}

function getActiveQuantity(item: RestaurantOrderRecord["items"][number]) {
  return Math.max(
    0,
    toNumber(item.quantity) - toNumber(item.cancelledQuantity),
  );
}

function getAvailableSettlementQuantity(
  item: RestaurantOrderRecord["items"][number],
) {
  return Math.max(0, getActiveQuantity(item) - toNumber(item.billedQuantity));
}

function computeLineAmounts(params: {
  selectedQuantity: number;
  originalQuantity: number;
  unitPrice: number;
  discount: number;
  ivaRate: number;
}) {
  const proportionalDiscount =
    params.originalQuantity > 0
      ? roundMoney(
          (params.discount * params.selectedQuantity) / params.originalQuantity,
        )
      : 0;
  const subtotal = roundMoney(
    params.selectedQuantity * params.unitPrice - proportionalDiscount,
  );
  const taxTotal = roundMoney((subtotal * params.ivaRate) / 100);
  const total = roundMoney(subtotal + taxTotal);

  return {
    subtotal,
    taxTotal,
    total,
    discount: proportionalDiscount,
  };
}

function deriveOrderItemStatus(item: {
  quantity: Prisma.Decimal | number;
  cancelledQuantity: Prisma.Decimal | number;
  billedQuantity: Prisma.Decimal | number;
  servedAt: Date | null;
  readyAt: Date | null;
  preparedAt: Date | null;
  sentAt: Date | null;
}) {
  const quantity = toNumber(item.quantity);
  const cancelledQuantity = toNumber(item.cancelledQuantity);
  const billedQuantity = toNumber(item.billedQuantity);
  const activeQuantity = Math.max(0, quantity - cancelledQuantity);

  if (activeQuantity <= 0) {
    return RestaurantOrderItemStatus.CANCELLED;
  }

  if (billedQuantity >= activeQuantity) {
    return RestaurantOrderItemStatus.BILLED;
  }

  if (item.servedAt) return RestaurantOrderItemStatus.SERVED;
  if (item.readyAt) return RestaurantOrderItemStatus.READY;
  if (item.preparedAt) return RestaurantOrderItemStatus.IN_PREPARATION;
  if (item.sentAt) return RestaurantOrderItemStatus.SENT;
  return RestaurantOrderItemStatus.PENDING;
}

function deriveOrderStatus(items: Array<{
  quantity: Prisma.Decimal | number;
  cancelledQuantity: Prisma.Decimal | number;
  billedQuantity: Prisma.Decimal | number;
  servedAt: Date | null;
  readyAt: Date | null;
  preparedAt: Date | null;
  sentAt: Date | null;
}>) {
  if (items.length === 0) {
    return RestaurantOrderStatus.OPEN;
  }

  const statuses = items.map(deriveOrderItemStatus);
  const activeCount = items.filter((item) => {
    const activeQuantity =
      toNumber(item.quantity) - toNumber(item.cancelledQuantity);
    return activeQuantity > 0;
  }).length;

  if (activeCount === 0) {
    return RestaurantOrderStatus.CANCELLED;
  }

  if (statuses.every((status) => status === RestaurantOrderItemStatus.BILLED)) {
    return RestaurantOrderStatus.PAID;
  }

  if (statuses.some((status) => status === RestaurantOrderItemStatus.BILLED)) {
    return RestaurantOrderStatus.PARTIALLY_PAID;
  }

  if (statuses.every((status) => status === RestaurantOrderItemStatus.SERVED)) {
    return RestaurantOrderStatus.SERVED;
  }

  if (statuses.some((status) => status === RestaurantOrderItemStatus.SERVED)) {
    return RestaurantOrderStatus.PARTIALLY_SERVED;
  }

  if (
    statuses.some((status) =>
      status === RestaurantOrderItemStatus.SENT ||
      status === RestaurantOrderItemStatus.IN_PREPARATION ||
      status === RestaurantOrderItemStatus.READY,
    )
  ) {
    return RestaurantOrderStatus.IN_PREPARATION;
  }

  return RestaurantOrderStatus.OPEN;
}

function summarizeOrder(order: RestaurantOrderRecord) {
  const itemSummaries = order.items.map((item) => {
    const quantity = toNumber(item.quantity);
    const cancelledQuantity = toNumber(item.cancelledQuantity);
    const billedQuantity = toNumber(item.billedQuantity);
    const activeQuantity = Math.max(0, quantity - cancelledQuantity);
    const remainingQuantity = Math.max(0, activeQuantity - billedQuantity);
    const amounts = computeLineAmounts({
      selectedQuantity: activeQuantity,
      originalQuantity: quantity,
      unitPrice: toNumber(item.precioUnitario),
      discount: toNumber(item.descuento),
      ivaRate: toNumber(item.tarifaIva),
    });
    const remainingAmounts = computeLineAmounts({
      selectedQuantity: remainingQuantity,
      originalQuantity: quantity,
      unitPrice: toNumber(item.precioUnitario),
      discount: toNumber(item.descuento),
      ivaRate: toNumber(item.tarifaIva),
    });

    return {
      id: item.id,
      productId: item.productId,
      productName: item.product.nombre,
      quantity,
      activeQuantity,
      remainingQuantity,
      billedQuantity,
      cancelledQuantity,
      unitPrice: toNumber(item.precioUnitario),
      ivaRate: toNumber(item.tarifaIva),
      discount: toNumber(item.descuento),
      notes: item.notes,
      status: item.status,
      sentAt: item.sentAt,
      preparedAt: item.preparedAt,
      readyAt: item.readyAt,
      servedAt: item.servedAt,
      modifiers: item.modifiers.map((modifier) => ({
        id: modifier.id,
        name: modifier.name,
        priceDelta: toNumber(modifier.priceDelta),
      })),
      totals: amounts,
      openTotals: remainingAmounts,
    };
  });

  const openTotal = roundMoney(
    itemSummaries.reduce((acc, item) => acc + item.openTotals.total, 0),
  );

  return {
    id: order.id,
    channel: order.channel,
    status: order.status,
    guestCount: order.guestCount,
    notes: order.notes,
    customer: order.customer
      ? {
          id: order.customer.id,
          tipoIdentificacion: order.customer.tipoIdentificacion,
          identificacion: order.customer.identificacion,
          razonSocial: order.customer.razonSocial,
          direccion: order.customer.direccion,
          email: order.customer.email,
          telefono: order.customer.telefono,
        }
      : null,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    deliveryAddress: order.deliveryAddress,
    deliveryReference: order.deliveryReference,
    assignedDriverName: order.assignedDriverName,
    dispatchedAt: order.dispatchedAt,
    deliveredAt: order.deliveredAt,
    table:
      order.tableSession?.table != null
        ? {
            id: order.tableSession.table.id,
            code: order.tableSession.table.code,
            name: order.tableSession.table.name,
            diningAreaName: order.tableSession.table.diningArea?.name ?? null,
          }
        : null,
    session:
      order.tableSession != null
        ? {
            id: order.tableSession.id,
            status: order.tableSession.status,
            guestCount: order.tableSession.guestCount,
            openedAt: order.tableSession.openedAt,
            closedAt: order.tableSession.closedAt,
          }
        : null,
    items: itemSummaries,
    kitchenTickets: order.kitchenTickets.map((ticket) => ({
      id: ticket.id,
      stationCode: ticket.stationCode,
      stationName: ticket.station?.name ?? ticket.stationCode,
      status: ticket.status,
      createdAt: ticket.createdAt,
      items: ticket.items.map((item) => ({
        id: item.id,
        orderItemId: item.orderItemId,
        quantity: toNumber(item.quantity),
        status: item.status,
      })),
    })),
    sales: order.sales.map((sale) => ({
      id: sale.id,
      saleNumber: sale.saleNumber.toString(),
      status: sale.status,
      total: toNumber(sale.total),
      document: sale.document
        ? {
            id: sale.document.id,
            type: sale.document.type,
            status: sale.document.status,
            fullNumber: sale.document.fullNumber,
          }
        : null,
    })),
    totals: {
      openTotal,
    },
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

async function getRestaurantContext(
  session: SessionPayload,
): Promise<RestaurantContext> {
  const business = session.businessId
    ? await getBusinessContextById(session.businessId)
    : await ensureDefaultBusiness();
  const posRuntime = resolvePosRuntime({
    blueprint: business.blueprint,
  });

  if (!posRuntime.enabled || posRuntime.policyPack !== "POS_RESTAURANT") {
    throw new Error("POS restaurante no habilitado para este negocio");
  }

  const billingRuntime = resolveBillingRuntime({
    blueprint: business.blueprint,
    taxProfile: business.taxProfile,
  });
  const cashRuntime = resolveCashRuntime(business.blueprint);
  const activeCashSession = cashRuntime.enabled
    ? await getActiveCashSession(business.id, session.sub)
    : null;

  return {
    business,
    posRuntime,
    billingRuntime,
    cashRuntime,
    activeCashSession,
  };
}

async function getOrderOrThrow(
  tx: Prisma.TransactionClient,
  businessId: string,
  orderId: string,
) {
  const order = await tx.restaurantOrder.findFirst({
    where: {
      id: orderId,
      businessId,
    },
    include: restaurantOrderInclude,
  });

  if (!order) {
    throw new Error("Orden de restaurante no encontrada");
  }

  return order;
}

async function getOpenTableSessionByTableId(
  tx: Prisma.TransactionClient,
  businessId: string,
  tableId: string,
) {
  return tx.tableSession.findFirst({
    where: {
      businessId,
      tableId,
      status: TableSessionStatus.OPEN,
    },
    orderBy: {
      openedAt: "desc",
    },
  });
}

async function ensureKitchenStation(
  tx: Prisma.TransactionClient,
  businessId: string,
  stationCode: string,
) {
  return tx.kitchenStation.upsert({
    where: {
      businessId_code: {
        businessId,
        code: stationCode,
      },
    },
    update: {
      active: true,
      name: stationCode === "GENERAL" ? "General" : stationCode,
    },
    create: {
      businessId,
      code: stationCode,
      name: stationCode === "GENERAL" ? "General" : stationCode,
      active: true,
    },
  });
}

async function consumeRecipeForOrderItemInTransaction(params: {
  tx: Prisma.TransactionClient;
  businessId: string;
  orderId: string;
  orderItem: RestaurantOrderRecord["items"][number];
  quantity: number;
  createdById: string;
  allowPrepBatches: boolean;
}) {
  const { tx, businessId, orderId, orderItem, quantity, createdById, allowPrepBatches } =
    params;
  const recipe = await tx.recipe.findUnique({
    where: {
      businessId_productId: {
        businessId,
        productId: orderItem.productId,
      },
    },
    include: {
      ingredients: true,
    },
  });

  if (!recipe) {
    throw new Error(
      `Debes configurar la receta de ${orderItem.product.nombre} antes de enviar a cocina`,
    );
  }

  for (const ingredient of recipe.ingredients) {
    let remainingQuantity = roundMoney(toNumber(ingredient.quantity) * quantity);

    if (ingredient.usePrepBatches && allowPrepBatches) {
      const batches = await tx.prepBatch.findMany({
        where: {
          businessId,
          productId: ingredient.productId,
          availableQuantity: { gt: 0 },
        },
        orderBy: [{ producedAt: "asc" }, { createdAt: "asc" }],
      });

      for (const batch of batches) {
        if (remainingQuantity <= 0) {
          break;
        }

        const available = toNumber(batch.availableQuantity);
        if (available <= 0) {
          continue;
        }

        const consumed = Math.min(available, remainingQuantity);
        remainingQuantity = roundMoney(remainingQuantity - consumed);

        await tx.prepBatch.update({
          where: { id: batch.id },
          data: {
            availableQuantity: { decrement: consumed },
          },
        });
        await tx.prepBatchConsumption.create({
          data: {
            prepBatchId: batch.id,
            restaurantOrderItemId: orderItem.id,
            quantity: new Prisma.Decimal(consumed),
          },
        });
      }
    }

    if (remainingQuantity <= 0) {
      continue;
    }

    const updatedStock = await tx.stockLevel.updateMany({
      where: {
        productId: ingredient.productId,
        quantity: { gte: remainingQuantity },
      },
      data: {
        quantity: { decrement: remainingQuantity },
      },
    });

    if (updatedStock.count === 0) {
      throw new Error(
        `Stock insuficiente para insumo ${ingredient.productId} en orden ${orderId}`,
      );
    }

    await tx.stockMovement.create({
      data: {
        productId: ingredient.productId,
        movementType: MovementType.OUT,
        referenceType: ReferenceType.MANUAL,
        referenceId: orderItem.id,
        quantity: new Prisma.Decimal(remainingQuantity),
        createdById,
        notes: `Consumo por receta al enviar orden ${orderId}`,
      },
    });
  }

  return { missingRecipe: false };
}

async function revertRecipeConsumptionForOrderItemInTransaction(params: {
  tx: Prisma.TransactionClient;
  businessId: string;
  orderId: string;
  orderItem: RestaurantOrderRecord["items"][number];
  quantity: number;
  createdById: string;
}) {
  const { tx, businessId, orderId, orderItem, quantity, createdById } = params;
  const hadDirectConsumption = await tx.stockMovement.findFirst({
    where: {
      referenceId: orderItem.id,
      movementType: MovementType.OUT,
    },
    select: { id: true },
  });
  const prepConsumptions = [...orderItem.prepBatchConsumptions];
  let revertedPrepQuantity = 0;

  for (const consumption of prepConsumptions) {
    if (revertedPrepQuantity >= quantity) {
      break;
    }

    const availableToRevert = Math.min(
      toNumber(consumption.quantity),
      roundMoney(quantity - revertedPrepQuantity),
    );

    if (availableToRevert <= 0) {
      continue;
    }

    revertedPrepQuantity = roundMoney(revertedPrepQuantity + availableToRevert);
    await tx.prepBatch.update({
      where: { id: consumption.prepBatchId },
      data: {
        availableQuantity: { increment: availableToRevert },
      },
    });
    await tx.prepBatchConsumption.update({
      where: { id: consumption.id },
      data: {
        quantity: { decrement: availableToRevert },
      },
    });
  }

  const recipe = await tx.recipe.findFirst({
    where: {
      productId: orderItem.productId,
      businessId,
    },
    include: {
      ingredients: true,
    },
  });

  if (!recipe || (!hadDirectConsumption && prepConsumptions.length === 0)) {
    return;
  }

  for (const ingredient of recipe.ingredients) {
    const quantityToReturn = roundMoney(toNumber(ingredient.quantity) * quantity);
    await tx.stockLevel.updateMany({
      where: { productId: ingredient.productId },
      data: {
        quantity: { increment: quantityToReturn },
      },
    });
    await tx.stockMovement.create({
      data: {
        productId: ingredient.productId,
        movementType: MovementType.IN,
        referenceType: ReferenceType.MANUAL,
        referenceId: orderItem.id,
        quantity: new Prisma.Decimal(quantityToReturn),
        createdById,
        notes: `Reversion de receta por cancelacion en orden ${orderId}`,
      },
    });
  }
}

async function cancelOrderItemQuantityInTransaction(params: {
  tx: Prisma.TransactionClient;
  order: RestaurantOrderRecord;
  orderItemId: string;
  quantity?: number;
  createdById: string;
}) {
  const { tx, order, orderItemId, quantity, createdById } = params;
  const orderItem = order.items.find((item) => item.id === orderItemId);

  if (!orderItem) {
    throw new Error("Item de orden no encontrado");
  }

  if (orderItem.servedAt) {
    throw new Error("No se puede cancelar un item ya servido");
  }

  const activeQuantity = getActiveQuantity(orderItem);
  const requestedQuantity = quantity ?? activeQuantity;

  if (requestedQuantity <= 0 || requestedQuantity > activeQuantity) {
    throw new Error("Cantidad invalida para cancelar");
  }

  if (
    orderItem.sentAt &&
    orderItem.product.recipeConsumptionEnabled
  ) {
    await revertRecipeConsumptionForOrderItemInTransaction({
      tx,
      businessId: order.businessId,
      orderId: order.id,
      orderItem: {
        ...orderItem,
      } as RestaurantOrderRecord["items"][number],
      quantity: requestedQuantity,
      createdById,
    });
  }

  await tx.restaurantOrderItem.update({
    where: { id: orderItem.id },
    data: {
      cancelledQuantity: { increment: requestedQuantity },
    },
  });
}

export async function syncRestaurantOrderStateInTransaction(
  tx: Prisma.TransactionClient,
  orderId: string,
) {
  const order = await tx.restaurantOrder.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      tableSession: true,
    },
  });

  if (!order) {
    return null;
  }

  for (const item of order.items) {
    await tx.restaurantOrderItem.update({
      where: { id: item.id },
      data: {
        status: deriveOrderItemStatus(item),
      },
    });
  }

  const nextStatus = deriveOrderStatus(order.items);

  const updatedOrder = await tx.restaurantOrder.update({
    where: { id: orderId },
    data: {
      status: nextStatus,
    },
    include: restaurantOrderInclude,
  });

  if (
    updatedOrder.tableSessionId &&
    (nextStatus === RestaurantOrderStatus.PAID ||
      nextStatus === RestaurantOrderStatus.CANCELLED)
  ) {
    const pendingOrders = await tx.restaurantOrder.count({
      where: {
        tableSessionId: updatedOrder.tableSessionId,
        status: {
          notIn: [RestaurantOrderStatus.PAID, RestaurantOrderStatus.CANCELLED],
        },
      },
    });

    if (pendingOrders === 0) {
      await tx.tableSession.update({
        where: { id: updatedOrder.tableSessionId },
        data: {
          status: TableSessionStatus.CLOSED,
          closedAt: new Date(),
        },
      });
    }
  }

  return updatedOrder;
}

function buildCheckoutInputFromSettlement(params: {
  order: RestaurantOrderRecord;
  input: SettleRestaurantOrderInput;
  selections: SettlementSelection[];
  issuerId: string;
  createdById: string;
  cashSessionId?: string | null;
  documentType: "NONE" | "INVOICE";
}) {
  const { order, input, selections, issuerId, createdById, cashSessionId, documentType } =
    params;
  const customer =
    input.customer ??
    (order.customer
      ? {
          tipoIdentificacion: order.customer.tipoIdentificacion,
          identificacion: order.customer.identificacion,
          razonSocial: order.customer.razonSocial,
          direccion: order.customer.direccion ?? "",
          email: order.customer.email ?? "",
          telefono: order.customer.telefono ?? "",
        }
      : {
          ...WALK_IN_CUSTOMER,
          razonSocial:
            order.customerName?.trim() || WALK_IN_CUSTOMER.razonSocial,
          telefono: order.customerPhone?.trim() || WALK_IN_CUSTOMER.telefono,
        });

  return checkoutSchema.parse({
    documentType,
    createdById,
    issuerId,
    cashSessionId: cashSessionId ?? null,
    source: "POS",
    fechaEmision: formatIssueDate(),
    moneda: "USD",
    customer,
    items: selections.map((selection) => ({
      productId: selection.item.productId,
      cantidad: selection.quantity,
      precioUnitario: toNumber(selection.item.precioUnitario),
      descuento: roundMoney(
        (toNumber(selection.item.descuento) * selection.quantity) /
          Math.max(toNumber(selection.item.quantity), 1),
      ),
      tarifaIva: toNumber(selection.item.tarifaIva),
    })),
    payments: input.payments,
    infoAdicional: {
      restaurantOrderId: order.id,
      restaurantChannel: order.channel,
      settlementNotes: input.notes || null,
    },
  } satisfies CheckoutInput);
}

async function loadSettlementSelections(
  order: RestaurantOrderRecord,
  requestedItems: SettleRestaurantOrderInput["items"],
) {
  const sourceItems: Array<{ orderItemId: string; quantity?: number }> =
    requestedItems?.length
      ? requestedItems
      : order.items.map((item) => ({ orderItemId: item.id }));
  const selections: SettlementSelection[] = [];

  for (const sourceItem of sourceItems) {
    const item = order.items.find((candidate) => candidate.id === sourceItem.orderItemId);
    if (!item) {
      throw new Error("Uno de los items seleccionados no pertenece a la orden");
    }

    const availableQuantity = getAvailableSettlementQuantity(item);
    const quantity = sourceItem.quantity ?? availableQuantity;

    if (quantity <= 0 || quantity > availableQuantity) {
      throw new Error(`Cantidad invalida para liquidar ${item.product.nombre}`);
    }

    const amounts = computeLineAmounts({
      selectedQuantity: quantity,
      originalQuantity: toNumber(item.quantity),
      unitPrice: toNumber(item.precioUnitario),
      discount: toNumber(item.descuento),
      ivaRate: toNumber(item.tarifaIva),
    });

    selections.push({
      item,
      quantity,
      subtotal: amounts.subtotal,
      taxTotal: amounts.taxTotal,
      total: amounts.total,
    });
  }

  if (selections.length === 0) {
    throw new Error("No hay items disponibles para liquidar");
  }

  return selections;
}

export async function getRestaurantBootstrap(session: SessionPayload) {
  const context = await getRestaurantContext(session);
  await ensureDefaultDiningArea(context.business.id);
  const [diningAreas, stations, products, floor] = await Promise.all([
    prisma.diningArea.findMany({
      where: { businessId: context.business.id, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.kitchenStation.findMany({
      where: { businessId: context.business.id, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.product.findMany({
      where: {
        activo: true,
        restaurantVisible: true,
      },
      orderBy: [
        { restaurantMenuGroup: "asc" },
        { restaurantMenuSortOrder: "asc" },
        { nombre: "asc" },
      ],
      select: {
        id: true,
        secuencial: true,
        sku: true,
        codigoBarras: true,
        tipoProducto: true,
        nombre: true,
        descripcion: true,
        precio: true,
        tarifaIva: true,
        activo: true,
        restaurantVisible: true,
        restaurantCategory: true,
        restaurantMenuGroup: true,
        restaurantMenuSortOrder: true,
        restaurantStationCode: true,
        allowsModifiers: true,
        prepTimeMinutes: true,
        stockLevel: {
          select: {
            quantity: true,
            minQuantity: true,
          },
        },
      },
    }),
    listRestaurantFloor(session),
  ]);

  return {
    business: {
      id: context.business.id,
      name: context.business.name,
      legalName: context.business.legalName,
      ruc: context.business.ruc,
    },
    operator: {
      id: session.sub,
      name: session.name,
      role: session.role,
    },
    posRuntime: context.posRuntime,
    restaurantRuntime: {
      service: context.posRuntime.service,
      channels: context.posRuntime.channels,
      kitchen: context.posRuntime.kitchen,
      inventory: context.posRuntime.inventory,
    },
    cashSession: context.activeCashSession
      ? {
          id: context.activeCashSession.id,
          status: context.activeCashSession.status,
          openingAmount: context.activeCashSession.openingAmount,
        }
      : null,
    diningAreas,
    kitchenStations: stations,
    floor,
    products: products.map((product) => ({
      id: product.id,
      secuencial: product.secuencial.toString(),
      sku: product.sku,
      codigoBarras: product.codigoBarras,
      tipoProducto: product.tipoProducto,
      nombre: product.nombre,
      descripcion: product.descripcion,
      precio: toNumber(product.precio),
      tarifaIva: toNumber(product.tarifaIva),
      activo: product.activo,
      restaurantVisible: product.restaurantVisible,
      restaurantCategory: product.restaurantCategory,
      restaurantMenuGroup: product.restaurantMenuGroup,
      restaurantMenuSortOrder: product.restaurantMenuSortOrder,
      restaurantStationCode: product.restaurantStationCode,
      allowsModifiers: product.allowsModifiers,
      prepTimeMinutes: product.prepTimeMinutes,
      stock: toNumber(product.stockLevel?.quantity),
      minStock: toNumber(product.stockLevel?.minQuantity),
    })),
  };
}

export async function listRestaurantFloorLayout(session: SessionPayload) {
  const context = await getRestaurantContext(session);
  await ensureDefaultDiningArea(context.business.id);
  const [areas, tables] = await Promise.all([
    prisma.diningArea.findMany({
      where: { businessId: context.business.id },
      orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.restaurantTable.findMany({
      where: { businessId: context.business.id },
      include: {
        diningArea: true,
      },
      orderBy: [
        { active: "desc" },
        { diningArea: { sortOrder: "asc" } },
        { code: "asc" },
      ],
    }),
  ]);

  return {
    areas: areas.map((area) => ({
      id: area.id,
      code: area.code,
      name: area.name,
      sortOrder: area.sortOrder,
      active: area.active,
      tableCount: tables.filter((table) => table.diningAreaId === area.id).length,
    })),
    tables: tables.map((table) => ({
      id: table.id,
      code: table.code,
      name: table.name,
      capacity: table.capacity,
      active: table.active,
      diningAreaId: table.diningAreaId,
      diningAreaName: table.diningArea?.name ?? null,
    })),
  };
}

function kitchenStationPresenter(
  station: Prisma.KitchenStationGetPayload<{ select: {
    id: true;
    code: true;
    name: true;
    sortOrder: true;
    active: true;
  } }>,
) {
  return {
    id: station.id,
    code: station.code,
    name: station.name,
    sortOrder: station.sortOrder,
    active: station.active,
  };
}

export async function listKitchenStationsAdmin(session: SessionPayload) {
  const context = await getRestaurantContext(session);
  const stations = await prisma.kitchenStation.findMany({
    where: { businessId: context.business.id },
    select: {
      id: true,
      code: true,
      name: true,
      sortOrder: true,
      active: true,
    },
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { code: "asc" }],
  });

  return stations.map(kitchenStationPresenter);
}

function normalizeStationCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
}

export async function createKitchenStationAdmin(
  session: SessionPayload,
  rawInput: unknown,
) {
  const context = await getRestaurantContext(session);
  const input = createKitchenStationSchema.parse(rawInput);
  const code = normalizeStationCode(input.code);

  const station = await prisma.kitchenStation.create({
    data: {
      businessId: context.business.id,
      code,
      name: input.name.trim(),
      sortOrder: input.sortOrder,
      active: true,
    },
    select: {
      id: true,
      code: true,
      name: true,
      sortOrder: true,
      active: true,
    },
  });

  return kitchenStationPresenter(station);
}

export async function updateKitchenStationAdmin(
  session: SessionPayload,
  stationId: string,
  rawInput: unknown,
) {
  const context = await getRestaurantContext(session);
  const input = updateKitchenStationSchema.parse(rawInput);

  const station = await prisma.kitchenStation.findFirst({
    where: {
      id: stationId,
      businessId: context.business.id,
    },
    select: { id: true },
  });

  if (!station) {
    throw new Error("Estación no encontrada");
  }

  const updated = await prisma.kitchenStation.update({
    where: { id: station.id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    },
    select: {
      id: true,
      code: true,
      name: true,
      sortOrder: true,
      active: true,
    },
  });

  return kitchenStationPresenter(updated);
}

export async function listRestaurantMenuProductsAdmin(session: SessionPayload) {
  const context = await getRestaurantContext(session);
  const products = await prisma.product.findMany({
    where: {
      restaurantVisible: true,
    },
    select: {
      id: true,
      secuencial: true,
      sku: true,
      nombre: true,
      tipoProducto: true,
      activo: true,
      precio: true,
      restaurantVisible: true,
      restaurantCategory: true,
      restaurantMenuGroup: true,
      restaurantMenuSortOrder: true,
      restaurantStationCode: true,
      allowsModifiers: true,
      prepTimeMinutes: true,
      recipeConsumptionEnabled: true,
      recipeMenuItems: {
        where: {
          businessId: context.business.id,
        },
        select: {
          id: true,
          ingredients: {
            select: { id: true },
          },
        },
        take: 1,
      },
    },
    orderBy: [
      { activo: "desc" },
      { restaurantMenuGroup: "asc" },
      { restaurantMenuSortOrder: "asc" },
      { nombre: "asc" },
    ],
  });

  return products.map(presentRestaurantMenuProduct);
}

export async function createRestaurantMenuProductAdmin(
  session: SessionPayload,
  rawInput: unknown,
) {
  const context = await getRestaurantContext(session);
  const input = createRestaurantMenuProductSchema.parse(rawInput);

  const normalizedStationCode = input.restaurantStationCode
    ? normalizeStationCode(input.restaurantStationCode)
    : null;

  if (normalizedStationCode) {
    const station = await prisma.kitchenStation.findFirst({
      where: {
        businessId: context.business.id,
        code: normalizedStationCode,
        active: true,
      },
      select: { id: true },
    });

    if (!station) {
      throw new Error("La estación asignada no existe o está inactiva");
    }
  }

  const product = await prisma.product.create({
    data: {
      nombre: input.nombre.trim(),
      tipoProducto: input.tipoProducto,
      precio: new Prisma.Decimal(input.precio),
      tarifaIva: new Prisma.Decimal(input.tarifaIva),
      activo: input.activo,
      restaurantVisible: input.restaurantVisible,
      restaurantCategory: input.restaurantCategory || null,
      restaurantMenuGroup: input.restaurantMenuGroup || null,
      restaurantMenuSortOrder: input.restaurantMenuSortOrder ?? null,
      restaurantStationCode: normalizedStationCode,
      prepTimeMinutes: input.prepTimeMinutes ?? null,
      recipeConsumptionEnabled: input.recipeConsumptionEnabled,
      stockLevel: {
        create: {
          quantity: 0,
          minQuantity: 0,
        },
      },
    },
    select: {
      id: true,
      secuencial: true,
      sku: true,
      nombre: true,
      tipoProducto: true,
      activo: true,
      precio: true,
      restaurantVisible: true,
      restaurantCategory: true,
      restaurantMenuGroup: true,
      restaurantMenuSortOrder: true,
      restaurantStationCode: true,
      allowsModifiers: true,
      prepTimeMinutes: true,
      recipeConsumptionEnabled: true,
      recipeMenuItems: {
        where: {
          businessId: context.business.id,
        },
        select: {
          id: true,
          ingredients: {
            select: { id: true },
          },
        },
        take: 1,
      },
    },
  });

  return presentRestaurantMenuProduct(product);
}

export async function updateRestaurantMenuProductAdmin(
  session: SessionPayload,
  productId: string,
  rawInput: unknown,
) {
  const context = await getRestaurantContext(session);
  const input = updateRestaurantMenuProductSchema.parse(rawInput);

  const existing = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Producto no encontrado");
  }

  if (input.restaurantStationCode) {
    const station = await prisma.kitchenStation.findFirst({
      where: {
        businessId: context.business.id,
        code: normalizeStationCode(input.restaurantStationCode),
        active: true,
      },
      select: { id: true },
    });

    if (!station) {
      throw new Error("La estación asignada no existe o está inactiva");
    }
  }

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      ...(input.nombre !== undefined ? { nombre: input.nombre.trim() } : {}),
      ...(input.tipoProducto !== undefined
        ? { tipoProducto: input.tipoProducto }
        : {}),
      ...(input.precio !== undefined
        ? { precio: new Prisma.Decimal(input.precio) }
        : {}),
      ...(input.tarifaIva !== undefined
        ? { tarifaIva: new Prisma.Decimal(input.tarifaIva) }
        : {}),
      ...(input.activo !== undefined ? { activo: input.activo } : {}),
      ...(input.restaurantVisible !== undefined
        ? { restaurantVisible: input.restaurantVisible }
        : {}),
      ...(input.restaurantCategory !== undefined
        ? { restaurantCategory: input.restaurantCategory || null }
        : {}),
      ...(input.restaurantMenuGroup !== undefined
        ? { restaurantMenuGroup: input.restaurantMenuGroup || null }
        : {}),
      ...(input.restaurantMenuSortOrder !== undefined
        ? { restaurantMenuSortOrder: input.restaurantMenuSortOrder ?? null }
        : {}),
      ...(input.restaurantStationCode !== undefined
        ? {
            restaurantStationCode: input.restaurantStationCode
              ? normalizeStationCode(input.restaurantStationCode)
              : null,
          }
        : {}),
      ...(input.allowsModifiers !== undefined
        ? { allowsModifiers: input.allowsModifiers }
        : {}),
      ...(input.prepTimeMinutes !== undefined
        ? { prepTimeMinutes: input.prepTimeMinutes ?? null }
        : {}),
      ...(input.recipeConsumptionEnabled !== undefined
        ? { recipeConsumptionEnabled: input.recipeConsumptionEnabled }
        : {}),
    },
    select: {
      id: true,
      secuencial: true,
      sku: true,
      nombre: true,
      tipoProducto: true,
      activo: true,
      precio: true,
      restaurantVisible: true,
      restaurantCategory: true,
      restaurantMenuGroup: true,
      restaurantMenuSortOrder: true,
      restaurantStationCode: true,
      allowsModifiers: true,
      prepTimeMinutes: true,
      recipeConsumptionEnabled: true,
      recipeMenuItems: {
        where: {
          businessId: context.business.id,
        },
        select: {
          id: true,
          ingredients: {
            select: { id: true },
          },
        },
        take: 1,
      },
    },
  });

  return presentRestaurantMenuProduct(updated);
}

export async function createDiningArea(session: SessionPayload, rawInput: unknown) {
  const context = await getRestaurantContext(session);
  const input = createDiningAreaSchema.parse(rawInput);

  const area = await prisma.$transaction(async (tx) => {
    const code = await buildNextOperationalCode({
      tx,
      model: "diningArea",
      businessId: context.business.id,
      prefix: input.prefix || input.name,
      padLength: 2,
    });

    return tx.diningArea.create({
      data: {
        businessId: context.business.id,
        code: normalizeOperationalCode(code),
        name: input.name.trim(),
        sortOrder: input.sortOrder,
        active: input.active,
      },
    });
  });

  return {
    id: area.id,
    code: area.code,
    name: area.name,
    sortOrder: area.sortOrder,
    active: area.active,
    tableCount: 0,
  };
}

export async function updateDiningArea(
  session: SessionPayload,
  areaId: string,
  rawInput: unknown,
) {
  const context = await getRestaurantContext(session);
  const input = updateDiningAreaSchema.parse(rawInput);

  const area = await prisma.diningArea.findFirst({
    where: { id: areaId, businessId: context.business.id },
  });

  if (!area) {
    throw new Error("Área del salón no encontrada");
  }

  const isDefaultDiningArea = area.code === DEFAULT_DINING_AREA_CODE;

  const updated = await prisma.diningArea.update({
    where: { id: area.id },
    data: {
      ...(input.name !== undefined && !isDefaultDiningArea
        ? { name: input.name.trim() }
        : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.active !== undefined && !isDefaultDiningArea
        ? { active: input.active }
        : {}),
    },
  });

  const tableCount = await prisma.restaurantTable.count({
    where: { diningAreaId: updated.id },
  });

  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    sortOrder: updated.sortOrder,
    active: updated.active,
    tableCount,
  };
}

export async function createRestaurantTable(
  session: SessionPayload,
  rawInput: unknown,
) {
  const context = await getRestaurantContext(session);
  const input = createRestaurantTableSchema.parse(rawInput);
  const area = await prisma.diningArea.findFirst({
    where: {
      id: input.diningAreaId,
      businessId: context.business.id,
    },
    select: { id: true },
  });

  if (!area) {
    throw new Error("Área del salón no encontrada");
  }

  const table = await prisma.$transaction(async (tx) => {
    const code = await buildNextSimpleRestaurantTableCode(
      tx,
      context.business.id,
    );

    return tx.restaurantTable.create({
      data: {
        businessId: context.business.id,
        diningAreaId: input.diningAreaId,
        code,
        name: code,
        capacity: input.capacity,
        active: input.active,
      },
      include: {
        diningArea: true,
      },
    });
  });

  return {
    id: table.id,
    code: table.code,
    name: table.name,
    capacity: table.capacity,
    active: table.active,
    diningAreaId: table.diningAreaId,
    diningAreaName: table.diningArea?.name ?? null,
  };
}

export async function updateRestaurantTable(
  session: SessionPayload,
  tableId: string,
  rawInput: unknown,
) {
  const context = await getRestaurantContext(session);
  const input = updateRestaurantTableSchema.parse(rawInput);

  const table = await prisma.restaurantTable.findFirst({
    where: { id: tableId, businessId: context.business.id },
  });

  if (!table) {
    throw new Error("Mesa no encontrada");
  }

  if (input.diningAreaId) {
    const area = await prisma.diningArea.findFirst({
      where: {
        id: input.diningAreaId,
        businessId: context.business.id,
      },
      select: { id: true },
    });

    if (!area) {
      throw new Error("Área del salón no encontrada");
    }
  }

  const updated = await prisma.restaurantTable.update({
    where: { id: table.id },
    data: {
      ...(input.diningAreaId !== undefined
        ? { diningAreaId: input.diningAreaId }
        : {}),
      ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    },
    include: {
      diningArea: true,
    },
  });

  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    capacity: updated.capacity,
    active: updated.active,
    diningAreaId: updated.diningAreaId,
    diningAreaName: updated.diningArea?.name ?? null,
  };
}

export async function listRestaurantFloor(session: SessionPayload) {
  const context = await getRestaurantContext(session);
  await ensureDefaultDiningArea(context.business.id);
  const tables = await prisma.restaurantTable.findMany({
    where: {
      businessId: context.business.id,
      active: true,
    },
    include: {
      diningArea: true,
      sessions: {
        where: {
          status: TableSessionStatus.OPEN,
        },
        include: {
          orders: {
            where: {
              status: {
                notIn: [RestaurantOrderStatus.PAID, RestaurantOrderStatus.CANCELLED],
              },
            },
            include: {
              items: true,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
        orderBy: {
          openedAt: "desc",
        },
        take: 1,
      },
    },
    orderBy: [{ diningArea: { sortOrder: "asc" } }, { code: "asc" }],
  });

  return tables.map((table) => {
    const activeSession = table.sessions[0] ?? null;
    const activeOrder = activeSession?.orders[0] ?? null;
    const readyForSettlementStatuses: RestaurantOrderStatus[] = [
      RestaurantOrderStatus.SERVED,
      RestaurantOrderStatus.PARTIALLY_SERVED,
      RestaurantOrderStatus.PARTIALLY_PAID,
    ];
    const operationalStatus:
      | "AVAILABLE"
      | "SESSION_OPEN"
      | "ORDER_OPEN"
      | "READY_FOR_SETTLEMENT" = !activeSession
      ? "AVAILABLE"
      : !activeOrder
        ? "SESSION_OPEN"
        : readyForSettlementStatuses.includes(activeOrder.status)
          ? "READY_FOR_SETTLEMENT"
          : "ORDER_OPEN";
    const openTotal = activeOrder
      ? roundMoney(
          activeOrder.items.reduce((acc, item) => {
            const availableQuantity = Math.max(
              0,
              toNumber(item.quantity) -
                toNumber(item.cancelledQuantity) -
                toNumber(item.billedQuantity),
            );
            const totals = computeLineAmounts({
              selectedQuantity: availableQuantity,
              originalQuantity: toNumber(item.quantity),
              unitPrice: toNumber(item.precioUnitario),
              discount: toNumber(item.descuento),
              ivaRate: toNumber(item.tarifaIva),
            });
            return acc + totals.total;
          }, 0),
        )
      : 0;

    return {
      id: table.id,
      code: table.code,
      name: table.name,
      capacity: table.capacity,
      areaName: table.diningArea?.name ?? null,
      guestCount: activeSession?.guestCount ?? null,
      hasActiveSession: Boolean(activeSession),
      activeSessionId: activeSession?.id ?? null,
      activeOrderId: activeOrder?.id ?? null,
      orderStatus: activeOrder?.status ?? null,
      operationalStatus,
      openTotal,
    };
  });
}

export async function createRestaurantOrder(
  session: SessionPayload,
  rawInput: unknown,
) {
  const context = await getRestaurantContext(session);
  const input = createRestaurantOrderSchema.parse(rawInput);

  const order = await prisma.$transaction(async (tx) => {
    let tableSessionId: string | null = null;

    if (input.channel === RestaurantOrderChannel.DINE_IN) {
      if (!input.tableId) {
        throw new Error("Debes seleccionar una mesa para servicio en salon");
      }

      const existingSession = await getOpenTableSessionByTableId(
        tx,
        context.business.id,
        input.tableId,
      );

      if (existingSession) {
        tableSessionId = existingSession.id;
      } else {
        const sessionRecord = await tx.tableSession.create({
          data: {
            businessId: context.business.id,
            tableId: input.tableId,
            openedById: session.sub,
            guestCount: input.guestCount,
            status: TableSessionStatus.OPEN,
          },
        });
        tableSessionId = sessionRecord.id;
      }
    }

    const orderRecord = await tx.restaurantOrder.create({
      data: {
        businessId: context.business.id,
        tableSessionId,
        customerId: input.customer.customerId ?? null,
        channel: input.channel,
        guestCount: input.guestCount,
        customerName: input.customer.customerName || null,
        customerPhone: input.customer.customerPhone || null,
        deliveryAddress: input.deliveryAddress || null,
        deliveryReference: input.deliveryReference || null,
        assignedDriverName: input.assignedDriverName || null,
        notes: input.notes || null,
        createdById: session.sub,
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            quantity: new Prisma.Decimal(item.cantidad),
            precioUnitario: new Prisma.Decimal(item.precioUnitario ?? 0),
            descuento: new Prisma.Decimal(item.descuento),
            tarifaIva: new Prisma.Decimal(item.tarifaIva ?? 15),
            notes: item.notes || null,
            modifiers: {
              create: item.modifiers.map((modifier) => ({
                name: modifier.name,
                priceDelta: new Prisma.Decimal(modifier.priceDelta),
              })),
            },
          })),
        },
      },
      include: restaurantOrderInclude,
    });

    for (const item of orderRecord.items) {
      if (toNumber(item.precioUnitario) > 0) {
        continue;
      }

      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: {
          precio: true,
          tarifaIva: true,
        },
      });

      if (!product) {
        throw new Error("Producto no encontrado para la orden");
      }

      await tx.restaurantOrderItem.update({
        where: { id: item.id },
        data: {
          precioUnitario: product.precio,
          tarifaIva: product.tarifaIva,
        },
      });
    }

    const normalizedOrder = await getOrderOrThrow(
      tx,
      context.business.id,
      orderRecord.id,
    );
    await syncRestaurantOrderStateInTransaction(tx, normalizedOrder.id);
    return getOrderOrThrow(tx, context.business.id, normalizedOrder.id);
  });

  logger.info("restaurant-order:created", {
    orderId: order.id,
    channel: order.channel,
    itemCount: order.items.length,
  });

  return summarizeOrder(order);
}

export async function openRestaurantTableSession(
  session: SessionPayload,
  tableId: string,
  rawInput: unknown,
) {
  const context = await getRestaurantContext(session);
  const input = openRestaurantTableSchema.parse(rawInput);

  const tableSession = await prisma.$transaction(async (tx) => {
    const table = await tx.restaurantTable.findFirst({
      where: {
        id: tableId,
        businessId: context.business.id,
        active: true,
      },
    });

    if (!table) {
      throw new Error("Mesa no encontrada");
    }

    const existingSession = await getOpenTableSessionByTableId(
      tx,
      context.business.id,
      tableId,
    );

    if (existingSession) {
      return existingSession;
    }

    return tx.tableSession.create({
      data: {
        businessId: context.business.id,
        tableId,
        openedById: session.sub,
        guestCount: input.guestCount,
        notes: input.notes || null,
        status: TableSessionStatus.OPEN,
      },
    });
  });

  return {
    id: tableSession.id,
    tableId: tableSession.tableId,
    guestCount: tableSession.guestCount,
    notes: tableSession.notes,
    status: tableSession.status,
    openedAt: tableSession.openedAt,
  };
}

export async function getRestaurantOrderDetail(
  session: SessionPayload,
  orderId: string,
) {
  const context = await getRestaurantContext(session);
  const order = await prisma.restaurantOrder.findFirst({
    where: {
      id: orderId,
      businessId: context.business.id,
    },
    include: restaurantOrderInclude,
  });

  if (!order) {
    throw new Error("Orden de restaurante no encontrada");
  }

  return summarizeOrder(order);
}

export async function updateRestaurantOrder(
  session: SessionPayload,
  orderId: string,
  rawInput: unknown,
) {
  const context = await getRestaurantContext(session);
  const input = updateRestaurantOrderSchema.parse(rawInput);

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const order = await getOrderOrThrow(tx, context.business.id, orderId);

    if (
      order.status === RestaurantOrderStatus.PAID ||
      order.status === RestaurantOrderStatus.CANCELLED
    ) {
      throw new Error("No se puede modificar una orden cerrada");
    }

    await tx.restaurantOrder.update({
      where: { id: orderId },
      data: {
        ...(input.guestCount !== undefined ? { guestCount: input.guestCount } : {}),
        ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
        ...(input.customer?.customerId !== undefined
          ? { customerId: input.customer.customerId ?? null }
          : {}),
        ...(input.customer?.customerName !== undefined
          ? { customerName: input.customer.customerName || null }
          : {}),
        ...(input.customer?.customerPhone !== undefined
          ? { customerPhone: input.customer.customerPhone || null }
          : {}),
        ...(input.deliveryAddress !== undefined
          ? { deliveryAddress: input.deliveryAddress || null }
          : {}),
        ...(input.deliveryReference !== undefined
          ? { deliveryReference: input.deliveryReference || null }
          : {}),
        ...(input.assignedDriverName !== undefined
          ? { assignedDriverName: input.assignedDriverName || null }
          : {}),
      },
    });

    if (input.addItems?.length) {
      const products = await tx.product.findMany({
        where: {
          id: { in: input.addItems.map((item) => item.productId) },
          activo: true,
        },
      });
      const productMap = new Map(products.map((product) => [product.id, product]));

      for (const item of input.addItems) {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new Error("Uno o mas productos no existen o estan inactivos");
        }

        await tx.restaurantOrderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: new Prisma.Decimal(item.cantidad),
            precioUnitario: new Prisma.Decimal(
              item.precioUnitario ?? toNumber(product.precio),
            ),
            descuento: new Prisma.Decimal(item.descuento),
            tarifaIva: new Prisma.Decimal(item.tarifaIva ?? toNumber(product.tarifaIva)),
            notes: item.notes || null,
            modifiers: {
              create: item.modifiers.map((modifier) => ({
                name: modifier.name,
                priceDelta: new Prisma.Decimal(modifier.priceDelta),
              })),
            },
          },
        });
      }
    }

    if (input.cancelItems?.length) {
      const freshOrder = await getOrderOrThrow(tx, context.business.id, orderId);
      for (const cancellation of input.cancelItems) {
        await cancelOrderItemQuantityInTransaction({
          tx,
          order: freshOrder,
          orderItemId: cancellation.orderItemId,
          quantity: cancellation.quantity,
          createdById: session.sub,
        });
      }
    }

    await syncRestaurantOrderStateInTransaction(tx, order.id);
    return getOrderOrThrow(tx, context.business.id, order.id);
  });

  return summarizeOrder(updatedOrder);
}

export async function fireRestaurantOrder(
  session: SessionPayload,
  orderId: string,
  rawInput: unknown,
) {
  const context = await getRestaurantContext(session);
  const input = fireRestaurantOrderSchema.parse(rawInput);

  const result = await prisma.$transaction(async (tx) => {
    const order = await getOrderOrThrow(tx, context.business.id, orderId);
    const selectedItems = order.items.filter((item) => {
      const matchesSelection =
        !input.itemIds?.length || input.itemIds.includes(item.id);
      return matchesSelection && item.status === RestaurantOrderItemStatus.PENDING;
    });

    if (selectedItems.length === 0) {
      throw new Error("No hay items pendientes para enviar a preparacion");
    }

    const stationGroups = new Map<
      string,
      RestaurantOrderRecord["items"]
    >();

    if (context.posRuntime.inventory.recipeConsumption) {
      const itemsRequiringRecipe = selectedItems.filter(
        (item) => item.product.recipeConsumptionEnabled,
      );

      if (itemsRequiringRecipe.length > 0) {
        const recipes = await tx.recipe.findMany({
          where: {
            businessId: context.business.id,
            productId: {
              in: itemsRequiringRecipe.map((item) => item.productId),
            },
          },
          select: {
            productId: true,
          },
        });
        const recipeProductIds = new Set(recipes.map((recipe) => recipe.productId));
        const missingProducts = itemsRequiringRecipe.filter(
          (item) => !recipeProductIds.has(item.productId),
        );

        if (missingProducts.length > 0) {
          throw new Error(
            `Debes configurar la receta de: ${missingProducts
              .map((item) => item.product.nombre)
              .join(", ")}`,
          );
        }
      }
    }

    for (const item of selectedItems) {
      const stationCode = item.product.restaurantStationCode || "GENERAL";
      const currentGroup = stationGroups.get(stationCode) ?? [];
      currentGroup.push(item);
      stationGroups.set(stationCode, currentGroup);

      if (
        context.posRuntime.inventory.recipeConsumption &&
        item.product.recipeConsumptionEnabled
      ) {
        await consumeRecipeForOrderItemInTransaction({
          tx,
          businessId: context.business.id,
          orderId,
          orderItem: item,
          quantity: getActiveQuantity(item),
          createdById: session.sub,
          allowPrepBatches: context.posRuntime.inventory.prepProduction,
        });
      }

      await tx.restaurantOrderItem.update({
        where: { id: item.id },
        data: {
          status: RestaurantOrderItemStatus.SENT,
          sentAt: new Date(),
        },
      });
    }

    const createdTickets = [];

    for (const [stationCode, items] of stationGroups.entries()) {
      const station = await ensureKitchenStation(
        tx,
        context.business.id,
        stationCode,
      );

      const ticket = await tx.kitchenTicket.create({
        data: {
          businessId: context.business.id,
          orderId,
          stationId: station.id,
          stationCode,
          status: KitchenTicketStatus.NEW,
          printedAt: context.posRuntime.kitchen.printTickets ? new Date() : null,
          notes: input.notes || null,
          items: {
            create: items.map((item) => ({
              orderItemId: item.id,
              quantity: new Prisma.Decimal(getActiveQuantity(item)),
              status: KitchenTicketItemStatus.NEW,
            })),
          },
        },
        include: {
          station: true,
          items: true,
        },
      });
      createdTickets.push(ticket);
    }

    const syncedOrder = await syncRestaurantOrderStateInTransaction(tx, orderId);

    return {
      order: syncedOrder ? summarizeOrder(syncedOrder) : null,
      tickets: createdTickets.map((ticket) => ({
        id: ticket.id,
        stationCode: ticket.stationCode,
        stationName: ticket.station?.name ?? ticket.stationCode,
        status: ticket.status,
        printedAt: ticket.printedAt,
      })),
      missingRecipeProductIds: [],
    };
  });

  return result;
}

export async function settleRestaurantOrder(
  session: SessionPayload,
  orderId: string,
  rawInput: unknown,
) {
  const context = await getRestaurantContext(session);
  const input = settleRestaurantOrderSchema.parse(rawInput);

  if (context.cashRuntime.enabled && context.cashRuntime.capabilities.sessionRequired && !context.activeCashSession) {
    throw new Error("Debes abrir una caja antes de liquidar una orden");
  }

  const result = await prisma.$transaction(
    async (tx) => {
      const order = await getOrderOrThrow(tx, context.business.id, orderId);
      const selections = await loadSettlementSelections(order, input.items);
      const issuerId = input.issuerId ?? context.business.taxProfile?.issuerId;

      if (!issuerId) {
        throw new Error("No existe un emisor documental configurado para liquidar");
      }

      const documentType =
        context.billingRuntime.capabilities.electronicBilling
          ? input.documentType
          : "NONE";

      const checkoutInput = buildCheckoutInputFromSettlement({
        order,
        input,
        selections,
        issuerId,
        createdById: session.sub,
        cashSessionId: context.activeCashSession?.id ?? null,
        documentType,
      });

      const saleContext = await createSaleInTransaction(tx, checkoutInput, {
        inventoryTrackingEnabled: false,
      });

      await tx.sale.update({
        where: { id: saleContext.sale.id },
        data: {
          restaurantOrderId: order.id,
        },
      });

      await postSaleEntryInTransaction(tx, {
        businessId: context.business.id,
        saleId: saleContext.sale.id,
        subtotal: saleContext.totals.subtotal,
        taxTotal: saleContext.totals.taxTotal,
        total: saleContext.totals.total,
      });

      const checkoutOptions: CheckoutOptions = {
        businessId: context.business.id,
        cashSessionId: context.activeCashSession?.id ?? null,
        saleSource: "POS",
        collectionRegisteredById: session.sub,
        createImmediateCollections: true,
        createReceivableForPendingBalance: true,
      };

      await createImmediateCollectionsInTransaction(
        tx,
        checkoutInput,
        saleContext,
        checkoutOptions,
      );
      const receivable = await createReceivableForPendingBalanceInTransaction(
        tx,
        checkoutInput,
        saleContext,
        checkoutOptions,
      );
      const documentResult = await createDocumentForSaleInTransaction(
        tx,
        saleContext,
      );

      for (const selection of selections) {
        await tx.restaurantOrderItem.update({
          where: { id: selection.item.id },
          data: {
            billedQuantity: { increment: selection.quantity },
          },
        });
        await tx.restaurantOrderItemSettlement.create({
          data: {
            restaurantOrderItemId: selection.item.id,
            saleId: saleContext.sale.id,
            quantity: new Prisma.Decimal(selection.quantity),
            subtotal: new Prisma.Decimal(selection.subtotal),
            taxTotal: new Prisma.Decimal(selection.taxTotal),
            total: new Prisma.Decimal(selection.total),
          },
        });
      }

      const syncedOrder = await syncRestaurantOrderStateInTransaction(tx, order.id);

      return {
        saleId: saleContext.sale.id,
        saleNumber: saleContext.sale.saleNumber.toString(),
        saleStatus: saleContext.sale.status,
        totals: saleContext.totals,
        document: documentResult.document,
        invoice: documentResult.invoice,
        receivable,
        backgroundDocumentTask: documentResult.backgroundAuthorization,
        order: syncedOrder ? summarizeOrder(syncedOrder) : null,
      };
    },
    {
      maxWait: 15000,
      timeout: 60000,
      isolationLevel: "Serializable",
    },
  );

  return result;
}

export async function transferRestaurantOrderTable(
  session: SessionPayload,
  orderId: string,
  rawInput: unknown,
) {
  const context = await getRestaurantContext(session);
  const input = transferRestaurantTableSchema.parse(rawInput);

  const order = await prisma.$transaction(async (tx) => {
    const currentOrder = await getOrderOrThrow(tx, context.business.id, orderId);

    if (currentOrder.channel !== RestaurantOrderChannel.DINE_IN || !currentOrder.tableSessionId) {
      throw new Error("Solo se pueden transferir ordenes de salon con mesa activa");
    }

    const targetSession = await getOpenTableSessionByTableId(
      tx,
      context.business.id,
      input.targetTableId,
    );
    if (targetSession) {
      throw new Error("La mesa destino ya tiene una sesion abierta");
    }

    await tx.tableSession.update({
      where: { id: currentOrder.tableSessionId },
      data: {
        tableId: input.targetTableId,
      },
    });

    return getOrderOrThrow(tx, context.business.id, orderId);
  });

  return summarizeOrder(order);
}

export async function mergeRestaurantOrders(
  session: SessionPayload,
  orderId: string,
  rawInput: unknown,
) {
  const context = await getRestaurantContext(session);
  const input = mergeRestaurantOrderSchema.parse(rawInput);

  if (orderId === input.targetOrderId) {
    throw new Error("No se puede unir una orden consigo misma");
  }

  const order = await prisma.$transaction(async (tx) => {
    const source = await getOrderOrThrow(tx, context.business.id, orderId);
    const target = await getOrderOrThrow(tx, context.business.id, input.targetOrderId);

    if (
      [source, target].some(
        (candidate) =>
          candidate.status === RestaurantOrderStatus.PAID ||
          candidate.status === RestaurantOrderStatus.CANCELLED,
      )
    ) {
      throw new Error("No se pueden unir ordenes ya cerradas");
    }

    if (
      source.items.some((item) => toNumber(item.billedQuantity) > 0) ||
      target.items.some((item) => toNumber(item.billedQuantity) > 0)
    ) {
      throw new Error("No se pueden unir ordenes que ya tengan items liquidados");
    }

    await tx.restaurantOrderItem.updateMany({
      where: { orderId: source.id },
      data: { orderId: target.id },
    });
    await tx.kitchenTicket.updateMany({
      where: { orderId: source.id },
      data: { orderId: target.id },
    });
    await tx.restaurantOrder.update({
      where: { id: source.id },
      data: {
        status: RestaurantOrderStatus.CANCELLED,
        notes: source.notes
          ? `${source.notes}\n[MERGED_INTO:${target.id}]`
          : `[MERGED_INTO:${target.id}]`,
      },
    });

    if (source.tableSessionId) {
      await tx.tableSession.update({
        where: { id: source.tableSessionId },
        data: {
          status: TableSessionStatus.MERGED,
          closedAt: new Date(),
          closedById: session.sub,
        },
      });
    }

    await syncRestaurantOrderStateInTransaction(tx, target.id);
    return getOrderOrThrow(tx, context.business.id, target.id);
  });

  return summarizeOrder(order);
}

export async function listKitchenDisplay(session: SessionPayload) {
  const context = await getRestaurantContext(session);

  const tickets = await prisma.kitchenTicket.findMany({
    where: {
      businessId: context.business.id,
      status: {
        in: [
          KitchenTicketStatus.NEW,
          KitchenTicketStatus.IN_PREPARATION,
          KitchenTicketStatus.READY,
        ],
      },
    },
    include: {
      station: true,
      order: {
        include: {
          tableSession: {
            include: {
              table: true,
            },
          },
        },
      },
      items: {
        include: {
          orderItem: {
            include: {
              product: true,
              modifiers: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return tickets.map((ticket) => ({
    id: ticket.id,
    stationCode: ticket.stationCode,
    stationName: ticket.station?.name ?? ticket.stationCode,
    status: ticket.status,
    createdAt: ticket.createdAt,
    order: {
      id: ticket.order.id,
      channel: ticket.order.channel,
      tableName: ticket.order.tableSession?.table.name ?? null,
      customerName: ticket.order.customerName,
    },
    items: ticket.items.map((item) => ({
      id: item.id,
      orderItemId: item.orderItemId,
      status: item.status,
      quantity: toNumber(item.quantity),
      productName: item.orderItem.product.nombre,
      notes: item.orderItem.notes,
      modifiers: item.orderItem.modifiers.map((modifier) => modifier.name),
    })),
  }));
}

export async function updateKitchenTicketStatus(
  session: SessionPayload,
  ticketId: string,
  rawInput: unknown,
) {
  const context = await getRestaurantContext(session);
  const input = updateKitchenTicketStatusSchema.parse(rawInput);

  const ticket = await prisma.$transaction(async (tx) => {
    const ticketRecord = await tx.kitchenTicket.findFirst({
      where: {
        id: ticketId,
        businessId: context.business.id,
      },
      include: {
        order: {
          include: restaurantOrderInclude,
        },
        items: true,
      },
    });

    if (!ticketRecord) {
      throw new Error("Ticket de cocina no encontrado");
    }

    const targetItems = ticketRecord.items.filter((item) =>
      input.itemIds?.length ? input.itemIds.includes(item.id) : true,
    );

    if (targetItems.length === 0) {
      throw new Error("No hay items para actualizar en el ticket");
    }

    for (const item of targetItems) {
      if (input.status === "CANCELLED") {
        await cancelOrderItemQuantityInTransaction({
          tx,
          order: ticketRecord.order,
          orderItemId: item.orderItemId,
          createdById: session.sub,
        });
        await tx.kitchenTicketItem.update({
          where: { id: item.id },
          data: {
            status: KitchenTicketItemStatus.CANCELLED,
          },
        });
        continue;
      }

      await tx.kitchenTicketItem.update({
        where: { id: item.id },
        data: {
          status: input.status,
          ...(input.status === "IN_PREPARATION"
            ? { startedAt: new Date() }
            : {}),
          ...(input.status === "READY" ? { readyAt: new Date() } : {}),
          ...(input.status === "SERVED" ? { servedAt: new Date() } : {}),
        },
      });
      await tx.restaurantOrderItem.update({
        where: { id: item.orderItemId },
        data: {
          ...(input.status === "IN_PREPARATION"
            ? {
                status: RestaurantOrderItemStatus.IN_PREPARATION,
                preparedAt: new Date(),
              }
            : {}),
          ...(input.status === "READY"
            ? {
                status: RestaurantOrderItemStatus.READY,
                readyAt: new Date(),
              }
            : {}),
          ...(input.status === "SERVED"
            ? {
                status: RestaurantOrderItemStatus.SERVED,
                servedAt: new Date(),
              }
            : {}),
        },
      });
    }

    const freshTicket = await tx.kitchenTicket.findUnique({
      where: { id: ticketId },
      include: {
        items: true,
      },
    });

    if (!freshTicket) {
      throw new Error("Ticket de cocina no encontrado");
    }

    const ticketStatus = freshTicket.items.every(
      (item) => item.status === KitchenTicketItemStatus.SERVED,
    )
      ? KitchenTicketStatus.SERVED
      : freshTicket.items.every(
            (item) => item.status === KitchenTicketItemStatus.READY,
          )
        ? KitchenTicketStatus.READY
        : freshTicket.items.some(
              (item) => item.status === KitchenTicketItemStatus.IN_PREPARATION,
            )
          ? KitchenTicketStatus.IN_PREPARATION
          : freshTicket.items.every(
                (item) => item.status === KitchenTicketItemStatus.CANCELLED,
              )
            ? KitchenTicketStatus.CANCELLED
            : KitchenTicketStatus.NEW;

    await tx.kitchenTicket.update({
      where: { id: ticketId },
      data: {
        status: ticketStatus,
        ...(ticketStatus === KitchenTicketStatus.IN_PREPARATION
          ? { startedAt: new Date() }
          : {}),
        ...(ticketStatus === KitchenTicketStatus.READY
          ? { readyAt: new Date() }
          : {}),
        ...(ticketStatus === KitchenTicketStatus.SERVED
          ? { servedAt: new Date() }
          : {}),
      },
    });

    await syncRestaurantOrderStateInTransaction(tx, ticketRecord.order.id);

    return tx.kitchenTicket.findUnique({
      where: { id: ticketId },
      include: {
        station: true,
        items: true,
      },
    });
  });

  return ticket;
}

export async function createRecipe(session: SessionPayload, rawInput: unknown) {
  const context = await getRestaurantContext(session);
  const input = createRecipeSchema.parse(rawInput);

  return prisma.recipe.upsert({
    where: {
      businessId_productId: {
        businessId: context.business.id,
        productId: input.productId,
      },
    },
    update: {
      notes: input.notes || null,
      ingredients: {
        deleteMany: {},
        create: input.ingredients.map((ingredient) => ({
          productId: ingredient.productId,
          quantity: new Prisma.Decimal(ingredient.quantity),
          usePrepBatches: ingredient.usePrepBatches,
          notes: ingredient.notes || null,
        })),
      },
    },
    create: {
      businessId: context.business.id,
      productId: input.productId,
      notes: input.notes || null,
      ingredients: {
        create: input.ingredients.map((ingredient) => ({
          productId: ingredient.productId,
          quantity: new Prisma.Decimal(ingredient.quantity),
          usePrepBatches: ingredient.usePrepBatches,
          notes: ingredient.notes || null,
        })),
      },
    },
    include: {
      ingredients: true,
    },
  });
}

export async function getRecipeByProductId(
  session: SessionPayload,
  productId: string,
) {
  const context = await getRestaurantContext(session);

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      nombre: true,
      recipeConsumptionEnabled: true,
    },
  });

  if (!product) {
    throw new Error("Producto no encontrado");
  }

  const recipe = await prisma.recipe.findUnique({
    where: {
      businessId_productId: {
        businessId: context.business.id,
        productId,
      },
    },
    include: {
      ingredients: {
        include: {
          product: {
            select: {
              id: true,
              secuencial: true,
              sku: true,
              nombre: true,
              tipoProducto: true,
              activo: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  return {
    productId: product.id,
    productName: product.nombre,
    recipeConsumptionEnabled: product.recipeConsumptionEnabled,
    notes: recipe?.notes ?? null,
    ingredients: (recipe?.ingredients ?? []).map((ingredient) => ({
      id: ingredient.id,
      productId: ingredient.productId,
      productCode:
        normalizeProductSku(ingredient.product.sku) ||
        ingredient.product.secuencial.toString(),
      productName: ingredient.product.nombre,
      productType: ingredient.product.tipoProducto,
      active: ingredient.product.activo,
      quantity: toNumber(ingredient.quantity),
      usePrepBatches: ingredient.usePrepBatches,
      notes: ingredient.notes,
    })),
  };
}

export async function createPrepBatch(
  session: SessionPayload,
  rawInput: unknown,
) {
  const context = await getRestaurantContext(session);
  const input = createPrepBatchSchema.parse(rawInput);

  return prisma.prepBatch.create({
    data: {
      businessId: context.business.id,
      productId: input.productId,
      label: input.label,
      producedQuantity: new Prisma.Decimal(input.producedQuantity),
      availableQuantity: new Prisma.Decimal(input.producedQuantity),
      notes: input.notes || null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    },
  });
}

export async function reverseRestaurantSaleSettlementBySaleId(
  tx: Prisma.TransactionClient,
  saleId: string,
) {
  const settlementItems = await tx.restaurantOrderItemSettlement.findMany({
    where: { saleId },
    include: {
      restaurantOrderItem: true,
      sale: true,
    },
  });

  if (settlementItems.length === 0) {
    return null;
  }

  const orderId = settlementItems[0]?.sale.restaurantOrderId;
  if (!orderId) {
    return null;
  }

  for (const settlementItem of settlementItems) {
    await tx.restaurantOrderItem.update({
      where: { id: settlementItem.restaurantOrderItemId },
      data: {
        billedQuantity: { decrement: settlementItem.quantity },
      },
    });
  }

  await tx.restaurantOrderItemSettlement.deleteMany({
    where: { saleId },
  });

  return syncRestaurantOrderStateInTransaction(tx, orderId);
}

export type RestaurantSettlementResponse = Awaited<
  ReturnType<typeof settleRestaurantOrder>
> & {
  backgroundDocumentTask: PendingSaleDocumentAuthorization | null;
};
