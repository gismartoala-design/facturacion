import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() ?? "";

    const customers = await prisma.customer.findMany({
      where: search
        ? {
            OR: [
              { identificacion: { contains: search, mode: "insensitive" } },
              { razonSocial: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { telefono: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
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
      take: 100,
    });

    return ok(
      customers.map((customer) => ({
        id: customer.id,
        tipoIdentificacion: customer.tipoIdentificacion,
        identificacion: customer.identificacion,
        razonSocial: customer.razonSocial,
        direccion: customer.direccion,
        email: customer.email,
        telefono: customer.telefono,
        purchaseCount: customer._count.sales,
        lastPurchaseAt: customer.sales[0]?.createdAt ?? null,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      })),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo listar clientes";
    return fail(message, 500);
  }
}
