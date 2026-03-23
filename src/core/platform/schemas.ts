import { z } from "zod";

import {
  CAPABILITY_KEYS,
  EDITION_KEYS,
  MODULE_KEYS,
  POLICY_PACK_KEYS,
} from "@/core/platform/contracts";

export const moduleKeySchema = z.enum(MODULE_KEYS);
export const editionKeySchema = z.enum(EDITION_KEYS);
export const policyPackKeySchema = z.enum(POLICY_PACK_KEYS);
export const capabilityKeySchema = z.enum(CAPABILITY_KEYS);

export const businessBlueprintSchema = z.object({
  modules: z.array(moduleKeySchema).default([]),
  edition: editionKeySchema.default("STARTER"),
  policyPacks: z.array(policyPackKeySchema).default([]),
  capabilities: z.array(capabilityKeySchema).default([]),
});
