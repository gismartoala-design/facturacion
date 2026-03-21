"use client";

import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const theme = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string } };
        throw new Error(json.error?.message ?? "Error al iniciar sesion");
      }

      router.replace("/overview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        backgroundColor: "background.default",
        px: 2,
        py: 4,
      }}
    >
      <Box
        aria-hidden
        sx={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at top left, rgba(139,92,246,0.14), transparent 32%), radial-gradient(circle at bottom right, rgba(99,102,241,0.12), transparent 34%)",
        }}
      />

      <Paper
        sx={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 420,
          borderRadius: "28px",
          px: { xs: 3, sm: 4 },
          py: { xs: 3.5, sm: 4.5 },
          borderColor: alpha(theme.palette.divider, 0.9),
          backgroundColor: alpha(theme.palette.background.paper, 0.9),
          backdropFilter: "blur(14px)",
          boxShadow: "0 24px 60px rgba(15,23,42,0.12)",
        }}
      >
        <Stack spacing={3}>
          <Stack spacing={1.25} alignItems="center" textAlign="center">
            <Box
              sx={{
                position: "relative",
                width: 92,
                height: 92,
                overflow: "hidden",
                borderRadius: "28px",
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: alpha(theme.palette.primary.light, 0.55),
                boxShadow: `0 18px 36px ${alpha(theme.palette.primary.main, 0.12)}`,
              }}
            >
              <Image
                src="/logo-original.jpg"
                alt="Logo de ARGSOFT"
                fill
                className="object-cover"
                priority
              />
            </Box>

            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "primary.main",
              }}
            >
              ARGSOFT
            </Typography>

            <Typography
              variant="h4"
              sx={{
                fontSize: { xs: 28, sm: 32 },
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "text.primary",
              }}
            >
              Iniciar sesion
            </Typography>

            <Typography
              sx={{
                maxWidth: 280,
                fontSize: 14,
                color: "text.secondary",
              }}
            >
              Ingresa tus credenciales para continuar al panel operativo.
            </Typography>
          </Stack>

          <Box component="form" onSubmit={onSubmit}>
            <Stack spacing={2}>
              <TextField
                id="email"
                label="Correo electronico"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@empresa.com"
              />

              <TextField
                id="password"
                label="Contrasena"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />

              {error ? (
                <Alert severity="error" variant="filled" sx={{ borderRadius: "16px" }}>
                  {error}
                </Alert>
              ) : null}

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  minHeight: 48,
                  borderRadius: "16px",
                  fontSize: 15,
                }}
              >
                {loading ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Ingresando...</span>
                  </Stack>
                ) : (
                  "Ingresar"
                )}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
