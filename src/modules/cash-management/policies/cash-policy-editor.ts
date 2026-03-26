import { z } from "zod";

import type { BusinessBlueprint } from "@/core/platform/business-blueprint";
import type { CapabilityKey } from "@/core/platform/contracts";
import { hasCapability, hasModule } from "@/core/platform/guards";

export const cashPolicyEditorSchema = z.object({
  enabled: z.boolean().default(false),
  edition: z.enum(["STARTER", "GROWTH", "ENTERPRISE"]).default("STARTER"),
  sessionRequired: z.boolean().default(true),
  declaredClosing: z.boolean().default(false),
  withdrawals: z.boolean().default(false),
  deposits: z.boolean().default(false),
  shiftReconciliation: z.boolean().default(false),
});

export type CashPolicyEditorValue = z.infer<typeof cashPolicyEditorSchema>;

export const DEFAULT_CASH_POLICY_EDITOR: CashPolicyEditorValue = {
  enabled: false,
  edition: "STARTER",
  sessionRequired: true,
  declaredClosing: false,
  withdrawals: false,
  deposits: false,
  shiftReconciliation: false,
};

/**
 * Reads Cash Management policy from a persisted blueprint.
 */
export function cashBlueprintToEditorValue(
  blueprint: Pick<BusinessBlueprint, "modules" | "edition" | "capabilities"> | null | undefined,
): CashPolicyEditorValue {
  const enabled = hasModule(blueprint, "CASH_MANAGEMENT");

  return {
    enabled,
    edition: blueprint?.edition ?? "STARTER",
    sessionRequired: hasCapability(blueprint, "CASH_SESSION_REQUIRED"),
    declaredClosing: hasCapability(blueprint, "CASH_DECLARED_CLOSING"),
    withdrawals: hasCapability(blueprint, "CASH_WITHDRAWALS"),
    deposits: hasCapability(blueprint, "CASH_DEPOSITS"),
    shiftReconciliation: hasCapability(blueprint, "CASH_SHIFT_RECONCILIATION"),
  };
}

/**
 * Converts the Cash Management policy editor value to a blueprint fragment.
 * This fragment gets merged into the full business blueprint.
 */
export function cashPolicyToBlueprint(policy: CashPolicyEditorValue): Pick<BusinessBlueprint, "modules" | "capabilities"> {
  if (!policy.enabled) {
    return { modules: [], capabilities: [] };
  }

  const capabilities: CapabilityKey[] = [];

  if (policy.sessionRequired) capabilities.push("CASH_SESSION_REQUIRED");
  if (policy.declaredClosing) capabilities.push("CASH_DECLARED_CLOSING");
  if (policy.withdrawals) capabilities.push("CASH_WITHDRAWALS");
  if (policy.deposits) capabilities.push("CASH_DEPOSITS");
  if (policy.shiftReconciliation) capabilities.push("CASH_SHIFT_RECONCILIATION");

  return {
    modules: ["CASH_MANAGEMENT"],
    capabilities,
  };
}
