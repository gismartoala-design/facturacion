import type { BusinessBlueprint } from "@/core/platform/business-blueprint";
import {
  hasCapability,
  hasModule,
  hasPolicyPack,
} from "@/core/platform/guards";
import type { PosRuntime } from "@/modules/pos/policies/pos-runtime";

type ResolvePosRuntimeInput = {
  blueprint: BusinessBlueprint;
};

export function resolvePosRuntime({
  blueprint,
}: ResolvePosRuntimeInput): PosRuntime {
  const enabled = hasModule(blueprint, "POS");
  const policyPack = hasPolicyPack(blueprint, "POS_BUTCHERY")
    ? "POS_BUTCHERY"
    : hasPolicyPack(blueprint, "POS_RESTAURANT")
      ? "POS_RESTAURANT"
      : "POS_GENERIC";
  const weightFromBarcode =
    hasCapability(blueprint, "POS_WEIGHT_FROM_BARCODE") ||
    policyPack === "POS_BUTCHERY";
  const scaleBarcodes =
    hasCapability(blueprint, "POS_SCALE_BARCODES") || weightFromBarcode;
  const trackInventoryOnSale = hasCapability(
    blueprint,
    "POS_TRACK_INVENTORY_ON_SALE",
  );
  const tableService = hasCapability(blueprint, "POS_TABLE_SERVICE");
  const kitchenTickets = hasCapability(blueprint, "POS_KITCHEN_TICKETS");
  const kitchenDisplay = hasCapability(blueprint, "POS_KITCHEN_DISPLAY");
  const takeoutOrders = hasCapability(blueprint, "POS_TAKEOUT_ORDERS");
  const deliveryOrders = hasCapability(blueprint, "POS_DELIVERY_ORDERS");
  const splitBill = hasCapability(blueprint, "POS_SPLIT_BILL");
  const transferTables = hasCapability(blueprint, "POS_TRANSFER_TABLES");
  const mergeTables = hasCapability(blueprint, "POS_MERGE_TABLES");
  const recipeConsumption = hasCapability(
    blueprint,
    "INVENTORY_RECIPE_CONSUMPTION",
  );
  const prepProduction = hasCapability(
    blueprint,
    "INVENTORY_PREP_PRODUCTION",
  );
  const consumePoint =
    policyPack === "POS_RESTAURANT" && recipeConsumption
      ? "KITCHEN_FIRE"
      : "SALE_CONFIRM";

  return {
    enabled,
    edition: blueprint.edition,
    policyPack,
    capabilities: {
      scaleBarcodes,
      weightFromBarcode,
      tableService,
      kitchenTickets,
      kitchenDisplay,
      takeoutOrders,
      deliveryOrders,
      splitBill,
      transferTables,
      mergeTables,
    },
    service: {
      tableService,
      splitBill,
      transferTables,
      mergeTables,
    },
    channels: {
      takeout: takeoutOrders,
      delivery: deliveryOrders,
    },
    kitchen: {
      kds: kitchenDisplay,
      printTickets: kitchenTickets,
    },
    inventory: {
      trackInventoryOnSale,
      recipeConsumption,
      prepProduction,
      consumePoint,
    },
    operationalRules: {
      trackInventoryOnSale,
    },
  };
}
