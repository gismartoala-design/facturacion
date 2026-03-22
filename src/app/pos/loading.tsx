import { Box, Paper, Stack, Typography } from "@mui/material";
import { Loader2 } from "lucide-react";

export default function PosLoading() {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          backgroundColor: "background.default",
        }}
      >
        <Paper sx={{ px: 4, py: 3, borderRadius: "24px" }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Loader2 className="h-5 w-5 animate-spin" />
            <Typography>Cargando modulo POS...</Typography>
          </Stack>
        </Paper>
      </Box>
    );
}
