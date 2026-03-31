"use client";

import type { SessionFeatureKey } from "@/lib/auth";
import Box from "@mui/material/Box";
import { useState } from "react";
import { DashboardUserMenu } from "./user-menu";
import { MvpDashboardNav } from "./nav";

type DashboardShellProps = {
  children: React.ReactNode;
  userRole?: "ADMIN" | "SELLER";
  businessName?: string;
  enabledFeatures?: SessionFeatureKey[];
  userName?: string;
  roleLabel?: string;
  canManageCompany?: boolean;
};

export function DashboardShell({
  children,
  userRole,
  businessName,
  enabledFeatures,
  userName,
  roleLabel,
  canManageCompany = false,
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Sidebar se expande temporalmente al hacer hover cuando está colapsado
  const isCollapsed = collapsed && !hovered;

  return (
    <Box sx={{ position: "relative", mx: "auto", maxWidth: "2000px" }}>
      {/* Mobile nav */}
      <Box sx={{ display: { xs: "block", lg: "none" } }}>
        <MvpDashboardNav
          userRole={userRole}
          businessName={businessName}
          enabledFeatures={enabledFeatures}
        />
      </Box>

      {/* Desktop nav (fixed, collapsible) */}
      <Box
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        sx={{
          display: { xs: "none", lg: "block" },
          position: "fixed",
          zIndex: 40,
          left: { lg: 16, xl: 24 },
          top: { lg: 16, xl: 24 },
          bottom: { lg: 16, xl: 24 },
          width: isCollapsed ? 76 : { lg: 280, xl: 296 },
          transition: "width 320ms cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        <MvpDashboardNav
          userRole={userRole}
          businessName={businessName}
          enabledFeatures={enabledFeatures}
          collapsed={isCollapsed}
          onToggle={() => setCollapsed((prev) => !prev)}
        />
      </Box>

      {/* User menu */}
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

      {/* Main content — margin adjusts with sidebar */}
      <Box
        sx={{
          minWidth: 0,
          ml: {
            lg: isCollapsed ? "100px" : "304px",
            xl: isCollapsed ? "100px" : "328px",
          },
          transition: "margin-left 320ms cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        <Box component="section">{children}</Box>
      </Box>
    </Box>
  );
}
