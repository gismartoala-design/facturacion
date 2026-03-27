import type { BusinessBlueprint } from "@/core/platform/business-blueprint";
import { hasCapability, hasModule } from "@/core/platform/guards";
import type { CashRuntime } from "./cash-runtime";

export function resolveCashRuntime(blueprint: BusinessBlueprint): CashRuntime {
  const enabled = hasModule(blueprint, "CASH_MANAGEMENT");

  return {
    enabled,
    edition: blueprint.edition,
    capabilities: {
      sessionRequired:     enabled && hasCapability(blueprint, "CASH_SESSION_REQUIRED"),
      declaredClosing:     enabled && hasCapability(blueprint, "CASH_DECLARED_CLOSING"),
      withdrawals:         enabled && hasCapability(blueprint, "CASH_WITHDRAWALS"),
      deposits:            enabled && hasCapability(blueprint, "CASH_DEPOSITS"),
      shiftReconciliation: enabled && hasCapability(blueprint, "CASH_SHIFT_RECONCILIATION"),
      blindClose:          enabled && hasCapability(blueprint, "CASH_BLIND_CLOSE"),
      approvalClose:       enabled && hasCapability(blueprint, "CASH_APPROVAL_CLOSE"),
    },
  };
}
