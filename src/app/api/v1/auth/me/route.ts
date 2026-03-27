import { fail, ok } from "@/lib/http";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return fail("No autenticado", 401);
  return ok({
    sub: session.sub,
    businessId: session.businessId,
    businessName: session.businessName,
    name: session.name,
    email: session.email,
    role: session.role,
    features: session.features,
  });
}
