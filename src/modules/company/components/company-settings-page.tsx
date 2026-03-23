"use client";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { Save } from "lucide-react";
import { useEffect, useState, type SyntheticEvent } from "react";

import type { PosPolicyEditorValue } from "@/modules/pos/policies/pos-policy-editor";
import { fetchJson } from "@/shared/dashboard/api";

type CompanySettingsPageProps = {
  canEdit: boolean;
};

type BusinessSettingsResponse = {
  id: string;
  name: string;
  legalName: string | null;
  ruc: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxProfile: {
    profileType: string;
    requiresElectronicBilling: boolean;
    allowsSalesNote: boolean;
    accountingRequired: boolean;
    environment: string;
    taxNotes: string | null;
    issuerId: string | null;
  } | null;
  documentIssuers: Array<{
    id: string;
    code: string;
    name: string;
    legalName: string | null;
    ruc: string | null;
    environment: string;
    active: boolean;
    series: Array<{
      id: string;
      documentType: string;
      establishmentCode: string;
      emissionPointCode: string;
      nextSequence: number;
      active: boolean;
    }>;
  }>;
  posPolicy: PosPolicyEditorValue;
};

type FormState = {
  name: string;
  legalName: string;
  ruc: string;
  phone: string;
  email: string;
  address: string;
  profileType: string;
  requiresElectronicBilling: boolean;
  allowsSalesNote: boolean;
  accountingRequired: boolean;
  environment: string;
  taxNotes: string;
  issuerCode: string;
  issuerName: string;
  invoiceEstablishmentCode: string;
  invoiceEmissionPointCode: string;
  invoiceNextSequence: number;
  posPolicyPack: PosPolicyEditorValue["policyPack"];
  trackInventoryOnSale: boolean;
};

type SnackbarState = {
  tone: "success" | "error";
  text: string;
} | null;

const DEFAULT_FORM: FormState = {
  name: "",
  legalName: "",
  ruc: "",
  phone: "",
  email: "",
  address: "",
  profileType: "GENERAL",
  requiresElectronicBilling: true,
  allowsSalesNote: false,
  accountingRequired: false,
  environment: "PRUEBAS",
  taxNotes: "",
  issuerCode: "MAIN",
  issuerName: "",
  invoiceEstablishmentCode: "001",
  invoiceEmissionPointCode: "001",
  invoiceNextSequence: 1,
  posPolicyPack: "POS_GENERIC",
  trackInventoryOnSale: true,
};

const PROFILE_OPTIONS = [
  { value: "GENERAL", label: "General" },
  { value: "RIMPE_NEGOCIO_POPULAR", label: "RIMPE Negocio Popular" },
  { value: "RIMPE_EMPRENDEDOR", label: "RIMPE Emprendedor" },
  { value: "OTRO", label: "Otro" },
];

const ENVIRONMENT_OPTIONS = [
  { value: "PRUEBAS", label: "Pruebas" },
  { value: "PRODUCCION", label: "Produccion" },
];

function toFormState(data: BusinessSettingsResponse): FormState {
  const defaultIssuer = data.documentIssuers.find(
    (issuer) => issuer.id === data.taxProfile?.issuerId,
  ) ?? data.documentIssuers[0];
  const defaultInvoiceSeries = defaultIssuer?.series.find(
    (series) => series.documentType === "INVOICE" && series.active,
  );

  return {
    name: data.name ?? "",
    legalName: data.legalName ?? "",
    ruc: data.ruc ?? "",
    phone: data.phone ?? "",
    email: data.email ?? "",
    address: data.address ?? "",
    profileType: data.taxProfile?.profileType ?? "GENERAL",
    requiresElectronicBilling:
      data.taxProfile?.requiresElectronicBilling ?? true,
    allowsSalesNote: data.taxProfile?.allowsSalesNote ?? false,
    accountingRequired: data.taxProfile?.accountingRequired ?? false,
    environment: data.taxProfile?.environment ?? "PRUEBAS",
    taxNotes: data.taxProfile?.taxNotes ?? "",
    issuerCode: defaultIssuer?.code ?? "MAIN",
    issuerName: defaultIssuer?.name ?? data.name ?? "",
    invoiceEstablishmentCode:
      defaultInvoiceSeries?.establishmentCode ?? "001",
    invoiceEmissionPointCode:
      defaultInvoiceSeries?.emissionPointCode ?? "001",
    invoiceNextSequence: defaultInvoiceSeries?.nextSequence ?? 1,
    posPolicyPack: data.posPolicy.policyPack,
    trackInventoryOnSale: data.posPolicy.trackInventoryOnSale,
  };
}

