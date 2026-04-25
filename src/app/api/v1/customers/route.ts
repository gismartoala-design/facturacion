import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const customerSelect = {
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
      createdAt: "desc" as const,
    },
    take: 1,
  },
};

function mapCustomer(customer: {
  id: string;
  tipoIdentificacion: string;
  identificacion: string;
  razonSocial: string;
  direccion: string | null;
  email: string | null;
  telefono: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    sales: number;
  };
  sales: Array<{
    createdAt: Date;
  }>;
}) {
  return {
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
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const identification = searchParams.get("identification")?.trim() ?? "";

    if (identification) {
      const exactMatches = await prisma.customer.findMany({
        where: {
          identificacion: identification,
        },
        select: customerSelect,
        orderBy: {
          updatedAt: "desc",
        },
      });

      return ok(exactMatches.map(mapCustomer));
    }

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
      select: customerSelect,
      orderBy: {
        updatedAt: "desc",
      },
      take: 100,
    });

    return ok(customers.map(mapCustomer));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo listar clientes";
    return fail(message, 500);
  }
}
