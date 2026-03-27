import { listStock } from "@/core/inventory/inventory.service";
import { fail, ok } from "@/lib/http";

export async function GET() {
  try {
    const stock = await listStock();
    return ok(stock);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo listar stock";
    return fail(message, 500);
  }
}
