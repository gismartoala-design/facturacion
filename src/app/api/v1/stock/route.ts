import { fail, ok } from "@/lib/http";
import { listStock } from "@/modules/inventory/inventory.service";

export async function GET() {
  try {
    const stock = await listStock();
    return ok(stock);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo listar stock";
    return fail(message, 500);
  }
}
