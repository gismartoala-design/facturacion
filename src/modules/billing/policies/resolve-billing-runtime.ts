import type { BusinessBlueprint } from "@/core/platform/business-blueprint";
import { hasCapability, hasModule } from "@/core/platform/guards";
import type { BillingRuntime } from "@/modules/billing/policies/billing-runtime";

type BillingTaxProfileInput = {
  requiresElectronicBilling: boolean;
  allowsSalesNote: boolean;
  accountingRequired: boolean;
  environment: string | null;
  issuerId: string | null;
} | null;

type ResolveBillingRuntimeInput = {
  blueprint: BusinessBlueprint;
  taxProfile: BillingTaxProfileInput;
};

export function resolveBillingRuntime({
  blueprint,
  taxProfile,
}: ResolveBillingRuntimeInput): BillingRuntime {
  const enabled = hasModule(blueprint, "BILLING");
  const requiresElectronicBilling =
    enabled && Boolean(taxProfile?.requiresElectronicBilling);
  const hasConfiguredIssuer = Boolean(taxProfile?.issuerId);

  return {
    enabled,
    edition: blueprint.edition,
    environment: taxProfile?.environment ?? null,
    capabilities: {
      electronicBilling: requiresElectronicBilling && hasConfiguredIssuer,
      salesNote: enabled && Boolean(taxProfile?.allowsSalesNote),
      auditLog: hasCapability(blueprint, "AUDIT_LOG"),
      approvalFlows: hasCapability(blueprint, "APPROVAL_FLOWS"),
    },
    operationalRules: {
      requiresElectronicBilling,
      accountingRequired: enabled && Boolean(taxProfile?.accountingRequired),
      hasConfiguredIssuer,
    },
  };
}
