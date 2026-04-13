import type {} from "@mui/x-data-grid/themeAugmentation";
import { alpha, createTheme } from "@mui/material/styles";

const colors = {
  primary: "#8b5cf6",
  primaryLight: "#f5f3ff",
  primaryDark: "#7c3aed",
  secondary: "#6366f1",
  secondaryLight: "#e0e7ff",
  secondaryDark: "#4f46e5",
  background: "#f8fafc",
  sidebar: "#ffffff",
  card: "#ffffff",
  text: "#1e293b",
  textMuted: "#64748b",
  border: "#e2e8f0",
  accent: "#3b82f6",
  danger: "#ef4444",
  success: "#10b981",
};

export const muiTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: colors.primary,
      light: colors.primaryLight,
      dark: colors.primaryDark,
      contrastText: "#ffffff",
    },
    secondary: {
      main: colors.secondary,
      light: colors.secondaryLight,
      dark: colors.secondaryDark,
      contrastText: "#ffffff",
    },
    info: {
      main: colors.accent,
      light: alpha(colors.accent, 0.16),
      dark: "#2563eb",
      contrastText: "#ffffff",
    },
    error: {
      main: colors.danger,
      light: alpha(colors.danger, 0.14),
      dark: "#dc2626",
      contrastText: "#ffffff",
    },
    success: {
      main: colors.success,
      light: alpha(colors.success, 0.14),
      dark: "#059669",
      contrastText: "#ffffff",
    },
    background: {
      default: colors.background,
      paper: colors.card,
    },
    text: {
      primary: colors.text,
      secondary: colors.textMuted,
    },
    divider: colors.border,
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily:
      'var(--font-sans), "Outfit", "Avenir Next", "Segoe UI", sans-serif',
    h1: {
      fontWeight: 800,
    },
    h2: {
      fontWeight: 800,
    },
    h3: {
      fontWeight: 700,
    },
    h4: {
      fontWeight: 700,
    },
    button: {
      fontWeight: 700,
      textTransform: "none",
    },
  },
  components: {
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: colors.card,
          border: `1px solid ${alpha(colors.border, 0.9)}`,
          boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: colors.card,
          border: `1px solid ${alpha(colors.border, 0.9)}`,
          boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)",
          borderRadius: "22px",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 24,
          backgroundColor: colors.card,
          border: `1px solid ${alpha(colors.border, 0.96)}`,
          boxShadow: "0 28px 64px rgba(15, 23, 42, 0.14)",
          backgroundImage: "none",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: "20px 24px 14px",
          color: colors.text,
          fontSize: 20,
          fontWeight: 700,
          lineHeight: 1.2,
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: "0 24px 24px",
          color: alpha(colors.text, 0.78),
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: "16px 24px 24px",
          gap: 10,
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 14,
          fontSize: 14,
          fontWeight: 700,
          lineHeight: 1.1,
          minHeight: 40,
          paddingInline: 16,
        },
        containedPrimary: {
          backgroundColor: colors.primary,
          color: "#ffffff",
          "&:hover": {
            backgroundColor: colors.primaryDark,
          },
        },
        containedSecondary: {
          backgroundColor: colors.secondary,
          color: "#ffffff",
          "&:hover": {
            backgroundColor: colors.secondaryDark,
          },
        },
        containedError: {
          backgroundColor: colors.danger,
          color: "#ffffff",
          "&:hover": {
            backgroundColor: "#dc2626",
          },
        },
        outlined: {
          borderColor: alpha(colors.border, 0.95),
          color: colors.text,
          backgroundColor: alpha(colors.sidebar, 0.88),
          "&:hover": {
            borderColor: alpha(colors.primary, 0.28),
            backgroundColor: alpha(colors.primaryLight, 0.72),
          },
        },
        text: {
          color: colors.text,
          "&:hover": {
            backgroundColor: alpha(colors.primary, 0.08),
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
        size: "small",
        fullWidth: true,
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: alpha(colors.text, 0.72),
          fontWeight: 600,
          "&.Mui-focused": {
            color: colors.primary,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          backgroundColor: alpha(colors.primaryLight, 0.5),
          color: colors.text,
          transition:
            "border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha(colors.border, 0.9),
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha(colors.secondary, 0.45),
          },
          "&.Mui-focused": {
            backgroundColor: colors.card,
            boxShadow: `0 0 0 4px ${alpha(colors.primary, 0.12)}`,
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: colors.primary,
            borderWidth: 1,
          },
          "&.Mui-error .MuiOutlinedInput-notchedOutline": {
            borderColor: colors.danger,
          },
        },
        input: {
          paddingBlock: 11,
          fontSize: 14,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: alpha(colors.border, 0.82),
          color: colors.text,
          fontSize: 13,
        },
        head: {
          backgroundColor: colors.primaryLight,
          color: colors.text,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        },
        body: {
          backgroundColor: "transparent",
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          border: "1px solid transparent",
          backgroundColor: "transparent",
          color: colors.text,
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: `${colors.primaryLight} !important`,
            borderRadius: "16px",
            boxShadow: `inset 0 0 0 1px ${alpha(colors.primary, 0.08)}`,
          },
          "& .MuiDataGrid-columnHeader": {
            backgroundColor: "transparent !important",
          },
          "& .MuiTablePagination-root": {
            borderTop: 0,
          },
          "& .MuiDataGrid-main": {
            borderRadius: "18px",
          },
          "& .MuiDataGrid-toolbarContainer": {
            padding: "12px 14px 10px",
            backgroundColor: alpha(colors.sidebar, 0.72),
            "& .MuiButton-root": {
              marginRight: 10,
              color: colors.text,
              "&:hover": {
                backgroundColor: alpha(colors.primary, 0.08),
              },
            },
          },
          "& .MuiDataGrid-columnHeader[data-field='__check__']": {
            padding: 0,
          },
          "& .MuiDataGrid-columnSeparator": {
            color: alpha(colors.border, 0.72),
            opacity: 1,
          },
          "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within":
            {
              outline: "none",
            },
        },
        columnHeaders: {
          backgroundColor: colors.primaryLight,
          borderBottom: 0,
          borderRadius: 18,
          minHeight: "52px !important",
          maxHeight: "52px !important",
          marginBottom: "6px",
          overflow: "hidden",
          boxShadow: `inset 0 0 0 1px ${alpha(colors.primary, 0.08)}`,
        },
        columnHeaderTitle: {
          color: colors.text,
          fontWeight: 600,
          fontSize: 14,
          letterSpacing: 0,
          textTransform: "none",
        },
        cell: {
          borderBottom: 0,
          fontSize: 14,
          paddingInline: 18,
        },
        row: {
          minHeight: "50px !important",
          maxHeight: "50px !important",
          transition: "background-color 140ms ease",
          "&:hover": {
            backgroundColor: alpha(colors.accent, 0.05),
          },
        },
        footerContainer: {
          borderTop: 0,
          minHeight: 50,
        },
        selectedRowCount: {
          color: colors.text,
        },
      },
    },
  },
});
