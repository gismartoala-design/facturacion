import { Box } from "@mui/material";

import { MvpDashboardNav } from "@/shared/dashboard/nav";
import { DashboardUserMenu } from "@/shared/dashboard/user-menu";
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

      <Box
        sx={{
          position: "relative",
          mx: "auto",
          maxWidth: "2000px",
        }}
      >
        <Box sx={{ display: { xs: "block", lg: "none" } }}>
          <MvpDashboardNav
            userRole={session?.role}
            businessName={session?.businessName}
            enabledFeatures={session?.features}
          />
        </Box>

        <Box
          sx={{
            display: { xs: "none", lg: "block" },
            position: "fixed",
            zIndex: 40,
            left: { lg: 16, xl: 24 },
            top: { lg: 16, xl: 24 },
            bottom: { lg: 16, xl: 24 },
            width: { lg: 280, xl: 296 },
          }}
        >
          <MvpDashboardNav
            userRole={session?.role}
            businessName={session?.businessName}
            enabledFeatures={session?.features}
          />
        </Box>

        {session ? (
          <Box
            sx={{
              mb: { xs: 1.5, lg: 0 },
              display: "flex",
              justifyContent: "flex-end",
              position: { lg: "fixed" },
              right: { lg: 16, xl: 24 },
              top: { lg: 16, xl: 24 },
              zIndex: { lg: 50 },
            }}
          >
            <DashboardUserMenu
              name={session.name}
              roleLabel={roleLabel}
              businessName={session.businessName}
            />
          </Box>
        ) : null}

        <Box
          sx={{
            minWidth: 0,
            ml: { lg: "304px", xl: "328px" },
          }}
        >
          <Box component="section">{children}</Box>
        </Box>
      </Box>
    </Box>
  );
}
