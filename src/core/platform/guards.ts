import type { BusinessBlueprint } from "@/core/platform/business-blueprint";
import type {
  CapabilityKey,
  ModuleKey,
  PolicyPackKey,
} from "@/core/platform/contracts";

export function hasModule(
  blueprint: Pick<BusinessBlueprint, "modules"> | null | undefined,
  module: ModuleKey,
) {
  return Boolean(blueprint?.modules.includes(module));
}

export function hasPolicyPack(
  blueprint: Pick<BusinessBlueprint, "policyPacks"> | null | undefined,
  policyPack: PolicyPackKey,
) {
  return Boolean(blueprint?.policyPacks.includes(policyPack));
}

export function hasCapability(
  blueprint: Pick<BusinessBlueprint, "capabilities"> | null | undefined,
  capability: CapabilityKey,
) {
  return Boolean(blueprint?.capabilities.includes(capability));
}
