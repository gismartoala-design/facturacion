import type { BusinessFeatureKey } from "@prisma/client";

import { DEFAULT_BUSINESS_BLUEPRINT } from "@/core/platform/defaults";
import type { BusinessBlueprint } from "@/core/platform/business-blueprint";
import { businessBlueprintSchema } from "@/core/platform/schemas";
import type {
  CapabilityKey,
  ModuleKey,
  PolicyPackKey,
} from "@/core/platform/contracts";
import { CAPABILITY_CATALOG, POLICY_PACK_CATALOG } from "@/core/platform/catalog";

const MODULE_TO_FEATURE_KEY: Partial<Record<ModuleKey, BusinessFeatureKey>> = {
  POS: "POS",
  BILLING: "BILLING",
  QUOTES: "QUOTES",
};

function unique<T>(values: readonly T[]) {
  return Array.from(new Set(values));
}

function includesAllModules(
  modules: readonly ModuleKey[],
  requiredModules: readonly ModuleKey[],
) {
  return requiredModules.every((moduleKey) => modules.includes(moduleKey));
}

function normalizePolicyPacks(
  modules: readonly ModuleKey[],
  policyPacks: readonly PolicyPackKey[],
) {
  return unique(
    policyPacks.filter((policyPack) =>
      includesAllModules(
        modules,
        POLICY_PACK_CATALOG[policyPack].requiresModules ?? [],
      ),
    ),
  );
}

function normalizeCapabilities(
  modules: readonly ModuleKey[],
  capabilities: readonly CapabilityKey[],
) {
  return unique(
    capabilities.filter((capability) =>
      includesAllModules(
        modules,
        CAPABILITY_CATALOG[capability].requiresModules ?? [],
      ),
    ),
  );
}

export function normalizeBusinessBlueprint(
  blueprint: BusinessBlueprint,
): BusinessBlueprint {
  const parsed = businessBlueprintSchema.parse(blueprint);
  const modules = unique(parsed.modules);

  return {
    modules,
    edition: parsed.edition ?? DEFAULT_BUSINESS_BLUEPRINT.edition,
    policyPacks: normalizePolicyPacks(modules, parsed.policyPacks),
    capabilities: normalizeCapabilities(modules, parsed.capabilities),
  };
}

export function blueprintToEnabledBusinessFeatures(
  blueprint: Pick<BusinessBlueprint, "modules">,
): BusinessFeatureKey[] {
  return blueprint.modules.flatMap((moduleKey) => {
    const featureKey = MODULE_TO_FEATURE_KEY[moduleKey];
    return featureKey ? [featureKey] : [];
  });
}

