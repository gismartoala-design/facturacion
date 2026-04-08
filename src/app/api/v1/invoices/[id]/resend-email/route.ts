import { revalidatePath } from "next/cache";
import { sendAuthorizedInvoiceEmailIfApplicable } from "@/modules/billing/services/authorized-invoice-email.service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    await sendAuthorizedInvoiceEmailIfApplicable(id);
    revalidatePath("/");
    return Response.json({ success: true, invoiceId: id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return Response.json(
      { success: false, error: message, invoiceId: id },
      { status: 500 },
    );
  }
}
