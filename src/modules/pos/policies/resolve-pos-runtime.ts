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

  return {
    enabled,
    edition: blueprint.edition,
    policyPack,
    capabilities: {
      scaleBarcodes,
      weightFromBarcode,
      tableService,
      kitchenTickets,
    },
    operationalRules: {
      trackInventoryOnSale,
    },
  };
}
