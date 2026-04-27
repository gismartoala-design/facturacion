import { redirect } from "next/navigation";

import { PlatformBlueprintPage } from "@/modules/platform/components/platform-blueprint-page";
import { getSession } from "@/lib/auth";

export default async function AdminPlatformPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "ADMIN") {
    redirect("/overview");
  }

  return <PlatformBlueprintPage />;
}
