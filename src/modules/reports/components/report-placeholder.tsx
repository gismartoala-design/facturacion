import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

type ReportPlaceholderProps = {
  title: string;
  description: string;
  nextScope: string[];
};

export function ReportPlaceholder({
  title,
  description,
  nextScope,
}: ReportPlaceholderProps) {
  return (
    <Paper
      sx={{
        borderRadius: "24px",
        border: "1px dashed rgba(148, 163, 184, 0.5)",
        px: { xs: 2, sm: 3 },
        py: { xs: 2.5, sm: 3 },
      }}
    >
      <Stack spacing={1.1}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: "#1e293b" }}>
          {title}
        </Typography>
        <Typography sx={{ color: "#475569", maxWidth: 820 }}>
          {description}
        </Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>
          Siguiente alcance previsto
        </Typography>
        {nextScope.map((item) => (
          <Typography key={item} sx={{ fontSize: 13, color: "#64748b" }}>
            {item}
          </Typography>
        ))}
      </Stack>
    </Paper>
  );
}
