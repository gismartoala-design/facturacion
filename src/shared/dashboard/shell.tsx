"use client";

import type { SessionFeatureKey } from "@/lib/auth";
import Box from "@mui/material/Box";
import { useEffect, useState } from "react";
import { DashboardUserMenu } from "./user-menu";
import { MvpDashboardNav } from "./nav";

const STORAGE_KEY = "dashboard-nav-collapsed";

type DashboardShellProps = {
  children: React.ReactNode;
  userRole?: "ADMIN" | "SELLER";
  businessName?: string;
  enabledFeatures?: SessionFeatureKey[];
  restaurantEnabled?: boolean;
  userName?: string;
  roleLabel?: string;
  canManageCompany?: boolean;
};

export function DashboardShell({
  children,
  userRole,
  businessName,
  enabledFeatures,
  restaurantEnabled = false,
  userName,
  roleLabel,
  canManageCompany = false,
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(STORAGE_KEY) === "true";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  return (
    <Box sx={{ position: "relative", mx: "auto", maxWidth: "2000px" }}>
      <Box sx={{ display: { xs: "block", lg: "none" } }}>
        <MvpDashboardNav
          userRole={userRole}
          businessName={businessName}
          enabledFeatures={enabledFeatures}
          restaurantEnabled={restaurantEnabled}
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
          width: collapsed ? { lg: 188, xl: 200 } : { lg: 280, xl: 296 },
          transition: "width 320ms cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        <MvpDashboardNav
          userRole={userRole}
          businessName={businessName}
          enabledFeatures={enabledFeatures}
          restaurantEnabled={restaurantEnabled}
          collapsed={collapsed}
          onToggle={() => setCollapsed((prev) => !prev)}
        />
      </Box>

      {userName && roleLabel && (
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
            name={userName}
            roleLabel={roleLabel}
            businessName={businessName}
            canManageCompany={canManageCompany}
          />
        </Box>
      )}

      <Box
        sx={{
          minWidth: 0,
          ml: {
            lg: collapsed ? "212px" : "304px",
            xl: collapsed ? "228px" : "328px",
          },
          transition: "margin-left 320ms cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        <Box component="section">{children}</Box>
      </Box>
    </Box>
  );
}
