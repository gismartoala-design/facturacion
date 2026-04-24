import { z } from "zod";

export const supplierIdentificationTypeSchema = z.enum(["04", "05", "06", "08"]);

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

const optionalEmail = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string().email().max(180).optional().or(z.literal("")),
);

export const createSupplierSchema = z.object({
  tipoIdentificacion: supplierIdentificationTypeSchema.default("04"),
  identificacion: z.string().trim().min(3).max(20),
  razonSocial: z.string().trim().min(2).max(180),
  nombreComercial: optionalText(180),
  contactoPrincipal: optionalText(120),
  email: optionalEmail,
  telefono: optionalText(40),
  direccion: optionalText(240),
  diasCredito: z.number().int().min(0).max(365).default(0),
});

export const updateSupplierSchema = z.object({
  tipoIdentificacion: supplierIdentificationTypeSchema.optional(),
  identificacion: z.string().trim().min(3).max(20).optional(),
  razonSocial: z.string().trim().min(2).max(180).optional(),
  nombreComercial: optionalText(180),
  contactoPrincipal: optionalText(120),
  email: optionalEmail,
  telefono: optionalText(40),
  direccion: optionalText(240),
  diasCredito: z.number().int().min(0).max(365).optional(),
});
