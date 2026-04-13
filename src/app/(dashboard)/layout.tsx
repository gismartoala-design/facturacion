import { Box } from "@mui/material";

import {
  ensureDefaultBusiness,
  getBusinessContextById,
} from "@/core/business/business.service";
import { resolvePosRuntime } from "@/modules/pos/policies/resolve-pos-runtime";
import { DashboardShell } from "@/shared/dashboard/shell";
import { getSession } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const roleLabel = session?.role === "ADMIN" ? "Administrador" : "Vendedor";
  const business = session
    ? session.businessId
      ? await getBusinessContextById(session.businessId)
      : await ensureDefaultBusiness()
    : null;
  const restaurantEnabled = business
    ? resolvePosRuntime({
        blueprint: business.blueprint,
      }).policyPack === "POS_RESTAURANT"
    : false;

  return (
    <Box
      component="main"
      sx={{
        position: "relative",
        minHeight: "100vh",
        overflowX: "hidden",
        backgroundColor: "background.default",
        px: { xs: 1.5, md: 2 },
        py: { xs: 1.5, xl: 3 },
      }}
    >
      <DashboardShell
        userRole={session?.role}
        businessName={session?.businessName}
        enabledFeatures={session?.features}
        restaurantEnabled={restaurantEnabled}
        userName={session?.name}
        roleLabel={roleLabel}
        canManageCompany={session?.role === "ADMIN"}
      >
        {children}
      </DashboardShell>
    </Box>
  );
}
