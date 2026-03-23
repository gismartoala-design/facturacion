import type { EditionKey } from "@/core/platform/contracts";

export type BillingRuntime = {
  enabled: boolean;
  edition: EditionKey;
  environment: string | null;
  capabilities: {
    electronicBilling: boolean;
    salesNote: boolean;
    auditLog: boolean;
    approvalFlows: boolean;
  };
  operationalRules: {
    requiresElectronicBilling: boolean;
    accountingRequired: boolean;
    hasConfiguredIssuer: boolean;
  };
};
