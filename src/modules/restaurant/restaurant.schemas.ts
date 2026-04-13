import { z } from "zod";

import { checkoutDocumentTypeSchema } from "@/core/sales/schemas";

const modifierSchema = z.object({
  name: z.string().trim().min(1).max(120),
  priceDelta: z.number().min(0).default(0),
});

const orderItemSchema = z.object({
  productId: z.string().uuid(),
  cantidad: z.number().positive(),
  precioUnitario: z.number().positive().optional(),
  descuento: z.number().min(0).default(0),
  tarifaIva: z.number().min(0).max(100).optional(),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
  modifiers: z.array(modifierSchema).default([]),
});

const orderCustomerSchema = z.object({
  customerId: z.string().uuid().optional(),
  customerName: z.string().trim().max(200).optional().or(z.literal("")),
  customerPhone: z.string().trim().max(30).optional().or(z.literal("")),
});

export const createRestaurantOrderSchema = z.object({
  channel: z.enum(["DINE_IN", "TAKEOUT", "DELIVERY"]),
  tableId: z.string().uuid().optional().nullable(),
  guestCount: z.number().int().min(1).max(100).default(1),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  customer: orderCustomerSchema.optional().default({}),
  deliveryAddress: z.string().trim().max(250).optional().or(z.literal("")),
  deliveryReference: z.string().trim().max(250).optional().or(z.literal("")),
  assignedDriverName: z.string().trim().max(120).optional().or(z.literal("")),
  items: z.array(orderItemSchema).min(1),
});

export const updateRestaurantOrderSchema = z.object({
  guestCount: z.number().int().min(1).max(100).optional(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  customer: orderCustomerSchema.optional(),
  deliveryAddress: z.string().trim().max(250).optional().or(z.literal("")),
  deliveryReference: z.string().trim().max(250).optional().or(z.literal("")),
  assignedDriverName: z.string().trim().max(120).optional().or(z.literal("")),
  addItems: z.array(orderItemSchema).optional(),
  cancelItems: z
    .array(
      z.object({
        orderItemId: z.string().uuid(),
        quantity: z.number().positive().optional(),
      }),
    )
    .optional(),
});

export const fireRestaurantOrderSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1).optional(),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

const settlementPaymentSchema = z.object({
  formaPago: z.string().trim().min(2).max(4),
  total: z.number().positive(),
  plazo: z.number().int().min(0).default(0),
  unidadTiempo: z.string().trim().min(2).max(20).default("DIAS"),
});

const settlementItemSchema = z.object({
  orderItemId: z.string().uuid(),
  quantity: z.number().positive().optional(),
});

