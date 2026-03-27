import type { EditionKey } from "@/core/platform/contracts";

export type PosRuntime = {
  enabled: boolean;
  edition: EditionKey;
  policyPack: "POS_GENERIC" | "POS_BUTCHERY" | "POS_RESTAURANT";
  capabilities: {
    scaleBarcodes: boolean;
    weightFromBarcode: boolean;
    tableService: boolean;
    kitchenTickets: boolean;
  };
  operationalRules: {
    trackInventoryOnSale: boolean;
  };
};
