import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import type { PosBootstrap } from "@/modules/pos/components/pos-app";
import { getPosBootstrap } from "@/modules/pos/services/pos.service";
import { PosApp } from "@/modules/pos/components/pos-app";

export default async function PosPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (!session.features.includes("POS")) {
    redirect("/overview");
  }

  let initialBootstrap: PosBootstrap | null = null;
  let initialBootstrapError: string | null = null;

  try {
    const bootstrapData = await getPosBootstrap(session);
    initialBootstrap = JSON.parse(
      JSON.stringify(bootstrapData),
    ) as PosBootstrap;
  } catch (error) {
    initialBootstrapError =
      error instanceof Error ? error.message : "No se pudo cargar POS";
  }

  return (
    <PosApp
      initialSession={{
        name: session.name,
        role: session.role,
      }}
      initialBootstrap={initialBootstrap}
      initialBootstrapError={initialBootstrapError}
    />
  );
}
