import type {
  CapabilityKey,
  EditionKey,
  ModuleKey,
  PolicyPackKey,
} from "@/core/platform/contracts";

export type BusinessBlueprint = {
  modules: ModuleKey[];
  edition: EditionKey;
  policyPacks: PolicyPackKey[];
  capabilities: CapabilityKey[];
};
