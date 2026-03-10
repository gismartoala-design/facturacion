import { SriInvoiceStatus } from "@prisma/client";

import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const limit = Math.max(1, Number(searchParams.get("limit") || "10"));
    const skip = (page - 1) * limit;

    const where = statusParam
      ? {
          status: statusParam as SriInvoiceStatus,
        }
      : {};

    const [total, invoices] = await prisma.$transaction([
      prisma.sriInvoice.count({ where }),
      prisma.sriInvoice.findMany({
        where,
        include: {
          sale: true,
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
      externalInvoiceId: invoice.externalInvoiceId,
      secuencial: invoice.secuencial,
      status: invoice.status,
      authorizationNumber: invoice.authorizationNumber,
      claveAcceso: invoice.claveAcceso,
      retryCount: invoice.retryCount,
      lastError: invoice.lastError,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      documents: invoice.documents,
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
