import { z } from "zod";

export const stockTakingItemInputSchema = z.object({
  productId: z.string().uuid(),
  countedQuantity: z.number().min(0),
});

export const stockTakingDraftSchema = z.object({
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  items: z.array(stockTakingItemInputSchema).min(1),
});

export type StockTakingDraftInput = z.infer<typeof stockTakingDraftSchema>;
