"use client";

import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import { Building2, LogOut, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type DashboardUserMenuProps = {
  name: string;
  roleLabel: string;
  businessName?: string;
  canManageCompany?: boolean;
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "DV";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function DashboardUserMenu({
  name,
  roleLabel,
  businessName,
  canManageCompany,
}: DashboardUserMenuProps) {
  const theme = useTheme();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const initials = initialsFromName(name);
  const open = Boolean(anchorEl);
  const subtleBorder = alpha(theme.palette.divider, 0.9);
  const softBorder = alpha(theme.palette.divider, 0.6);
  const triggerBg = alpha(theme.palette.background.paper, 0.84);
  const panelBg = alpha(theme.palette.background.paper, 0.92);
  const softPrimary = alpha(theme.palette.primary.light, 0.5);
  const softSecondary = alpha(theme.palette.secondary.light, 0.42);

  async function handleLogout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    setAnchorEl(null);
    router.replace("/login");
  }

  return (
    <>
      <IconButton
        aria-label="Abrir opciones de usuario"
        aria-expanded={open}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{
          position: "relative",
          width: 52,
          height: 52,
          border: `1px solid ${subtleBorder}`,
          backgroundColor: triggerBg,
          backdropFilter: "blur(18px)",
          boxShadow: "0 14px 32px rgba(15,23,42,0.08)",
          transition: "transform 160ms ease, background-color 160ms ease",
          "&:hover": {
            backgroundColor: theme.palette.background.paper,
            transform: "scale(1.02)",
          },
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            borderRadius: "999px",
            background:
              `linear-gradient(135deg, ${softPrimary}, transparent 52%, ${softSecondary})`,
            opacity: 0.9,
          }}
        />
        <Typography
          sx={{
            position: "relative",
            zIndex: 1,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.16em",
            color: "text.primary",
          }}
        >
          {initials}
        </Typography>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1.5,
              width: "min(22rem, calc(100vw - 1rem))",
              overflow: "hidden",
              borderRadius: "28px",
              border: `1px solid ${subtleBorder}`,
              backgroundColor: panelBg,
              backdropFilter: "blur(18px)",
              boxShadow: "0 20px 50px rgba(15,23,42,0.12)",
            },
          },
        }}
      >
        <Box
          sx={{
            pointerEvents: "none",
            position: "absolute",
            insetInline: 0,
            top: 0,
            height: 96,
            background:
              `linear-gradient(135deg, ${softPrimary}, transparent 58%, ${softSecondary})`,
          }}
        />

        <Paper
          elevation={0}
          sx={{
            position: "relative",
            zIndex: 1,
            border: 0,
            backgroundColor: "transparent",
            p: 2,
          }}
        >
          <Stack spacing={2}>
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="flex-start"
              justifyContent="space-between"
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: "0.16em",
                    color: "text.primary",
                    backgroundColor: alpha(theme.palette.background.paper, 0.96),
                    border: `1px solid ${alpha(theme.palette.common.white, 0.82)}`,
                    boxShadow: "0 8px 18px rgba(15,23,42,0.06)",
                  }}
                >
                  {initials}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: alpha(theme.palette.text.primary, 0.38),
                    }}
                  >
                    Sesion activa
                  </Typography>
                  <Typography
                    sx={{
                      color: "text.primary",
                      fontSize: 14,
                      fontWeight: 600,
                      lineHeight: 1.2,
                    }}
                  >
                    {name}
                  </Typography>
                  <Typography
                    sx={{
                      color: "text.secondary",
                      fontSize: 12,
                    }}
                  >
                    {roleLabel}
                  </Typography>
                </Box>
              </Stack>

              <IconButton
                size="small"
                onClick={() => setAnchorEl(null)}
                sx={{
                  color: alpha(theme.palette.text.primary, 0.56),
                  "&:hover": {
                    backgroundColor: alpha(theme.palette.background.paper, 0.8),
                    color: "text.primary",
                  },
                }}
              >
                <X className="h-4 w-4" />
              </IconButton>
            </Stack>

            <Divider sx={{ borderColor: softBorder }} />

            {canManageCompany ? (
              <Button
                type="button"
                fullWidth
                variant="text"
                onClick={() => {
                  setAnchorEl(null);
                  router.push("/company");
                }}
                startIcon={<Building2 className="h-4 w-4" />}
                sx={{
                  justifyContent: "flex-start",
                  gap: 1,
                  minHeight: 48,
                  px: 1.5,
                  py: 1.25,
                  borderRadius: "18px",
                  border: `1px solid ${softBorder}`,
                  backgroundColor: alpha(theme.palette.background.paper, 0.88),
                  color: "text.primary",
                  fontSize: 14,
                  fontWeight: 600,
                  "&:hover": {
                    backgroundColor: alpha(theme.palette.primary.light, 0.42),
                    borderColor: alpha(theme.palette.primary.main, 0.22),
                  },
                }}
              >
                Mi compania
              </Button>
            ) : null}

            <Button
              type="button"
              fullWidth
              variant="text"
              onClick={() => {
                void handleLogout();
              }}
              startIcon={<LogOut className="h-4 w-4" />}
              sx={{
                justifyContent: "flex-start",
                gap: 1,
                minHeight: 48,
                px: 1.5,
                py: 1.25,
                borderRadius: "18px",
                border: `1px solid ${softBorder}`,
                backgroundColor: alpha(theme.palette.background.paper, 0.88),
                color: "text.primary",
                fontSize: 14,
                fontWeight: 600,
                "&:hover": {
                  backgroundColor: alpha(theme.palette.primary.light, 0.42),
                  borderColor: alpha(theme.palette.primary.main, 0.22),
                },
              }}
            >
              Cerrar sesion
            </Button>
          </Stack>
        </Paper>
      </Popover>
    </>
  );
}
