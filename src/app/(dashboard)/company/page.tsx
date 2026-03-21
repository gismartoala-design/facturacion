import { redirect } from "next/navigation";

import { CompanySettingsPage } from "@/modules/company/components/company-settings-page";
import { getSession } from "@/lib/auth";

export default async function CompanyPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <CompanySettingsPage canEdit={session.role === "ADMIN"} />;
}
