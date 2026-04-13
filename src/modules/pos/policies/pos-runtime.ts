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
    kitchenDisplay: boolean;
    takeoutOrders: boolean;
    deliveryOrders: boolean;
    splitBill: boolean;
    transferTables: boolean;
    mergeTables: boolean;
  };
  service: {
    tableService: boolean;
    splitBill: boolean;
    transferTables: boolean;
    mergeTables: boolean;
  };
  channels: {
    takeout: boolean;
    delivery: boolean;
  };
  kitchen: {
    kds: boolean;
    printTickets: boolean;
  };
  inventory: {
    trackInventoryOnSale: boolean;
    recipeConsumption: boolean;
    prepProduction: boolean;
    consumePoint: "SALE_CONFIRM" | "KITCHEN_FIRE";
  };
  operationalRules: {
    trackInventoryOnSale: boolean;
  };
};
