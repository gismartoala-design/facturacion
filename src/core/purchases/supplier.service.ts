import { Prisma } from "@prisma/client";

import {
  createSupplierSchema,
  updateSupplierSchema,
} from "@/core/purchases/supplier.schemas";
import { prisma } from "@/lib/prisma";

const supplierSelect = {
  id: true,
  businessId: true,
  tipoIdentificacion: true,
  identificacion: true,
  razonSocial: true,
  nombreComercial: true,
  contactoPrincipal: true,
  email: true,
  telefono: true,
  direccion: true,
  diasCredito: true,
  activo: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SupplierSelect;

type SupplierPayload = Prisma.SupplierGetPayload<{ select: typeof supplierSelect }>;

function normalizeIdentification(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

function nullableText(value: string | undefined) {
  return value?.trim() || null;
}

function supplierPresenter(supplier: SupplierPayload) {
  return {
    id: supplier.id,
    businessId: supplier.businessId,
    tipoIdentificacion: supplier.tipoIdentificacion,
    identificacion: supplier.identificacion,
    razonSocial: supplier.razonSocial,
    nombreComercial: supplier.nombreComercial,
    contactoPrincipal: supplier.contactoPrincipal,
    email: supplier.email,
    telefono: supplier.telefono,
    direccion: supplier.direccion,
    diasCredito: supplier.diasCredito,
    activo: supplier.activo,
    createdAt: supplier.createdAt,
    updatedAt: supplier.updatedAt,
  };
}

async function ensureSupplierIdentificationAvailable({
  businessId,
  tipoIdentificacion,
  identificacion,
  excludeSupplierId,
}: {
  businessId: string;
  tipoIdentificacion: string;
  identificacion: string;
  excludeSupplierId?: string;
}) {
  const existing = await prisma.supplier.findFirst({
    where: {
      businessId,
      tipoIdentificacion,
      identificacion,
      ...(excludeSupplierId ? { NOT: { id: excludeSupplierId } } : {}),
    },
    select: { id: true, activo: true },
  });

  if (existing) {
    const suffix = existing.activo ? "" : " inactivo";
    throw new Error(
      `Ya existe un proveedor${suffix} con esa identificacion en este negocio`,
    );
  }
}

export async function listSuppliers(businessId: string, search = "") {
  const normalizedSearch = search.trim();

  const suppliers = await prisma.supplier.findMany({
    select: supplierSelect,
    where: {
      businessId,
      activo: true,
      ...(normalizedSearch
        ? {
            OR: [
              {
                identificacion: {
                  contains: normalizeIdentification(normalizedSearch),
                  mode: "insensitive",
                },
              },
              { razonSocial: { contains: normalizedSearch, mode: "insensitive" } },
              {
                nombreComercial: {
                  contains: normalizedSearch,
                  mode: "insensitive",
                },
              },
              {
                contactoPrincipal: {
                  contains: normalizedSearch,
                  mode: "insensitive",
                },
              },
              { email: { contains: normalizedSearch, mode: "insensitive" } },
              { telefono: { contains: normalizedSearch, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ razonSocial: "asc" }, { identificacion: "asc" }],
    take: 200,
  });

  return suppliers.map(supplierPresenter);
}

export async function createSupplier(businessId: string, rawInput: unknown) {
  const input = createSupplierSchema.parse(rawInput);
  const identificacion = normalizeIdentification(input.identificacion);

  await ensureSupplierIdentificationAvailable({
    businessId,
    tipoIdentificacion: input.tipoIdentificacion,
    identificacion,
  });

  const supplier = await prisma.supplier.create({
    data: {
      businessId,
      tipoIdentificacion: input.tipoIdentificacion,
      identificacion,
      razonSocial: input.razonSocial,
      nombreComercial: nullableText(input.nombreComercial),
      contactoPrincipal: nullableText(input.contactoPrincipal),
      email: nullableText(input.email),
      telefono: nullableText(input.telefono),
      direccion: nullableText(input.direccion),
      diasCredito: input.diasCredito,
    },
    select: supplierSelect,
  });

  return supplierPresenter(supplier);
}

export async function updateSupplier(
  businessId: string,
  id: string,
  rawInput: unknown,
) {
  const input = updateSupplierSchema.parse(rawInput);

  const existing = await prisma.supplier.findFirst({
    where: { id, businessId, activo: true },
    select: {
      tipoIdentificacion: true,
      identificacion: true,
    },
  });

  if (!existing) {
    throw new Error("Proveedor no encontrado");
  }

  const nextTipoIdentificacion =
    input.tipoIdentificacion ?? existing.tipoIdentificacion;
  const nextIdentificacion =
    input.identificacion !== undefined
      ? normalizeIdentification(input.identificacion)
      : existing.identificacion;

  if (
    nextTipoIdentificacion !== existing.tipoIdentificacion ||
    nextIdentificacion !== existing.identificacion
  ) {
    await ensureSupplierIdentificationAvailable({
      businessId,
      tipoIdentificacion: nextTipoIdentificacion,
      identificacion: nextIdentificacion,
      excludeSupplierId: id,
    });
  }

  const supplier = await prisma.supplier.update({
    where: { id },
    data: {
      ...(input.tipoIdentificacion !== undefined
        ? { tipoIdentificacion: input.tipoIdentificacion }
        : {}),
      ...(input.identificacion !== undefined
        ? { identificacion: nextIdentificacion }
        : {}),
      ...(input.razonSocial !== undefined
        ? { razonSocial: input.razonSocial }
        : {}),
      ...(input.nombreComercial !== undefined
        ? { nombreComercial: nullableText(input.nombreComercial) }
        : {}),
      ...(input.contactoPrincipal !== undefined
        ? { contactoPrincipal: nullableText(input.contactoPrincipal) }
        : {}),
      ...(input.email !== undefined ? { email: nullableText(input.email) } : {}),
      ...(input.telefono !== undefined
        ? { telefono: nullableText(input.telefono) }
        : {}),
      ...(input.direccion !== undefined
        ? { direccion: nullableText(input.direccion) }
        : {}),
      ...(input.diasCredito !== undefined
        ? { diasCredito: input.diasCredito }
        : {}),
    },
    select: supplierSelect,
  });

  return supplierPresenter(supplier);
}

export async function deactivateSupplier(businessId: string, id: string) {
  const existing = await prisma.supplier.findFirst({
    where: { id, businessId, activo: true },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Proveedor no encontrado");
  }

  const supplier = await prisma.supplier.update({
    where: { id },
    data: { activo: false },
    select: supplierSelect,
  });

  return supplierPresenter(supplier);
}
