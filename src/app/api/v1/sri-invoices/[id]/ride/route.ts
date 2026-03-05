import { fail } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const invoice = await prisma.sriInvoice.findUnique({
    where: { id },
    include: { documents: true },
  });

  if (!invoice?.documents?.ridePdfPath) {
    return fail("RIDE no disponible", 404);
  }

  if (invoice.documents.ridePdfPath.startsWith("http")) {
    return Response.redirect(invoice.documents.ridePdfPath, 302);
  }

  return fail("RIDE almacenado localmente pero sin endpoint de descarga configurado", 501);
}
