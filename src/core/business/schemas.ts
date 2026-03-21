import { z } from "zod";

export const businessProfileTypeSchema = z.enum([
  "GENERAL",
  "RIMPE_NEGOCIO_POPULAR",
  "RIMPE_EMPRENDEDOR",
  "OTRO",
]);

export const taxEnvironmentSchema = z.enum(["PRUEBAS", "PRODUCCION"]);

const optionalTrimmedString = z
  .string()
  .transform((value) => value.trim())
  .optional()
  .default("");

export const updateBusinessSettingsSchema = z.object({
  name: z.string().trim().min(2, "El nombre comercial es obligatorio"),
  legalName: optionalTrimmedString,
  ruc: optionalTrimmedString.refine(
    (value) => value === "" || /^[0-9]{10,13}$/.test(value),
    "El RUC debe tener entre 10 y 13 digitos",
  ),
  phone: optionalTrimmedString,
  email: optionalTrimmedString.refine(
    (value) => value === "" || z.string().email().safeParse(value).success,
    "El correo no es valido",
  ),
  address: optionalTrimmedString,
  profileType: businessProfileTypeSchema,
  requiresElectronicBilling: z.boolean(),
  allowsSalesNote: z.boolean(),
  accountingRequired: z.boolean(),
  environment: taxEnvironmentSchema,
  taxNotes: optionalTrimmedString,
});

export type UpdateBusinessSettingsInput = z.infer<
  typeof updateBusinessSettingsSchema
>;