export function CompanySettingsPage({ canEdit }: CompanySettingsPageProps) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);

  useEffect(() => {
    let mounted = true;

    async function loadBusiness() {
      try {
        const data = await fetchJson<BusinessSettingsResponse>("/api/v1/business");
        if (!mounted) return;
        setForm(toFormState(data));
      } catch (error) {
        if (!mounted) return;
        setSnackbar({
          tone: "error",
          text:
            error instanceof Error
              ? error.message
              : "No se pudo cargar la compania",
        });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadBusiness();

    return () => {
      mounted = false;
    };
  }, []);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) {
      return;
    }

    setSaving(true);

    try {
      const {
        posPolicyPack,
        trackInventoryOnSale,
        ...rest
      } = form;
      const payload = {
        ...rest,
        posPolicy: {
          policyPack: posPolicyPack,
          trackInventoryOnSale,
        },
      };
      const data = await fetchJson<BusinessSettingsResponse>("/api/v1/business", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setForm(toFormState(data));
      setSnackbar({
        tone: "success",
        text: "Datos de la compania actualizados correctamente",
      });
    } catch (error) {
      setSnackbar({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "No se pudo guardar la compania",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleCloseSnackbar(_: Event | SyntheticEvent, reason?: string) {
    if (reason === "clickaway") {
      return;
    }
    setSnackbar(null);
  }

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "55vh",
          display: "grid",
          placeItems: "center",
          px: 2,
          py: 4,
        }}
      >
        <Stack spacing={1.5} alignItems="center">
          <CircularProgress size={30} />
          <Typography color="text.secondary">
            Cargando configuracion de la compania...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          px: { xs: 2, md: 3 },
          py: { xs: 2, md: 3 },
        }}
      >
        <Stack spacing={2.5}>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontSize: { xs: 28, md: 32 },
                fontWeight: 800,
                letterSpacing: "-0.03em",
              }}
            >
              Mi compania
            </Typography>
            <Typography sx={{ mt: 0.75, color: "text.secondary" }}>
              Configura los datos principales del negocio y su informacion
              tributaria basica.
            </Typography>
          </Box>

          {!canEdit ? (
            <Alert severity="info" variant="outlined" sx={{ borderRadius: "16px" }}>
              Tu usuario no tiene permisos para editar esta configuracion.
            </Alert>
          ) : null}

          <Paper
            sx={{
              borderRadius: "24px",
              borderColor: "divider",
              backgroundColor: alpha(theme.palette.background.paper, 0.96),
              p: { xs: 2, md: 2.5 },
            }}
          >
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Datos de la compania
                </Typography>
                <Typography sx={{ mt: 0.5, color: "text.secondary", fontSize: 14 }}>
                  Informacion comercial visible y de contacto del negocio.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gap: 1.25,
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "repeat(2, minmax(0, 1fr))",
                  },
                }}
              >
                <TextField
                  label="Nombre comercial"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  disabled={!canEdit}
                />
                <TextField
                  label="Razon social"
                  value={form.legalName}
                  onChange={(e) => updateField("legalName", e.target.value)}
                  disabled={!canEdit}
                />
                <TextField
                  label="RUC"
                  value={form.ruc}
                  onChange={(e) => updateField("ruc", e.target.value)}
                  disabled={!canEdit}
                />
                <TextField
                  label="Telefono"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  disabled={!canEdit}
                />
                <TextField
                  label="Correo"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  disabled={!canEdit}
                />
                <TextField
                  label="Direccion"
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  disabled={!canEdit}
                />
              </Box>
            </Stack>
          </Paper>

          <Paper
            sx={{
              borderRadius: "24px",
              borderColor: "divider",
              backgroundColor: alpha(theme.palette.warning.light, 0.12),
              p: { xs: 2, md: 2.5 },
            }}
          >
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Operacion POS
                </Typography>
                <Typography sx={{ mt: 0.5, color: "text.secondary", fontSize: 14 }}>
                  Define el perfil operativo del POS y sus reglas base de venta.
                </Typography>
              </Box>

              <TextField
                select
                label="Perfil POS"
                value={form.posPolicyPack}
                onChange={(e) =>
                  updateField(
                    "posPolicyPack",
                    e.target.value as FormState["posPolicyPack"],
                  )
                }
                disabled={!canEdit}
              >
                <MenuItem value="POS_GENERIC">Generico</MenuItem>
                <MenuItem value="POS_BUTCHERY">Carniceria</MenuItem>
              </TextField>

              <FormControlLabel
                control={
                  <Switch
                    checked={form.trackInventoryOnSale}
                    onChange={(e) =>
                      updateField("trackInventoryOnSale", e.target.checked)
                    }
                    disabled={!canEdit}
                  />
                }
                label="Controlar inventario al vender"
              />

              <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                {form.posPolicyPack === "POS_BUTCHERY"
                  ? "El perfil carniceria activa lectura de peso desde codigo de balanza al escanear productos."
                  : "El perfil generico mantiene un flujo base de POS sin lectura de peso embebido."}
              </Typography>
            </Stack>
          </Paper>

          <Paper
            sx={{
              borderRadius: "24px",
              borderColor: "divider",
              backgroundColor: alpha(theme.palette.primary.light, 0.28),
              p: { xs: 2, md: 2.5 },
            }}
          >
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Datos tributarios
                </Typography>
                <Typography sx={{ mt: 0.5, color: "text.secondary", fontSize: 14 }}>
                  Configuracion basica para facturacion, notas de venta y
                  entorno tributario.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gap: 1.25,
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "repeat(2, minmax(0, 1fr))",
                  },
                }}
              >
                <TextField
                  select
                  label="Perfil tributario"
                  value={form.profileType}
                  onChange={(e) => updateField("profileType", e.target.value)}
                  disabled={!canEdit}
                >
                  {PROFILE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="Ambiente"
                  value={form.environment}
                  onChange={(e) => updateField("environment", e.target.value)}
                  disabled={!canEdit}
                >
                  {ENVIRONMENT_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  multiline
                  minRows={3}
                  label="Observaciones tributarias"
                  value={form.taxNotes}
                  onChange={(e) => updateField("taxNotes", e.target.value)}
                  disabled={!canEdit}
                  sx={{ gridColumn: { md: "1 / -1" } }}
                />
              </Box>

              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={{ xs: 0.5, md: 2 }}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.requiresElectronicBilling}
                      onChange={(e) =>
                        updateField(
                          "requiresElectronicBilling",
                          e.target.checked,
                        )
                      }
                      disabled={!canEdit}
                    />
                  }
                  label="Requiere facturacion electronica"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.allowsSalesNote}
                      onChange={(e) =>
                        updateField("allowsSalesNote", e.target.checked)
                      }
                      disabled={!canEdit}
                    />
                  }
                  label="Permite nota de venta"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.accountingRequired}
                      onChange={(e) =>
                        updateField("accountingRequired", e.target.checked)
                      }
                      disabled={!canEdit}
                    />
                  }
                  label="Obligado a llevar contabilidad"
                />
              </Stack>
            </Stack>
          </Paper>

          <Paper
            sx={{
              borderRadius: "24px",
              borderColor: "divider",
              backgroundColor: alpha(theme.palette.secondary.light, 0.12),
              p: { xs: 2, md: 2.5 },
            }}
          >
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Emision documental
                </Typography>
                <Typography sx={{ mt: 0.5, color: "text.secondary", fontSize: 14 }}>
                  Configura el emisor por defecto y la serie base de facturas
                  que usaran ventas y POS.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gap: 1.25,
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "repeat(2, minmax(0, 1fr))",
                  },
                }}
              >
                <TextField
                  label="Codigo del emisor"
                  value={form.issuerCode}
                  onChange={(e) => updateField("issuerCode", e.target.value)}
                  disabled={!canEdit}
                  helperText="Referencia interna del emisor documental"
                />
                <TextField
                  label="Nombre del emisor"
                  value={form.issuerName}
                  onChange={(e) => updateField("issuerName", e.target.value)}
                  disabled={!canEdit}
                  helperText="Si lo dejas vacio, usa el nombre comercial"
                />
                <TextField
                  label="Establecimiento"
                  value={form.invoiceEstablishmentCode}
                  onChange={(e) =>
                    updateField("invoiceEstablishmentCode", e.target.value)
                  }
                  disabled={!canEdit}
                  helperText="Codigo de 3 digitos"
                />
                <TextField
                  label="Punto de emision"
                  value={form.invoiceEmissionPointCode}
                  onChange={(e) =>
                    updateField("invoiceEmissionPointCode", e.target.value)
                  }
                  disabled={!canEdit}
                  helperText="Codigo de 3 digitos"
                />
                <TextField
                  label="Siguiente secuencia"
                  type="number"
                  value={form.invoiceNextSequence}
                  onChange={(e) =>
                    updateField(
                      "invoiceNextSequence",
                      Math.max(1, Number(e.target.value || "1")),
                    )
                  }
                  disabled={!canEdit}
                  inputProps={{ min: 1, step: 1 }}
                  sx={{ gridColumn: { md: "1 / span 1" } }}
                />
                <Paper
                  variant="outlined"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    px: 1.5,
                    py: 1.25,
                    borderRadius: "16px",
                    backgroundColor: alpha(theme.palette.background.paper, 0.72),
                  }}
                >
                  <Stack spacing={0.35}>
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                      Numero de factura estimado
                    </Typography>
                    <Typography sx={{ fontWeight: 800, letterSpacing: "0.04em" }}>
                      {(form.invoiceEstablishmentCode || "001")}-{(form.invoiceEmissionPointCode || "001")}-{String(
                        form.invoiceNextSequence || 1,
                      ).padStart(9, "0")}
                    </Typography>
                  </Stack>
                </Paper>
              </Box>
            </Stack>
          </Paper>

          <Stack direction="row" justifyContent="flex-end">
            <Button
              type="submit"
              variant="contained"
              startIcon={<Save className="h-4 w-4" />}
              disabled={!canEdit || saving}
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={4200}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {snackbar ? (
          <Alert
            severity={snackbar.tone}
            variant="filled"
            onClose={handleCloseSnackbar}
            sx={{ borderRadius: "16px", minWidth: 320 }}
          >
            {snackbar.text}
          </Alert>
        ) : undefined}
      </Snackbar>
    </>
  );
}
