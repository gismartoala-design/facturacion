import { z } from "zod";

import type { PosFeatureConfig } from "@/core/business/feature-config";
import type { BusinessBlueprint } from "@/core/platform/business-blueprint";
import { hasCapability, hasPolicyPack } from "@/core/platform/guards";

export const POS_POLICY_PACK_EDITOR_KEYS = [
  "POS_GENERIC",
  "POS_BUTCHERY",
  "POS_RESTAURANT",
] as const;

export const posPolicyPackEditorSchema = z.enum(POS_POLICY_PACK_EDITOR_KEYS);

export const posPolicyEditorSchema = z.object({
  policyPack: posPolicyPackEditorSchema.default("POS_GENERIC"),
  trackInventoryOnSale: z.boolean().default(true),
});

export type PosPolicyEditorValue = z.infer<typeof posPolicyEditorSchema>;

export const DEFAULT_POS_POLICY_EDITOR: PosPolicyEditorValue = {
  policyPack: "POS_GENERIC",
  trackInventoryOnSale: true,
};

export function posBlueprintToEditorValue(
  blueprint:
    | Pick<BusinessBlueprint, "policyPacks" | "capabilities">
    | null
    | undefined,
): PosPolicyEditorValue {
  const policyPack = hasPolicyPack(blueprint, "POS_BUTCHERY")
    ? "POS_BUTCHERY"
    : hasPolicyPack(blueprint, "POS_RESTAURANT")
      ? "POS_RESTAURANT"
      : "POS_GENERIC";

  return {
    policyPack,
    trackInventoryOnSale: hasCapability(
      blueprint,
      "POS_TRACK_INVENTORY_ON_SALE",
    ),
  };
}

export function legacyPosFlagsToPolicyEditorValue(
  posSettings: PosFeatureConfig,
): PosPolicyEditorValue {
  return {
    policyPack: posSettings.useButcheryScaleBarcodeWeight
      ? "POS_BUTCHERY"
      : "POS_GENERIC",
    trackInventoryOnSale: posSettings.trackInventoryOnSale,
  };
}

export function posPolicyToLegacyFlags(policy: PosPolicyEditorValue) {
  return {
    trackInventoryOnSale: policy.trackInventoryOnSale,
    useButcheryScaleBarcodeWeight: policy.policyPack === "POS_BUTCHERY",
  } satisfies PosFeatureConfig;
}

export function editorValueToPosBlueprint(
  policy: PosPolicyEditorValue,
  options?: { enabled?: boolean },
): BusinessBlueprint {
  const enabled = options?.enabled ?? true;

  return {
    modules: enabled ? ["POS"] : [],
    edition: "STARTER",
    policyPacks: enabled ? [policy.policyPack] : [],
    capabilities: enabled
      ? [
          ...(policy.trackInventoryOnSale
            ? (["POS_TRACK_INVENTORY_ON_SALE"] as const)
            : []),
          ...(policy.policyPack === "POS_BUTCHERY"
            ? (["POS_SCALE_BARCODES", "POS_WEIGHT_FROM_BARCODE"] as const)
            : []),
        ]
      : [],
  };
}
