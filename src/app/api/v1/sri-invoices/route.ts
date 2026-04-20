import { Prisma, SaleStatus, SriInvoiceStatus } from "@prisma/client";

import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const searchParam = searchParams.get("search")?.trim() ?? "";
    const saleStatusParam = searchParams.get("saleStatus");
    const retryableParam = searchParams.get("retryable");
    const dateFromParam = searchParams.get("dateFrom");
    const dateToParam = searchParams.get("dateTo");
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const limit = Math.max(1, Number(searchParams.get("limit") || "10"));
    const skip = (page - 1) * limit;

    const andFilters: Prisma.SriInvoiceWhereInput[] = [];

    const statusFilter: Prisma.SriInvoiceWhereInput =
      statusParam === "NOT_AUTHORIZED"
        ? {
            status: { notIn: [SriInvoiceStatus.AUTHORIZED] },
            sale: { status: { not: SaleStatus.CANCELLED } },
          }
        : statusParam
          ? { status: statusParam as SriInvoiceStatus }
          : {};

    if (Object.keys(statusFilter).length > 0) {
      andFilters.push(statusFilter);
    }

    if (saleStatusParam === SaleStatus.COMPLETED || saleStatusParam === SaleStatus.CANCELLED) {
      andFilters.push({
        sale: {
          status: saleStatusParam,
        },
      });
    }

    if (retryableParam === "RETRYABLE") {
      andFilters.push({
        status: { in: [SriInvoiceStatus.PENDING_SRI, SriInvoiceStatus.ERROR] },
        sale: { status: { not: SaleStatus.CANCELLED } },
      });
    }

    if (retryableParam === "NON_RETRYABLE") {
      andFilters.push({
        OR: [
          { status: { notIn: [SriInvoiceStatus.PENDING_SRI, SriInvoiceStatus.ERROR] } },
          { sale: { status: SaleStatus.CANCELLED } },
        ],
      });
    }

    if (dateFromParam) {
      andFilters.push({
        createdAt: {
          gte: new Date(`${dateFromParam}T00:00:00`),
        },
      });
    }

    if (dateToParam) {
      andFilters.push({
        createdAt: {
          lte: new Date(`${dateToParam}T23:59:59.999`),
        },
      });
    }

    if (searchParam) {
      const numericSaleNumber = /^\d+$/.test(searchParam) ? BigInt(searchParam) : null;

      andFilters.push({
        OR: [
          { secuencial: { contains: searchParam, mode: "insensitive" } },
          { authorizationNumber: { contains: searchParam, mode: "insensitive" } },
          { claveAcceso: { contains: searchParam, mode: "insensitive" } },
          { lastError: { contains: searchParam, mode: "insensitive" } },
          {
            sale: {
              customer: {
                razonSocial: { contains: searchParam, mode: "insensitive" },
              },
            },
          },
          {
            sale: {
              customer: {
                identificacion: { contains: searchParam, mode: "insensitive" },
              },
            },
          },
          {
            saleDocument: {
              is: {
                fullNumber: { contains: searchParam, mode: "insensitive" },
              },
            },
          },
          ...(numericSaleNumber
            ? [
                {
                  sale: {
                    saleNumber: numericSaleNumber,
                  },
                } satisfies Prisma.SriInvoiceWhereInput,
              ]
            : []),
        ],
      });
    }

    const where: Prisma.SriInvoiceWhereInput =
      andFilters.length > 0 ? { AND: andFilters } : {};

    const [total, invoices] = await prisma.$transaction([
      prisma.sriInvoice.count({ where }),
      prisma.sriInvoice.findMany({
        where,
        include: {
          sale: {
            include: {
              customer: true,
            },
          },
          saleDocument: true,
          documents: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
    ]);

    const mappedInvoices = invoices.map((invoice) => ({
      id: invoice.id,
      saleId: invoice.saleId,
      saleNumber: invoice.sale.saleNumber.toString(),
      saleStatus: invoice.sale.status,
      customerName: invoice.sale.customer.razonSocial,
      customerIdentification: invoice.sale.customer.identificacion,
      externalInvoiceId: invoice.externalInvoiceId,
      secuencial: invoice.secuencial,
      documentFullNumber: invoice.saleDocument?.fullNumber ?? null,
      status: invoice.status,
      sriReceptionStatus: invoice.sriReceptionStatus,
      sriAuthorizationStatus: invoice.sriAuthorizationStatus,
      authorizationNumber: invoice.authorizationNumber,
      claveAcceso: invoice.claveAcceso,
      retryCount: invoice.retryCount,
      lastError: invoice.lastError,
      total: Number(invoice.sale.total),
      authorizedAt: invoice.authorizedAt,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      hasSignedXml: Boolean(invoice.documents?.xmlSignedPath),
      hasAuthorizedXml: Boolean(invoice.documents?.xmlAuthorizedPath),
      hasRidePdf: Boolean(invoice.documents?.ridePdfPath),
    }));

    return ok({
      data: mappedInvoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo listar facturas SRI";
    return fail(message, 500);
  }
}
