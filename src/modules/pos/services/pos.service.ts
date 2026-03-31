import {
  Prisma,
  SaleStatus,
} from "@prisma/client";

import { ensureDefaultBusiness, getBusinessContextById } from "@/core/business/business.service";
import {
  closeCashSession as closeCashSessionInCashMgmt,
  getActiveCashSession,
  listClosedCashSessionsByUser,
  openCashSession as openCashSessionInCashMgmt,
  type CashSessionSummary,
} from "@/core/cash-management/cash-session.service";
import { listProducts } from "@/core/inventory/inventory.service";
import { hasModule } from "@/core/platform/guards";
import type { SessionPayload } from "@/lib/auth";
import { createLogger, startTimer, timerDurationMs } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { resolveBillingRuntime } from "@/modules/billing/policies/resolve-billing-runtime";
import { resolvePosRuntime } from "@/modules/pos/policies/resolve-pos-runtime";
import { resolveCashRuntime } from "@/modules/cash-management/policies/resolve-cash-runtime";
import { roundMoney } from "@/lib/utils";
import {
  closeCashSessionSchema,
  heldSalePayloadSchema,
  holdSaleSchema,
  openCashSessionSchema,
  type HoldSalePayload,
} from "@/modules/pos/services/pos.schemas";

const logger = createLogger("POSService");

type PosCashSessionSummary = {
  id: string;
  status: "OPEN" | "CLOSED" | "PENDING_APPROVAL";
  openingAmount: number;
  closingAmount: number | null;
  notes: string | null;
  openedAt: Date;
  closedAt: Date | null;
  salesCount: number;
  salesTotal: number;
  declaredClosing: number | null;
  expectedClosing: number | null;
  difference: number | null;
  salesCashTotal: number;
  movementsTotal: number;
};

function getDefaultDocumentType(electronicBillingEnabled: boolean) {
  void electronicBillingEnabled;
  return "NONE";
}

async function getPosBusinessContext(session: SessionPayload) {
  const business = session.businessId
    ? await getBusinessContextById(session.businessId)
    : await ensureDefaultBusiness();

  if (!hasModule(business.blueprint, "POS")) {
    throw new Error("Modulo POS no habilitado para este negocio");
  }

  return business;
}

async function getSessionSalesStats(sessionId: string) {
  const salesWhere: Prisma.SaleWhereInput = {
    cashSessionId: sessionId,
    status: SaleStatus.COMPLETED,
  };
  const [salesCount, salesAggregate] = await Promise.all([
    prisma.sale.count({ where: salesWhere }),
    prisma.sale.aggregate({
      where: salesWhere,
      _sum: {
        total: true,
      },
    }),
  ]);

  return {
    salesCount,
    salesTotal: Number(salesAggregate._sum.total ?? 0),
  };
}

async function toPosCashSessionSummary(rawSession: CashSessionSummary) {
  const { salesCount, salesTotal } = await getSessionSalesStats(rawSession.id);

  return {
    id: rawSession.id,
    status: rawSession.status,
    openingAmount: rawSession.openingAmount,
    closingAmount: rawSession.declaredClosing,
    notes: rawSession.notes,
    openedAt: rawSession.openedAt,
    closedAt: rawSession.closedAt,
    salesCount,
    salesTotal,
    declaredClosing: rawSession.declaredClosing,
    expectedClosing: rawSession.expectedClosing,
    difference: rawSession.difference,
    salesCashTotal: rawSession.salesCashTotal,
    movementsTotal: rawSession.movementsTotal,
  } satisfies PosCashSessionSummary;
}

async function getOpenCashSession(session: SessionPayload, businessId: string) {
  const cashSession = await getActiveCashSession(businessId, session.sub);

  if (!cashSession) {
    return null;
  }

  return toPosCashSessionSummary(cashSession);
}

function toHeldSaleSummary(rawHeldSale: {
  id: string;
  label: string;
  payload: Prisma.JsonValue;
  updatedAt: Date;
}) {
  const parsed = heldSalePayloadSchema.safeParse(rawHeldSale.payload);
  const payload = parsed.success ? parsed.data : null;
  const total = payload
    ? roundMoney(payload.items.reduce((acc, item) => acc + item.cantidad * item.precioUnitario - item.descuento, 0))
    : 0;

  return {
    id: rawHeldSale.id,
    label: rawHeldSale.label,
    updatedAt: rawHeldSale.updatedAt,
    itemCount: payload?.items.length ?? 0,
    total,
    payload,
  };
}

async function listPosCustomers() {
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      tipoIdentificacion: true,
      identificacion: true,
      razonSocial: true,
      direccion: true,
      email: true,
      telefono: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          sales: true,
        },
      },
      sales: {
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 40,
  });

  return customers.map((customer) => ({
    id: customer.id,
    tipoIdentificacion: customer.tipoIdentificacion,
    identificacion: customer.identificacion,
    razonSocial: customer.razonSocial,
    direccion: customer.direccion,
    email: customer.email,
    telefono: customer.telefono,
    purchaseCount: customer._count.sales,
    lastPurchaseAt: customer.sales[0]?.createdAt ?? null,
  }));
}

