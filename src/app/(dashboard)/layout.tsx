import { Box } from "@mui/material";

import { DashboardShell } from "@/shared/dashboard/shell";
import { getSession } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const roleLabel = session?.role === "ADMIN" ? "Administrador" : "Vendedor";

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
        userName={session?.name}
        roleLabel={roleLabel}
        canManageCompany={session?.role === "ADMIN"}
      >
        {children}
      </DashboardShell>
    </Box>
  );
}
