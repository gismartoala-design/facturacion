import { fail } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const SRI_BASE_URL = (process.env.SRI_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const invoice = await prisma.sriInvoice.findUnique({
      where: { id },
      include: { documents: true },
    });

    if (!invoice) {
      return fail("Factura no encontrada", 404);
    }

    if (invoice.documents?.xmlAuthorizedPath?.startsWith("http")) {
      return Response.redirect(invoice.documents.xmlAuthorizedPath, 302);
    }

    if (!invoice.externalInvoiceId) {
      return fail("XML no disponible", 404);
    }

    const artifactUrl = `${SRI_BASE_URL}/api/v1/invoices/${invoice.externalInvoiceId}/artifacts/XML_AUTHORIZED`;
    const artifactResponse = await fetch(artifactUrl, {
      headers: {
        Accept: "application/xml",
      },
      cache: "no-store",
    });

    if (!artifactResponse.ok || !artifactResponse.body) {
      return fail("XML no disponible", artifactResponse.status === 404 ? 404 : 502);
    }

    return new Response(artifactResponse.body, {
      status: 200,
      headers: {
        "Content-Type": artifactResponse.headers.get("content-type") ?? "application/xml",
        "Content-Disposition": `attachment; filename=\"factura-${invoice.secuencial ?? invoice.id}.xml\"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo descargar XML";
    return fail(message, 500);
  }
}
