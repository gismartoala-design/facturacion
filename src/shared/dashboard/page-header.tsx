import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";

type DashboardPageHeaderProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  titleColor?: string;
  descriptionColor?: string;
  sx?: SxProps<Theme>;
};

export function DashboardPageHeader({
  title,
  description,
  icon,
  actions,
  titleColor = "#0f172a",
  descriptionColor = "#64748b",
  sx,
}: DashboardPageHeaderProps) {
  return (
    <Stack spacing={1.25} sx={sx}>
      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={{ xs: 1.5, lg: 2 }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", lg: "flex-start" }}
      >
        <Stack spacing={0.65} sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={1.1} alignItems="center" sx={{ minWidth: 0 }}>
            {icon ? (
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  flexShrink: 0,
                  color: titleColor,
                }}
              >
                {icon}
              </Box>
            ) : null}

            <Typography
              variant="h5"
              sx={{
                color: titleColor,
                fontWeight: 700,
                lineHeight: 1.15,
              }}
            >
              {title}
            </Typography>
          </Stack>

          {description ? (
            <Typography
              sx={{
                maxWidth: 760,
                color: descriptionColor,
                fontSize: 14,
              }}
            >
              {description}
            </Typography>
          ) : null}
        </Stack>

        {actions ? (
          <Stack
            direction="row"
            spacing={1.2}
            flexWrap="wrap"
            useFlexGap
            sx={{
              width: { xs: "100%", lg: "auto" },
              justifyContent: { xs: "flex-start", lg: "flex-end" },
              alignSelf: { lg: "center" },
              flexShrink: 0,
              maxWidth: "100%",
              "& .MuiButton-root": {
                borderRadius: "999px",
                fontWeight: 700,
                minHeight: 40,
                whiteSpace: "nowrap",
              },
            }}
          >
            {actions}
          </Stack>
        ) : null}
      </Stack>
    </Stack>
  );
}