export async function getPosBootstrap(session: SessionPayload) {
  const startedAt = startTimer();
  const business = await getPosBusinessContext(session);
  const billingRuntime = resolveBillingRuntime({
    blueprint: business.blueprint,
    taxProfile: business.taxProfile,
  });
  const posRuntime = resolvePosRuntime({
    blueprint: business.blueprint,
  });
  const cashRuntime = resolveCashRuntime(business.blueprint);
  const defaultIssuerId = business.taxProfile?.issuerId;

  if (!defaultIssuerId) {
    throw new Error("No existe un emisor documental configurado para este negocio");
  }

  const [products, customers, heldSales, cashSession] = await Promise.all([
    listProducts(),
    listPosCustomers(),
    prisma.posHeldSale.findMany({
      where: {
        businessId: business.id,
        createdById: session.sub,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 12,
    }),
    getOpenCashSession(session, business.id),
  ]);

  const data = {
    business: {
      id: business.id,
      name: business.name,
      legalName: business.legalName,
      ruc: business.ruc,
      address: business.address,
      phone: business.phone,
      email: business.email,
    },
    operator: {
      id: session.sub,
      name: session.name,
      role: session.role,
    },
    billingRuntime,
    posRuntime,
    cashRuntime,
    features: business.enabledFeatures,
    defaultDocumentType: getDefaultDocumentType(
      billingRuntime.capabilities.electronicBilling,
    ),
    defaultIssuerId,
    cashSession,
    heldSales: heldSales.map(toHeldSaleSummary),
    customers,
    products,
  };

  logger.info("bootstrap:loaded", {
    businessId: business.id,
    operatorId: session.sub,
    productCount: products.length,
    customerCount: customers.length,
    heldSalesCount: heldSales.length,
    hasCashSession: Boolean(cashSession),
    durationMs: timerDurationMs(startedAt),
  });

  return data;
}

export async function openCashSession(session: SessionPayload, rawInput: unknown) {
  const business = await getPosBusinessContext(session);
  const input = openCashSessionSchema.parse(rawInput);
  const existing = await getOpenCashSession(session, business.id);

  if (existing) {
    throw new Error("Ya existe una caja abierta para este usuario");
  }

  const cashSession = await openCashSessionInCashMgmt(session, business.id, {
    openingAmount: input.openingAmount,
    notes: input.notes || "",
  });

  return toPosCashSessionSummary(cashSession);
}

export async function closeCashSession(session: SessionPayload, rawInput: unknown) {
  const business = await getPosBusinessContext(session);
  const input = closeCashSessionSchema.parse(rawInput);
  const existing = await getActiveCashSession(business.id, session.sub);

  if (!existing) {
    throw new Error("No existe una caja abierta para cerrar");
  }

  const updated = await closeCashSessionInCashMgmt(session, business.id, {
    sessionId: existing.id,
    declaredAmount: input.closingAmount,
    notes: input.notes || existing.notes || "",
  });

  return toPosCashSessionSummary(updated);
}

export async function listClosedCashSessions(session: SessionPayload) {
  const business = await getPosBusinessContext(session);
  const sessions = await listClosedCashSessionsByUser(business.id, session.sub, 30);
  return Promise.all(sessions.map((cashSession) => toPosCashSessionSummary(cashSession)));
}

export async function listHeldSales(session: SessionPayload) {
  const business = await getPosBusinessContext(session);

  const heldSales = await prisma.posHeldSale.findMany({
    where: {
      businessId: business.id,
      createdById: session.sub,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 20,
  });

  return heldSales.map(toHeldSaleSummary);
}

export async function holdSale(session: SessionPayload, rawInput: unknown) {
  const business = await getPosBusinessContext(session);
  const input = holdSaleSchema.parse(rawInput);
  const payload = input.payload satisfies HoldSalePayload;

  if (input.heldSaleId) {
    const existing = await prisma.posHeldSale.findFirst({
      where: {
        id: input.heldSaleId,
        businessId: business.id,
        createdById: session.sub,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new Error("La venta en espera no existe o no pertenece al usuario actual");
    }

    const updated = await prisma.posHeldSale.update({
      where: {
        id: existing.id,
      },
      data: {
        label: input.label,
        payload: payload as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        label: true,
        payload: true,
        updatedAt: true,
      },
    });

    return toHeldSaleSummary(updated);
  }

  const created = await prisma.posHeldSale.create({
    data: {
      businessId: business.id,
      createdById: session.sub,
      label: input.label,
      payload: payload as Prisma.InputJsonValue,
    },
    select: {
      id: true,
      label: true,
      payload: true,
      updatedAt: true,
    },
  });

  return toHeldSaleSummary(created);
}

export async function deleteHeldSale(session: SessionPayload, heldSaleId: string) {
  const business = await getPosBusinessContext(session);

  const heldSale = await prisma.posHeldSale.findFirst({
    where: {
      id: heldSaleId,
      businessId: business.id,
      createdById: session.sub,
    },
    select: {
      id: true,
    },
  });

  if (!heldSale) {
    throw new Error("La venta en espera no existe o no pertenece al usuario actual");
  }

  await prisma.posHeldSale.delete({
    where: {
      id: heldSale.id,
    },
  });

  return { id: heldSale.id };
}
