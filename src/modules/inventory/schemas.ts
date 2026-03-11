import { z } from "zod";

export const createProductSchema = z.object({
  sku: z.string().trim().max(40).optional().or(z.literal("")),
  nombre: z.string().trim().min(2).max(180),
  descripcion: z.string().trim().max(500).optional().or(z.literal("")),
  precio: z.number().positive(),
  tarifaIva: z.number().min(0).max(100).default(15),
  stockInicial: z.number().min(0).default(0),
  minStock: z.number().min(0).default(0),
});

export const updateProductSchema = z.object({
  sku: z.string().trim().max(40).optional().or(z.literal("")),
  nombre: z.string().trim().min(2).max(180).optional(),
  descripcion: z.string().trim().max(500).optional().or(z.literal("")),
  precio: z.number().positive().optional(),
  tarifaIva: z.number().min(0).max(100).optional(),
  minStock: z.number().min(0).optional(),
});

export const stockAdjustmentSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive(),
  movementType: z.enum(["IN", "OUT", "ADJUSTMENT"]),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});
