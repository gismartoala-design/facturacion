import type { EditionKey } from "@/core/platform/contracts";

export type CashRuntime = {
  enabled: boolean;
  edition: EditionKey;
  capabilities: {
    sessionRequired: boolean;
    declaredClosing: boolean;
    withdrawals: boolean;
    deposits: boolean;
    shiftReconciliation: boolean;
    blindClose: boolean;
    approvalClose: boolean;
  };
};
