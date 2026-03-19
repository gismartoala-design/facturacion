import type {} from "@mui/x-data-grid/themeAugmentation";
import { alpha, createTheme } from "@mui/material/styles";

export const muiTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#4a3c58",
      light: "#b1a1c6",
      dark: "#3d3249",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#b1a1c6",
      light: "#d9d0e5",
      dark: "#8f7da8",
      contrastText: "#2c2235",
    },
    background: {
      default: "#fdfcf5",
      paper: "#ffffff",
    },
    text: {
      primary: "#4a3c58",
      secondary: "rgba(74, 60, 88, 0.7)",
    },
    divider: "rgba(232, 213, 229, 0.85)",
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
          backgroundColor: "#ffffff",
          border: `1px solid ${alpha("#e8d5e5", 0.72)}`,
          boxShadow: "0 14px 34px rgba(74, 60, 88, 0.06)",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 24,
          backgroundColor: "#fdfcf5",
          border: `1px solid ${alpha("#e8d5e5", 0.88)}`,
          boxShadow: "0 28px 64px rgba(74, 60, 88, 0.18)",
          backgroundImage: "none",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: "20px 24px 14px",
          color: "#4a3c58",
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
          color: "rgba(74, 60, 88, 0.78)",
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
          backgroundColor: "#4a3c58",
          color: "#ffffff",
          "&:hover": {
            backgroundColor: "#3d3249",
          },
        },
        containedSecondary: {
          backgroundColor: "#b1a1c6",
          color: "#2c2235",
          "&:hover": {
            backgroundColor: "#9b89b1",
          },
        },
        containedError: {
          backgroundColor: "#b91c1c",
          color: "#ffffff",
          "&:hover": {
            backgroundColor: "#991b1b",
          },
        },
        outlined: {
          borderColor: alpha("#e8d5e5", 0.9),
          color: "#4a3c58",
          backgroundColor: alpha("#ffffff", 0.88),
          "&:hover": {
            borderColor: alpha("#d7bfd3", 1),
            backgroundColor: "#fdfcf5",
          },
        },
        text: {
          color: "#4a3c58",
          "&:hover": {
            backgroundColor: alpha("#b1a1c6", 0.08),
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
          color: "rgba(74, 60, 88, 0.72)",
          fontWeight: 600,
          "&.Mui-focused": {
            color: "#4a3c58",
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          backgroundColor: "rgba(253, 252, 245, 0.76)",
          color: "#4a3c58",
          transition:
            "border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha("#e8d5e5", 0.85),
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha("#d7bfd3", 1),
          },
          "&.Mui-focused": {
            backgroundColor: "#ffffff",
            boxShadow: `0 0 0 4px ${alpha("#b1a1c6", 0.12)}`,
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#b1a1c6",
            borderWidth: 1,
          },
          "&.Mui-error .MuiOutlinedInput-notchedOutline": {
            borderColor: "#dc2626",
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
          borderColor: alpha("#e8d5e5", 0.7),
          color: "#4a3c58",
          fontSize: 13,
        },
        head: {
          backgroundColor: "#fdf7fb",
          color: "#4a3c58",
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
          color: "#4a3c58",
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: "#dfe5ec !important",
            borderRadius: "16px",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.32)",
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
            backgroundColor: alpha("#ffffff", 0.55),
            "& .MuiButton-root": {
              marginRight: 10,
              color: "#4a3c58",
              "&:hover": {
                backgroundColor: alpha("#b1a1c6", 0.08),
              },
            },
          },
          "& .MuiDataGrid-columnHeader[data-field='__check__']": {
            padding: 0,
          },
          "& .MuiDataGrid-columnSeparator": {
            color: alpha("#8b96a8", 0.42),
            opacity: 1,
          },
          "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within":
            {
              outline: "none",
            },
        },
        columnHeaders: {
          backgroundColor: "#dfe5ec",
          borderBottom: 0,
          borderRadius: 18,
          minHeight: "52px !important",
          maxHeight: "52px !important",
          marginBottom: "6px",
          overflow: "hidden",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.32)",
        },
        columnHeaderTitle: {
          color: "#344050",
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
            backgroundColor: alpha("#f6e6da", 0.32),
          },
        },
        footerContainer: {
          borderTop: 0,
          minHeight: 50,
        },
        selectedRowCount: {
          color: "#4a3c58",
        },
      },
    },
  },
});
