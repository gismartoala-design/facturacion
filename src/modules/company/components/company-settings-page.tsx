"use client";

import {
  Alert,
  Box,
  Button,
  Chip,
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
import { Save, Upload } from "lucide-react";
import { useEffect, useState, type ChangeEvent, type SyntheticEvent } from "react";

import type { BusinessBlueprint } from "@/core/platform/business-blueprint";
import {
  CAPABILITY_CATALOG,
  EDITION_CATALOG,
  MODULE_CATALOG,
  POLICY_PACK_CATALOG,
} from "@/core/platform/catalog";
import { normalizeBusinessBlueprint } from "@/core/platform/composition";
import type {
  CapabilityKey,
  ModuleKey,
  PolicyPackKey,
} from "@/core/platform/contracts";
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
  logoUrl: string | null;
  blueprint: BusinessBlueprint;
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
  blueprint: BusinessBlueprint;
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
  blueprint: {
    modules: [],
    edition: "STARTER",
    policyPacks: [],
    capabilities: [],
  },
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
    blueprint: normalizeBusinessBlueprint(data.blueprint),
  };
}

async function convertImageToPng(file: File) {
  if (file.type === "image/png") {
    return file;
  }

  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () =>
        reject(new Error("No se pudo leer la imagen seleccionada"));
      nextImage.src = imageUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("No se pudo preparar la conversion del logo");
    }

    context.drawImage(image, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });

    if (!blob) {
      throw new Error("No se pudo convertir el logo a PNG");
    }

    return new File([blob], "logo.png", { type: "image/png" });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export function CompanySettingsPage({ canEdit }: CompanySettingsPageProps) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);

  function applyBusinessSettings(data: BusinessSettingsResponse) {
    setForm(toFormState(data));
    setLogoUrl(data.logoUrl);
  }

  useEffect(() => {
    let mounted = true;

    async function loadBusiness() {
      try {
        const data = await fetchJson<BusinessSettingsResponse>("/api/v1/business");
        if (!mounted) return;
        applyBusinessSettings(data);
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

  function updateBlueprint(
    updater: (current: BusinessBlueprint) => BusinessBlueprint,
  ) {
    setForm((current) => ({
      ...current,
      blueprint: normalizeBusinessBlueprint(updater(current.blueprint)),
    }));
  }

  function toggleBlueprintValue<T extends string>(
    values: readonly T[],
    value: T,
    enabled: boolean,
  ) {
    if (enabled) {
      return Array.from(new Set([...values, value]));
    }

    return values.filter((currentValue) => currentValue !== value);
  }

  function handleModuleToggle(moduleKey: ModuleKey, enabled: boolean) {
    updateBlueprint((current) => ({
      ...current,
      modules: toggleBlueprintValue(current.modules, moduleKey, enabled),
    }));
  }

  function handlePolicyPackToggle(
    policyPackKey: PolicyPackKey,
    enabled: boolean,
  ) {
    updateBlueprint((current) => ({
      ...current,
      policyPacks: toggleBlueprintValue(
        current.policyPacks,
        policyPackKey,
        enabled,
      ),
    }));
  }

  function handleCapabilityToggle(
    capabilityKey: CapabilityKey,
    enabled: boolean,
  ) {
    updateBlueprint((current) => ({
      ...current,
      capabilities: toggleBlueprintValue(
        current.capabilities,
        capabilityKey,
        enabled,
      ),
    }));
  }

  async function handleLogoSelected(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!canEdit) {
      setSnackbar({
        tone: "error",
        text: "Tu usuario no tiene permisos para actualizar el logo",
      });
      return;
    }

    setLogoUploading(true);

    try {
      const pngFile = await convertImageToPng(file);
      const body = new FormData();
      body.set("file", pngFile);

      const response = await fetch("/api/v1/business/logo", {
        method: "PUT",
        body,
      });
      const payload = (await response.json()) as {
        success: boolean;
        data?: { logoUrl: string };
        error?: { message: string };
      };

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error?.message || "No se pudo subir el logo");
      }

      setLogoUrl(payload.data.logoUrl);
      setSnackbar({
        tone: "success",
        text: "Logo actualizado correctamente",
      });
    } catch (error) {
      setSnackbar({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el logo",
      });
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) {
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
      };
      const data = await fetchJson<BusinessSettingsResponse>("/api/v1/business", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      applyBusinessSettings(data);
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

  function modulesSatisfied(requiredModules: readonly ModuleKey[]) {
    return requiredModules.every((moduleKey) =>
      form.blueprint.modules.includes(moduleKey),
    );
  }

  function renderChipList<T extends string>(
    values: readonly T[],
    catalog: Record<T, { label: string }>,
    emptyText: string,
  ) {
    if (!values.length) {
      return (
        <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
          {emptyText}
        </Typography>
      );
    }

    return (
      <Stack direction="row" flexWrap="wrap" useFlexGap gap={1}>
        {values.map((value) => (
          <Chip
            key={value}
            label={catalog[value]?.label ?? value}
            size="small"
            variant="outlined"
          />
        ))}
      </Stack>
    );
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
              backgroundColor: alpha(theme.palette.info.light, 0.16),
              p: { xs: 2, md: 2.5 },
            }}
          >
            <Stack
              spacing={2}
              direction={{ xs: "column", md: "row" }}
              alignItems={{ xs: "stretch", md: "center" }}
              justifyContent="space-between"
            >
              <Stack spacing={0.75}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Logo del negocio
                </Typography>
                <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
                  Se usara en cotizaciones, impresos y vistas administrativas.
                </Typography>
              </Stack>

              <Button
                component="label"
                variant="outlined"
                startIcon={<Upload className="h-4 w-4" />}
                disabled={!canEdit || logoUploading}
              >
                {logoUploading ? "Subiendo..." : "Cargar logo"}
                <input
                  hidden
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoSelected}
                />
              </Button>
            </Stack>

            <Paper
              variant="outlined"
              sx={{
                mt: 2,
                minHeight: 180,
                borderRadius: "20px",
                borderStyle: "dashed",
                display: "grid",
                placeItems: "center",
                overflow: "hidden",
                backgroundColor: alpha(theme.palette.background.paper, 0.82),
              }}
            >
              {logoUrl ? (
                <Box
                  component="img"
                  src={logoUrl}
                  alt="Logo del negocio"
                  sx={{
                    maxWidth: "100%",
                    maxHeight: 160,
                    objectFit: "contain",
                    p: 2,
                  }}
                />
              ) : (
                <Stack spacing={0.75} alignItems="center" sx={{ p: 3 }}>
                  <Typography sx={{ fontWeight: 700 }}>
                    Sin logo cargado
                  </Typography>
                  <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                    Puedes subir PNG, JPG o WEBP. Se convertira a PNG para usarlo en el sistema.
                  </Typography>
                </Stack>
              )}
            </Paper>
          </Paper>

          <Paper
            sx={{
              borderRadius: "24px",
              borderColor: "divider",
              backgroundColor: alpha(theme.palette.success.light, 0.14),
              p: { xs: 2, md: 2.5 },
            }}
          >
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Composition Blueprint
                </Typography>
                <Typography sx={{ mt: 0.5, color: "text.secondary", fontSize: 14 }}>
                  Configura la plataforma como piezas: modulos, edicion,
                  policy packs y capabilities.
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
                  label="Edicion de plataforma"
                  value={form.blueprint.edition}
                  onChange={(e) =>
                    updateBlueprint((current) => ({
                      ...current,
                      edition: e.target.value as BusinessBlueprint["edition"],
                    }))
                  }
                  disabled={!canEdit}
                >
                  {Object.entries(EDITION_CATALOG).map(([value, config]) => (
                    <MenuItem key={value} value={value}>
                      {config.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              <Paper
                variant="outlined"
                sx={{
                  borderRadius: "18px",
                  backgroundColor: alpha(theme.palette.background.paper, 0.72),
                  p: 1.5,
                }}
              >
                <Stack spacing={1.5}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Modulos
                  </Typography>
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
                    {Object.entries(MODULE_CATALOG).map(([value, config]) => (
                      <FormControlLabel
                        key={value}
                        control={
                          <Switch
                            checked={form.blueprint.modules.includes(value as ModuleKey)}
                            onChange={(e) =>
                              handleModuleToggle(
                                value as ModuleKey,
                                e.target.checked,
                              )
                            }
                            disabled={!canEdit}
                          />
                        }
                        label={
                          <Stack spacing={0.2}>
                            <Typography>{config.label}</Typography>
                            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                              {config.description}
                            </Typography>
                          </Stack>
                        }
                      />
                    ))}
                  </Box>
                </Stack>
              </Paper>

              <Paper
                variant="outlined"
                sx={{
                  borderRadius: "18px",
                  backgroundColor: alpha(theme.palette.background.paper, 0.72),
                  p: 1.5,
                }}
              >
                <Stack spacing={1.5}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Policy Packs
                  </Typography>
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
                    {Object.entries(POLICY_PACK_CATALOG).map(([value, config]) => {
                      const disabled =
                        !canEdit || !modulesSatisfied(config.requiresModules);

                      return (
                        <FormControlLabel
                          key={value}
                          control={
                            <Switch
                              checked={form.blueprint.policyPacks.includes(
                                value as PolicyPackKey,
                              )}
                              onChange={(e) =>
                                handlePolicyPackToggle(
                                  value as PolicyPackKey,
                                  e.target.checked,
                                )
                              }
                              disabled={disabled}
                            />
                          }
                          label={
                            <Stack spacing={0.2}>
                              <Typography>{config.label}</Typography>
                              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                                {config.description}
                              </Typography>
                            </Stack>
                          }
                        />
                      );
                    })}
                  </Box>
                </Stack>
              </Paper>

              <Paper
                variant="outlined"
                sx={{
                  borderRadius: "18px",
                  backgroundColor: alpha(theme.palette.background.paper, 0.72),
                  p: 1.5,
                }}
              >
                <Stack spacing={1.5}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Capabilities
                  </Typography>
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
                    {Object.entries(CAPABILITY_CATALOG).map(([value, config]) => {
                      const disabled =
                        !canEdit || !modulesSatisfied(config.requiresModules);

                      return (
                        <FormControlLabel
                          key={value}
                          control={
                            <Switch
                              checked={form.blueprint.capabilities.includes(
                                value as CapabilityKey,
                              )}
                              onChange={(e) =>
                                handleCapabilityToggle(
                                  value as CapabilityKey,
                                  e.target.checked,
                                )
                              }
                              disabled={disabled}
                            />
                          }
                          label={
                            <Stack spacing={0.2}>
                              <Typography>{config.label}</Typography>
                              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                                {config.description}
                              </Typography>
                            </Stack>
                          }
                        />
                      );
                    })}
                  </Box>
                </Stack>
              </Paper>

              <Paper
                variant="outlined"
                sx={{
                  borderRadius: "18px",
                  backgroundColor: alpha(theme.palette.background.paper, 0.84),
                  p: 1.5,
                }}
              >
                <Stack spacing={1.5}>
                  <Box>
                    <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 0.75 }}>
                      Modulos actuales
                    </Typography>
                    {renderChipList(
                      form.blueprint.modules,
                      MODULE_CATALOG,
                      "Todavia no hay modulos activos en el blueprint.",
                    )}
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 0.75 }}>
                      Policy packs actuales
                    </Typography>
                    {renderChipList(
                      form.blueprint.policyPacks,
                      POLICY_PACK_CATALOG,
                      "Todavia no hay policy packs configurados.",
                    )}
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 0.75 }}>
                      Capabilities actuales
                    </Typography>
                    {renderChipList(
                      form.blueprint.capabilities,
                      CAPABILITY_CATALOG,
                      "Todavia no hay capabilities activas.",
                    )}
                  </Box>
                </Stack>
              </Paper>
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
