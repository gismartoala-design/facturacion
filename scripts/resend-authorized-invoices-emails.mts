import { PrismaClient, SriInvoiceStatus } from "@prisma/client";

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

function getFlagValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function findAuthorizedInvoiceIds(limit?: number) {
  const invoices = await prisma.sriInvoice.findMany({
    where: {
      status: SriInvoiceStatus.AUTHORIZED,
    },
    select: {
      id: true,
    },
    orderBy: {
      updatedAt: "asc",
    },
    take: limit,
  });

  return invoices.map((invoice) => invoice.id);
}

async function resendEmailViaApi(invoiceId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/invoices/${invoiceId}/resend-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} - ${error}`);
  }
}

async function resendEmails(invoiceIds: string[]) {
  let successCount = 0;
  let failureCount = 0;

  for (const invoiceId of invoiceIds) {
    process.stdout.write(`Reenviando factura autorizada ${invoiceId}... `);
    try {
      await resendEmailViaApi(invoiceId);
      console.log("OK");
      successCount += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      console.log(`ERROR: ${message}`);
      failureCount += 1;
    }
  }

  return { successCount, failureCount };
}

async function main() {
  const limitValue = getFlagValue("--limit");
  const dryRun = hasFlag("--dry-run");
  const limit = limitValue ? Number(limitValue) : undefined;

  if (limitValue && Number.isNaN(limit)) {
    console.error("El valor de --limit debe ser un número válido.");
    process.exitCode = 1;
    return;
  }

  const invoiceIds = await findAuthorizedInvoiceIds(limit);
  console.log(`Facturas autorizadas encontradas: ${invoiceIds.length}`);

  if (invoiceIds.length === 0) {
    return;
  }

  if (dryRun) {
    console.log("Dry-run activado. No se reenviarán correos.");
    invoiceIds.forEach((id) => console.log(` - ${id}`));
    return;
  }

  const { successCount, failureCount } = await resendEmails(invoiceIds);
  console.log(`Reenvío completado: ${successCount} enviados, ${failureCount} fallidos.`);
}


main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Error desconocido ejecutando el script",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
