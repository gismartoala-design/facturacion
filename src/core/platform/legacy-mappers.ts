import type { BusinessFeatureKey } from "@prisma/client";

import type { PosFeatureConfig } from "@/core/business/feature-config";
import type { BusinessBlueprint } from "@/core/platform/business-blueprint";
import { DEFAULT_BUSINESS_BLUEPRINT } from "@/core/platform/defaults";

type LegacyFeatureState = {
  key: BusinessFeatureKey;
  enabled: boolean;
};

function toLegacyModules(features: readonly LegacyFeatureState[]) {
  return features.flatMap((feature) => {
    if (!feature.enabled) {
      return [];
    }

    switch (feature.key) {
      case "POS":
        return ["POS"] as const;
      case "BILLING":
        return ["BILLING"] as const;
      case "QUOTES":
        return ["QUOTES"] as const;
      default:
        return [];
    }
  });
}

export function mapLegacyPosBlueprint(params: {
  posEnabled: boolean;
  posSettings: PosFeatureConfig;
}): BusinessBlueprint {
  return {
    ...DEFAULT_BUSINESS_BLUEPRINT,
    modules: params.posEnabled ? ["POS"] : [],
    policyPacks: params.posEnabled
      ? [
          params.posSettings.useButcheryScaleBarcodeWeight
            ? "POS_BUTCHERY"
            : "POS_GENERIC",
        ]
      : [],
    capabilities: params.posEnabled
      ? [
          ...(params.posSettings.useButcheryScaleBarcodeWeight
            ? (["POS_SCALE_BARCODES", "POS_WEIGHT_FROM_BARCODE"] as const)
            : []),
          ...(params.posSettings.trackInventoryOnSale
            ? (["POS_TRACK_INVENTORY_ON_SALE"] as const)
            : []),
        ]
      : [],
  };
}

export function mapLegacyBusinessBlueprint(params: {
  features: readonly LegacyFeatureState[];
  posSettings: PosFeatureConfig;
}): BusinessBlueprint {
  const modules = toLegacyModules(params.features);
  const hasPos = modules.includes("POS");
  const posBlueprint = mapLegacyPosBlueprint({
    posEnabled: hasPos,
    posSettings: params.posSettings,
  });

  return {
    ...DEFAULT_BUSINESS_BLUEPRINT,
    modules,
    policyPacks: posBlueprint.policyPacks,
    capabilities: posBlueprint.capabilities,
  };
}
