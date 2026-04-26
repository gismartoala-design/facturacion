import {
  AccountingEntryStatus,
  AccountingSourceType,
  MovementType,
  ReferenceType,
  SaleDocumentStatus,
  SaleStatus,
} from "@prisma/client";

import {
  parsePosFeatureBlueprint,
  parsePosFeatureConfig,
} from "@/core/business/feature-config";
import {
  buildValuedMovement,
  resolveStockValuationState,
  toStockLevelValuationUpdate,
} from "@/core/inventory/valuation.service";
import { mergeBusinessBlueprint } from "@/core/platform/blueprint-config";
import { mapLegacyPosBlueprint } from "@/core/platform/legacy-mappers";
import { prisma } from "@/lib/prisma";
import { resolvePosRuntime } from "@/modules/pos/policies/resolve-pos-runtime";
import { reverseRestaurantSaleSettlementBySaleId } from "@/modules/restaurant/restaurant.service";

export async function cancelSaleBySriInvoiceId(sriInvoiceId: string) {
  await prisma.$transaction(async (tx) => {
    const invoice = await tx.sriInvoice.findUnique({
      where: { id: sriInvoiceId },
      include: {
        saleDocument: {
          include: {
            documentSeries: {
              include: {
                issuer: {
                  select: {
                    businessId: true,
                  },
                },
              },
            },
          },
        },
        sale: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    tipoProducto: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new Error("Factura SRI no encontrada");
    }

    if (invoice.sale.status === SaleStatus.CANCELLED) {
      throw new Error("La venta ya fue anulada");
    }

    const businessId =
      invoice.saleDocument?.documentSeries?.issuer.businessId ?? null;
    const posFeature = businessId
      ? await tx.businessFeature.findUnique({
          where: {
            businessId_key: {
              businessId,
              key: "POS",
            },
          },
          select: {
            config: true,
          },
        })
      : null;
    const posSettings = parsePosFeatureConfig(posFeature?.config);
    const persistedPosBlueprint = parsePosFeatureBlueprint(posFeature?.config);
    const posBlueprint = persistedPosBlueprint
      ? mergeBusinessBlueprint(
          mapLegacyPosBlueprint({
            posEnabled: true,
            posSettings,
          }),
          persistedPosBlueprint,
        )
      : mapLegacyPosBlueprint({
          posEnabled: true,
          posSettings,
        });
    const trackInventoryOnSale = resolvePosRuntime({
      blueprint: posBlueprint,
    }).operationalRules.trackInventoryOnSale;

    const saleMovements = await tx.stockMovement.findMany({
      where: {
        referenceType: ReferenceType.SALE,
        referenceId: invoice.saleId,
        movementType: MovementType.OUT,
      },
      select: {
        productId: true,
        quantity: true,
        unitCost: true,
      },
    });

    const productQuantities = new Map<
      string,
      { quantity: number; unitCost: number }
    >();
    for (const item of invoice.sale.items) {
      if (item.product.tipoProducto !== "BIEN") {
        continue;
      }

      const storedMovement = saleMovements.find(
        (movement) => movement.productId === item.productId,
      );
      const current = productQuantities.get(item.productId);
      productQuantities.set(item.productId, {
        quantity: (current?.quantity ?? 0) + Number(item.cantidad),
        unitCost:
          current?.unitCost ??
          Number(storedMovement?.unitCost ?? 0),
      });
    }

    if (trackInventoryOnSale) {
      for (const [productId, item] of productQuantities.entries()) {
        const stockLevel = await tx.stockLevel.findUnique({
          where: { productId },
          select: {
            quantity: true,
            averageCost: true,
            lastCost: true,
            inventoryValue: true,
          },
        });

        if (!stockLevel) {
          throw new Error("No existe registro de stock para uno o mas productos de la venta");
        }

        const valuation = buildValuedMovement({
          productId,
          movementType: MovementType.IN,
          quantity: item.quantity,
          unitCost: item.unitCost,
          referenceType: ReferenceType.SALE,
          referenceId: invoice.saleId,
          notes: `Ingreso por anulacion de venta #${invoice.sale.saleNumber.toString()}`,
          state: resolveStockValuationState(stockLevel),
        });

        await tx.stockLevel.update({
          where: { productId },
          data: toStockLevelValuationUpdate(valuation.nextState),
        });

        await tx.stockMovement.create({
          data: valuation.movement,
        });
      }
    }

    await tx.sale.update({
      where: { id: invoice.saleId },
      data: { status: SaleStatus.CANCELLED },
    });

    await reverseRestaurantSaleSettlementBySaleId(tx, invoice.saleId);

    const saleEntry = await tx.accountingEntry.findFirst({
      where: {
        sourceType: AccountingSourceType.SALE,
        sourceId: invoice.saleId,
        status: AccountingEntryStatus.POSTED,
      },
    });

    if (saleEntry) {
      await tx.accountingEntry.update({
        where: { id: saleEntry.id },
        data: { status: AccountingEntryStatus.REVERSED },
      });
    }

    await tx.sriInvoice.update({
      where: { id: sriInvoiceId },
      data: {
        sriAuthorizationStatus: "CANCELLED_MANUAL",
        lastError: "Factura/venta anulada manualmente",
      },
    });

    await tx.saleDocument.updateMany({
      where: { sriInvoiceId },
      data: {
        status: SaleDocumentStatus.VOIDED,
      },
    });
  });

  return { success: true };
}
