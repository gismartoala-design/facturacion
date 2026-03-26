import { z } from "zod";

import { posPolicyEditorSchema } from "@/modules/pos/policies/pos-policy-editor";
import { cashPolicyEditorSchema } from "@/modules/cash-management/policies/cash-policy-editor";

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
  issuerCode: optionalTrimmedString.refine(
    (value) => value === "" || /^[A-Z0-9_-]{2,20}$/i.test(value),
    "El codigo del emisor debe tener entre 2 y 20 caracteres",
  ),
  issuerName: optionalTrimmedString,
  invoiceEstablishmentCode: optionalTrimmedString.refine(
    (value) => value === "" || /^[0-9]{3}$/.test(value),
    "El establecimiento debe tener 3 digitos",
  ),
  invoiceEmissionPointCode: optionalTrimmedString.refine(
    (value) => value === "" || /^[0-9]{3}$/.test(value),
    "El punto de emision debe tener 3 digitos",
  ),
  invoiceNextSequence: z.number().int().min(1).default(1),
  trackInventoryOnSale: z.boolean().default(true),
  useButcheryScaleBarcodeWeight: z.boolean().default(false),
  posPolicy: posPolicyEditorSchema.optional(),
  cashPolicy: cashPolicyEditorSchema.optional(),
});

export type UpdateBusinessSettingsInput = z.infer<
  typeof updateBusinessSettingsSchema
>;
