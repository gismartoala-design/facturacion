"use client";

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

type PageLoadingStateProps = {
  message: string;
  fullScreen?: boolean;
  centered?: boolean;
  minHeight?: string | number;
  size?: number;
};

export function PageLoadingState({
  message,
  fullScreen = false,
  centered = false,
  minHeight,
  size = 18,
}: PageLoadingStateProps) {
  if (fullScreen || centered) {
    return (
      <Box
        sx={{
          minHeight: fullScreen ? "100vh" : (minHeight ?? "55vh"),
          display: "grid",
          placeItems: "center",
          px: 2,
          py: 4,
          backgroundColor: fullScreen ? "background.default" : "transparent",
        }}
      >
        <Paper sx={{ px: 4, py: 3, borderRadius: "24px" }}>
          <Stack spacing={1.5} alignItems="center">
            <CircularProgress size={size} thickness={5} />
            <Typography color="text.secondary">{message}</Typography>
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        borderRadius: "20px",
        border: "1px solid rgba(226, 232, 240, 1)",
        p: 2,
        color: "text.secondary",
      }}
    >
      <CircularProgress size={size} thickness={5} />
      <Typography>{message}</Typography>
    </Paper>
  );
}
