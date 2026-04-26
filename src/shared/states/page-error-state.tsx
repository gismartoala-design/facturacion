"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

type PageErrorStateProps = {
  message: string;
  title?: string;
  fullScreen?: boolean;
  minHeight?: string | number;
  onRetry?: () => void;
  retryLabel?: string;
};

export function PageErrorState({
  message,
  title,
  fullScreen = false,
  minHeight,
  onRetry,
  retryLabel = "Reintentar",
}: PageErrorStateProps) {
  if (fullScreen) {
    return (
      <Box
        sx={{
          minHeight: minHeight ?? "100vh",
          display: "grid",
          placeItems: "center",
          p: 3,
          backgroundColor: "background.default",
        }}
      >
        <Paper sx={{ maxWidth: 520, p: 4, borderRadius: "24px" }}>
          <Stack spacing={2}>
            {title ? (
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {title}
              </Typography>
            ) : null}
            <Alert severity="error" variant="outlined" sx={{ borderRadius: "16px" }}>
              {message}
            </Alert>
            {onRetry ? (
              <Button variant="contained" onClick={onRetry}>
                {retryLabel}
              </Button>
            ) : null}
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <Paper sx={{ borderRadius: "20px", p: 2.5 }}>
      <Stack spacing={2}>
        {title ? (
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
        ) : null}
        <Alert severity="error" variant="outlined" sx={{ borderRadius: "16px" }}>
          {message}
        </Alert>
        {onRetry ? (
          <Box>
            <Button variant="contained" onClick={onRetry}>
              {retryLabel}
            </Button>
          </Box>
        ) : null}
      </Stack>
    </Paper>
  );
}
