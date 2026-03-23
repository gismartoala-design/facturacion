import process from "node:process";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parsePosFeatureConfig(config: unknown) {
  const normalized =
    config && typeof config === "object" && !Array.isArray(config) ? config : {};

  return {
    trackInventoryOnSale:
      typeof (normalized as Record<string, unknown>).trackInventoryOnSale ===
      "boolean"
        ? Boolean(
            (normalized as Record<string, unknown>).trackInventoryOnSale,
          )
        : true,
    useButcheryScaleBarcodeWeight:
      typeof (
        normalized as Record<string, unknown>
      ).useButcheryScaleBarcodeWeight === "boolean"
        ? Boolean(
            (normalized as Record<string, unknown>)
              .useButcheryScaleBarcodeWeight,
          )
        : false,
  };
}

function parsePosFeatureBlueprint(config: unknown) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return null;
  }

  return "blueprint" in (config as Record<string, unknown>)
    ? (config as Record<string, unknown>).blueprint
    : null;
}

function legacyPosFlagsToPolicyEditorValue(posSettings: {
  trackInventoryOnSale: boolean;
  useButcheryScaleBarcodeWeight: boolean;
}) {
  return {
    policyPack: posSettings.useButcheryScaleBarcodeWeight
      ? "POS_BUTCHERY"
      : "POS_GENERIC",
    trackInventoryOnSale: posSettings.trackInventoryOnSale,
  } as const;
}

function editorValueToPosBlueprint(
  policy: {
    policyPack: "POS_GENERIC" | "POS_BUTCHERY" | "POS_RESTAURANT";
    trackInventoryOnSale: boolean;
  },
  enabled: boolean,
) {
  return {
    modules: enabled ? ["POS"] : [],
    edition: "STARTER",
    policyPacks: enabled ? [policy.policyPack] : [],
    capabilities: enabled
      ? [
          ...(policy.trackInventoryOnSale
            ? ["POS_TRACK_INVENTORY_ON_SALE"]
            : []),
          ...(policy.policyPack === "POS_BUTCHERY"
            ? ["POS_SCALE_BARCODES", "POS_WEIGHT_FROM_BARCODE"]
            : []),
        ]
      : [],
  };
}

function serializePosFeatureConfigWithBlueprint(
  posSettings: {
    trackInventoryOnSale: boolean;
    useButcheryScaleBarcodeWeight: boolean;
  },
  blueprint: ReturnType<typeof editorValueToPosBlueprint>,
) {
  return {
    trackInventoryOnSale: posSettings.trackInventoryOnSale,
    useButcheryScaleBarcodeWeight: posSettings.useButcheryScaleBarcodeWeight,
    blueprint,
  };
}

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function printUsage() {
  console.log(`
Uso:
  npm run pos:migrate:blueprints

Opciones:
  --force   Reescribe el blueprint aunque ya exista
  --help    Muestra esta ayuda
`.trim());
}

async function main() {
  if (hasFlag("--help")) {
    printUsage();
    return;
  }

  const force = hasFlag("--force");
  const posFeatures = await prisma.businessFeature.findMany({
    where: {
      key: "POS",
    },
    select: {
      id: true,
      enabled: true,
      config: true,
    },
  });

  let updated = 0;
  let skipped = 0;

  for (const feature of posFeatures) {
    const existingBlueprint = parsePosFeatureBlueprint(feature.config);
    if (existingBlueprint && !force) {
      skipped += 1;
      continue;
    }

    const posSettings = parsePosFeatureConfig(feature.config);
    const posPolicy = legacyPosFlagsToPolicyEditorValue(posSettings);
    const blueprint = editorValueToPosBlueprint(posPolicy, feature.enabled);

    await prisma.businessFeature.update({
      where: { id: feature.id },
      data: {
        config: serializePosFeatureConfigWithBlueprint(posSettings, blueprint),
      },
    });

    updated += 1;
  }

  console.log(
    JSON.stringify(
      {
        total: posFeatures.length,
        updated,
        skipped,
        forced: force,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error
        ? error.message
        : "No se pudo migrar el blueprint de POS",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
