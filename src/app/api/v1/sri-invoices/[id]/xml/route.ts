import { fail } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const invoice = await prisma.sriInvoice.findUnique({
    where: { id },
    include: { documents: true },
  });

  if (!invoice?.documents?.xmlAuthorizedPath) {
    return fail("XML no disponible", 404);
  }

  if (invoice.documents.xmlAuthorizedPath.startsWith("http")) {
    return Response.redirect(invoice.documents.xmlAuthorizedPath, 302);
  }

  return fail("XML almacenado localmente pero sin endpoint de descarga configurado", 501);
}
