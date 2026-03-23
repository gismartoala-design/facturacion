import { MovementType, Prisma, ReferenceType, SaleDocumentStatus, SaleStatus } from "@prisma/client";

import {
  parsePosFeatureBlueprint,
  parsePosFeatureConfig,
} from "@/core/business/feature-config";
import { mergeBusinessBlueprint } from "@/core/platform/blueprint-config";
import { mapLegacyPosBlueprint } from "@/core/platform/legacy-mappers";
import { prisma } from "@/lib/prisma";
import { resolvePosRuntime } from "@/modules/pos/policies/resolve-pos-runtime";

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

    const productQuantities = new Map<string, number>();
    for (const item of invoice.sale.items) {
      if (item.product.tipoProducto !== "BIEN") {
        continue;
      }

      const current = productQuantities.get(item.productId) ?? 0;
      productQuantities.set(item.productId, current + Number(item.cantidad));
    }

    if (trackInventoryOnSale) {
      for (const [productId, quantity] of productQuantities.entries()) {
        const updated = await tx.stockLevel.updateMany({
          where: { productId },
          data: { quantity: { increment: quantity } },
        });

        if (updated.count === 0) {
          throw new Error("No existe registro de stock para uno o mas productos de la venta");
        }
      }

      if (productQuantities.size > 0) {
        await tx.stockMovement.createMany({
          data: Array.from(productQuantities.entries()).map(([productId, quantity]) => ({
            productId,
            movementType: MovementType.IN,
            referenceType: ReferenceType.SALE,
            referenceId: invoice.saleId,
            quantity: new Prisma.Decimal(quantity),
            notes: `Ingreso por anulacion de venta #${invoice.sale.saleNumber.toString()}`,
          })),
        });
      }
    }

    await tx.sale.update({
      where: { id: invoice.saleId },
      data: { status: SaleStatus.CANCELLED },
    });

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