export const settleRestaurantOrderSchema = z.object({
  issuerId: z.string().uuid().optional(),
  documentType: checkoutDocumentTypeSchema.default("NONE"),
  customer: z
    .object({
      tipoIdentificacion: z.string().trim().min(2).max(2),
      identificacion: z.string().trim().min(5).max(20),
      razonSocial: z.string().trim().min(2).max(200),
      direccion: z.string().trim().max(250).optional().or(z.literal("")),
      email: z.string().email().optional().or(z.literal("")),
      telefono: z.string().trim().max(20).optional().or(z.literal("")),
    })
    .optional(),
  items: z.array(settlementItemSchema).optional(),
  payments: z.array(settlementPaymentSchema).min(1),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export const transferRestaurantTableSchema = z.object({
  targetTableId: z.string().uuid(),
});

export const mergeRestaurantOrderSchema = z.object({
  targetOrderId: z.string().uuid(),
});

export const openRestaurantTableSchema = z.object({
  guestCount: z.number().int().min(1).max(100).default(1),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export const updateKitchenTicketStatusSchema = z.object({
  status: z.enum(["IN_PREPARATION", "READY", "SERVED", "CANCELLED"]),
  itemIds: z.array(z.string().uuid()).min(1).optional(),
});

export const createKitchenStationSchema = z.object({
  code: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2).max(120),
  sortOrder: z.number().int().min(0).max(999).default(0),
});

export const updateKitchenStationSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  active: z.boolean().optional(),
});

export const createRestaurantMenuProductSchema = z.object({
  nombre: z.string().trim().min(2).max(180),
  tipoProducto: z.enum(["BIEN", "SERVICIO"]).default("SERVICIO"),
  precio: z.number().positive(),
  tarifaIva: z.number().min(0).max(100).default(15),
  restaurantVisible: z.boolean().default(true),
  restaurantCategory: z.string().trim().max(120).optional().or(z.literal("")),
  restaurantStationCode: z.string().trim().max(40).optional().or(z.literal("")),
  prepTimeMinutes: z.number().int().min(0).max(1440).optional().nullable(),
  recipeConsumptionEnabled: z.boolean().default(false),
  activo: z.boolean().default(true),
});

export const updateRestaurantMenuProductSchema = z.object({
  nombre: z.string().trim().min(2).max(180).optional(),
  tipoProducto: z.enum(["BIEN", "SERVICIO"]).optional(),
  precio: z.number().positive().optional(),
  tarifaIva: z.number().min(0).max(100).optional(),
  activo: z.boolean().optional(),
  restaurantVisible: z.boolean().optional(),
  restaurantCategory: z.string().trim().max(120).optional().or(z.literal("")),
  restaurantStationCode: z.string().trim().max(40).optional().or(z.literal("")),
  allowsModifiers: z.boolean().optional(),
  prepTimeMinutes: z.number().int().min(0).max(1440).optional().nullable(),
  recipeConsumptionEnabled: z.boolean().optional(),
});

export const createRecipeSchema = z.object({
  productId: z.string().uuid(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  ingredients: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().positive(),
        usePrepBatches: z.boolean().default(false),
        notes: z.string().trim().max(300).optional().or(z.literal("")),
      }),
    )
    .min(1),
});

export const createPrepBatchSchema = z.object({
  productId: z.string().uuid(),
  label: z.string().trim().min(2).max(120),
  producedQuantity: z.number().positive(),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
  expiresAt: z.string().datetime().optional(),
});

export const createDiningAreaSchema = z.object({
  prefix: z.string().trim().min(1).max(3).optional().or(z.literal("")),
  name: z.string().trim().min(2).max(120),
  sortOrder: z.number().int().min(0).max(999).default(0),
  active: z.boolean().default(true),
});

export const updateDiningAreaSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  active: z.boolean().optional(),
});

export const createRestaurantTableSchema = z.object({
  diningAreaId: z.string().uuid(),
  capacity: z.number().int().min(1).max(50).default(4),
  active: z.boolean().default(true),
});

export const updateRestaurantTableSchema = z.object({
  diningAreaId: z.string().uuid().optional(),
  capacity: z.number().int().min(1).max(50).optional(),
  active: z.boolean().optional(),
});

export type CreateRestaurantOrderInput = z.infer<
  typeof createRestaurantOrderSchema
>;
export type UpdateRestaurantOrderInput = z.infer<
  typeof updateRestaurantOrderSchema
>;
export type FireRestaurantOrderInput = z.infer<
  typeof fireRestaurantOrderSchema
>;
export type SettleRestaurantOrderInput = z.infer<
  typeof settleRestaurantOrderSchema
>;
export type CreateRestaurantMenuProductInput = z.infer<
  typeof createRestaurantMenuProductSchema
>;
export type CreateKitchenStationInput = z.infer<
  typeof createKitchenStationSchema
>;
export type UpdateKitchenStationInput = z.infer<
  typeof updateKitchenStationSchema
>;
export type CreateDiningAreaInput = z.infer<typeof createDiningAreaSchema>;
export type UpdateDiningAreaInput = z.infer<typeof updateDiningAreaSchema>;
export type CreateRestaurantTableInput = z.infer<
  typeof createRestaurantTableSchema
>;
export type UpdateRestaurantTableInput = z.infer<
  typeof updateRestaurantTableSchema
>;
export type UpdateRestaurantMenuProductInput = z.infer<
  typeof updateRestaurantMenuProductSchema
>;
