import Link from "next/link";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";

import {
  REPORT_CATALOG,
  REPORTS_MODULE_COPY,
} from "@/modules/reports/lib/report-catalog";

export function ReportsHomePage() {
  const ModuleIcon = REPORTS_MODULE_COPY.icon;

  return (
    <Stack spacing={3} sx={{ px: { xs: 1, sm: 2 }, py: { xs: 1, sm: 2 } }}>
      <Box sx={{ px: { xs: 1, sm: 2 }, pt: { xs: 1, sm: 2 } }}>
        <Stack spacing={0.9}>
          <Typography
            variant="h5"
            sx={{ color: "#4a3c58", fontWeight: 700, lineHeight: 1.15 }}
          >
            {REPORTS_MODULE_COPY.title}
          </Typography>
          <Typography
            sx={{
              maxWidth: 860,
              color: "rgba(74, 60, 88, 0.68)",
              fontSize: 14,
            }}
          >
            {REPORTS_MODULE_COPY.description}
          </Typography>
        </Stack>
      </Box>

      <Paper
        sx={{
          borderRadius: "28px",
          p: { xs: 2, md: 2.5 },
          border: "1px solid",
          borderColor: (theme) => alpha(theme.palette.divider, 0.76),
          background: (theme) =>
            `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.98)}, ${alpha(theme.palette.background.default, 0.96)})`,
        }}
      >
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={(theme) => ({
                width: 42,
                height: 42,
                borderRadius: "14px",
                display: "grid",
                placeItems: "center",
                backgroundColor: alpha(theme.palette.primary.main, 0.12),
                color: theme.palette.primary.main,
              })}
            >
              <ModuleIcon className="h-5 w-5" />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: 17 }}>
                {REPORTS_MODULE_COPY.catalogTitle}
              </Typography>
              <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                {REPORTS_MODULE_COPY.catalogDescription}
              </Typography>
            </Box>
          </Stack>

          {REPORT_CATALOG.map((report) => {
            const ReportIcon = report.icon;

            return (
              <Paper
                key={report.id}
                component={Link}
                href={report.href}
                sx={(theme) => ({
                  display: "block",
                  textDecoration: "none",
                  borderRadius: "22px",
                  p: 2,
                  border: "1px solid",
                  borderColor: alpha(theme.palette.divider, 0.74),
                  backgroundColor: alpha(theme.palette.background.paper, 0.92),
                  color: "inherit",
                  transition:
                    "transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
                  "&:hover": {
                    transform: "translateY(-1px)",
                    borderColor: alpha(theme.palette.primary.main, 0.32),
                    boxShadow: `0 10px 24px ${alpha(theme.palette.primary.main, 0.1)}`,
                  },
                })}
              >
                <Stack spacing={1.35}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    spacing={1}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={(theme) => ({
                          width: 38,
                          height: 38,
                          borderRadius: "12px",
                          display: "grid",
                          placeItems: "center",
                          backgroundColor: alpha(theme.palette.success.main, 0.12),
                          color: theme.palette.success.dark,
                        })}
                      >
                        <ReportIcon className="h-4.5 w-4.5" />
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 800, fontSize: 15.5 }}>
                          {report.label}
                        </Typography>
                        <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                          {report.shortDescription}
                        </Typography>
                      </Box>
                    </Stack>
                  </Stack>

                  <Typography sx={{ color: "text.secondary", fontSize: 13.5 }}>
                    {report.purpose}
                  </Typography>

                  <Stack spacing={0.4}>
                    {report.questions.map((question) => (
                      <Typography
                        key={question}
                        sx={{ color: "text.secondary", fontSize: 12.75 }}
                      >
                        {question}
                      </Typography>
                    ))}
                  </Stack>

                  <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                    {report.tags.map((tag) => (
                      <Chip key={tag} size="small" variant="outlined" label={tag} />
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      </Paper>
    </Stack>
  );
}
