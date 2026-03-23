import { Prisma } from "@prisma/client";

import type { BusinessBlueprint } from "@/core/platform/business-blueprint";
import { DEFAULT_BUSINESS_BLUEPRINT } from "@/core/platform/defaults";
import { businessBlueprintSchema } from "@/core/platform/schemas";

function unique<T>(values: readonly T[]) {
  return Array.from(new Set(values));
}

export function parseBusinessBlueprint(
  config: Prisma.JsonValue | null | undefined,
): BusinessBlueprint {
  const normalized =
    config && typeof config === "object" && !Array.isArray(config) ? config : {};
  const parsed = businessBlueprintSchema.safeParse(normalized);

  if (!parsed.success) {
    return { ...DEFAULT_BUSINESS_BLUEPRINT };
  }

  return parsed.data;
}

export function serializeBusinessBlueprint(
  blueprint: BusinessBlueprint,
): Prisma.InputJsonValue {
  const parsed = businessBlueprintSchema.parse(blueprint);

  return {
    modules: parsed.modules,
    edition: parsed.edition,
    policyPacks: parsed.policyPacks,
    capabilities: parsed.capabilities,
  } satisfies Prisma.InputJsonObject;
}

export function mergeBusinessBlueprint(
  base: BusinessBlueprint,
  override: BusinessBlueprint,
): BusinessBlueprint {
  return {
    modules: unique([...base.modules, ...override.modules]),
    edition: override.edition || base.edition,
    policyPacks: unique([...base.policyPacks, ...override.policyPacks]),
    capabilities: unique([...base.capabilities, ...override.capabilities]),
  };
}
