import { Prisma } from "@prisma/client";
import { z } from "zod";

import { parseBusinessBlueprint, serializeBusinessBlueprint } from "@/core/platform/blueprint-config";
import type { BusinessBlueprint } from "@/core/platform/business-blueprint";

export const DEFAULT_POS_FEATURE_CONFIG = {
  trackInventoryOnSale: true,
  useButcheryScaleBarcodeWeight: false,
} as const;

// Legacy raw POS flags kept only for compatibility and backfill support.
const posFeatureConfigSchema = z.object({
  trackInventoryOnSale: z
    .boolean()
    .default(DEFAULT_POS_FEATURE_CONFIG.trackInventoryOnSale),
  useButcheryScaleBarcodeWeight: z
    .boolean()
    .default(DEFAULT_POS_FEATURE_CONFIG.useButcheryScaleBarcodeWeight),
});

export type PosFeatureConfig = z.infer<typeof posFeatureConfigSchema>;

export function parsePosFeatureConfig(
  config: Prisma.JsonValue | null | undefined,
): PosFeatureConfig {
  const normalized =
    config && typeof config === "object" && !Array.isArray(config) ? config : {};
  const parsed = posFeatureConfigSchema.safeParse(normalized);

  if (!parsed.success) {
    return { ...DEFAULT_POS_FEATURE_CONFIG };
  }

  return parsed.data;
}

export function parsePosFeatureBlueprint(
  config: Prisma.JsonValue | null | undefined,
): BusinessBlueprint | null {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return null;
  }

  const rawBlueprint =
    "blueprint" in config
      ? (config as Prisma.JsonObject).blueprint
      : undefined;

  if (rawBlueprint === undefined) {
    return null;
  }

  return parseBusinessBlueprint(rawBlueprint);
}

export function serializePosFeatureConfigWithBlueprint(
  config: PosFeatureConfig,
  blueprint: BusinessBlueprint,
): Prisma.InputJsonValue {
  return {
    trackInventoryOnSale: config.trackInventoryOnSale,
    useButcheryScaleBarcodeWeight: config.useButcheryScaleBarcodeWeight,
    blueprint: serializeBusinessBlueprint(blueprint),
  } satisfies Prisma.InputJsonObject;
}
