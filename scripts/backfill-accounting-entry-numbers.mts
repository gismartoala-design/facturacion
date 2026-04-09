import process from "node:process";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function getArgValue(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function printUsage() {
  console.log(`
Uso:
  npm run accounting:backfill:entry-numbers -- --all
  npm run accounting:backfill:entry-numbers -- --business-slug default
  npm run accounting:backfill:entry-numbers -- --business-id <uuid>
  npm run accounting:backfill:entry-numbers -- --all --dry-run

Opciones:
  --business-id <uuid>      Backfill en un negocio especifico
  --business-slug <slug>    Busca el negocio por slug
  --all                     Backfill en todos los negocios
  --dry-run                 Muestra lo que haria sin guardar cambios
  --help                    Muestra esta ayuda
`.trim());
}

async function resolveBusinesses() {
  const businessId = getArgValue("--business-id");
  const businessSlug = getArgValue("--business-slug");
  const includeAll = hasFlag("--all");

  const selectorsUsed = [businessId, businessSlug, includeAll ? "--all" : null].filter(Boolean).length;

  if (selectorsUsed !== 1) {
    throw new Error("Debes indicar exactamente una opcion: --business-id, --business-slug o --all");
  }

  if (businessId) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, slug: true, name: true },
    });
    if (!business) throw new Error(`No existe un negocio con id ${businessId}`);
    return [business];
  }

  if (businessSlug) {
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug },
      select: { id: true, slug: true, name: true },
    });
    if (!business) throw new Error(`No existe un negocio con slug ${businessSlug}`);
    return [business];
  }

  const businesses = await prisma.business.findMany({
    select: { id: true, slug: true, name: true },
    orderBy: { name: "asc" },
  });

  if (businesses.length === 0) throw new Error("No hay negocios registrados");
  return businesses;
}

async function backfillForBusiness(params: { businessId: string; dryRun: boolean }) {
  // Obtener asientos sin secuencial, ordenados por fecha de creacion (orden cronologico)
  const entries = await prisma.accountingEntry.findMany({
    where: {
      businessId: params.businessId,
      entryNumber: null,
    },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  if (entries.length === 0) {
    return { updated: 0, skipped: 0 };
  }

  // Determinar desde que numero partir (por si ya hay algunos con secuencial)
  const maxResult = await prisma.accountingEntry.aggregate({
    where: {
      businessId: params.businessId,
      entryNumber: { not: null },
    },
    _max: { entryNumber: true },
  });

  let nextNumber = (maxResult._max.entryNumber ?? 0) + 1;

  if (params.dryRun) {
    console.log(
      `  [dry-run] Asignaria secuencial ${nextNumber} a ${nextNumber + entries.length - 1} ` +
      `a ${entries.length} asientos`,
    );
    return { updated: entries.length, skipped: 0 };
  }

  // Actualizar uno a uno sin transaccion envolvente — el script es idempotente:
  // los que ya tienen entryNumber no son seleccionados en la query inicial.
  let updatedCount = 0;
  for (const entry of entries) {
    await prisma.accountingEntry.update({
      where: { id: entry.id },
      data: { entryNumber: nextNumber },
    });
    nextNumber++;
    updatedCount++;
  }

  return { updated: updatedCount, skipped: 0 };
}

async function main() {
  if (hasFlag("--help")) {
    printUsage();
    return;
  }

  const dryRun = hasFlag("--dry-run");
  const businesses = await resolveBusinesses();
  const results = [];

  for (const business of businesses) {
    console.log(`\nProcesando negocio: ${business.name} (${business.slug})`);
    const result = await backfillForBusiness({ businessId: business.id, dryRun });
    results.push({
      businessId: business.id,
      businessSlug: business.slug,
      businessName: business.name,
      ...result,
    });
    console.log(`  Actualizados: ${result.updated}`);
  }

  console.log("\n" + JSON.stringify({ dryRun, businesses: results }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Error en backfill");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
