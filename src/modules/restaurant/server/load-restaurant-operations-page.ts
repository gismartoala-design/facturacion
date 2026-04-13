import { redirect } from "next/navigation";

import {
  ensureDefaultBusiness,
  getBusinessContextById,
} from "@/core/business/business.service";
import { hasModule } from "@/core/platform/guards";
import { getSession } from "@/lib/auth";
import { resolvePosRuntime } from "@/modules/pos/policies/resolve-pos-runtime";
import { getRestaurantBootstrap } from "@/modules/restaurant/restaurant.service";

type LoadRestaurantOperationsPageOptions = {
  requireAdmin?: boolean;
};

export async function loadRestaurantOperationsPage(
  options?: LoadRestaurantOperationsPageOptions,
) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const business = session.businessId
    ? await getBusinessContextById(session.businessId)
    : await ensureDefaultBusiness();

  if (!hasModule(business.blueprint, "POS")) {
    redirect("/overview");
  }

  const posRuntime = resolvePosRuntime({
    blueprint: business.blueprint,
  });

  if (posRuntime.policyPack !== "POS_RESTAURANT") {
    redirect("/pos");
  }

  if (options?.requireAdmin && session.role !== "ADMIN") {
    redirect("/restaurant/orders/new");
  }

  let initialBootstrap: Awaited<ReturnType<typeof getRestaurantBootstrap>> | null =
    null;
  let initialBootstrapError: string | null = null;

  try {
    const bootstrapData = await getRestaurantBootstrap(session);
    initialBootstrap = JSON.parse(
      JSON.stringify(bootstrapData),
    ) as Awaited<ReturnType<typeof getRestaurantBootstrap>>;
  } catch (error) {
    initialBootstrapError =
      error instanceof Error ? error.message : "No se pudo cargar restaurante";
  }

  return {
    initialBootstrap,
    initialBootstrapError,
  };
}
