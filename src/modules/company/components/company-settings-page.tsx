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
import {
  ArrowRight,
  BarChart3,
  ChefHat,
  PackageSearch,
  Save,
  Upload,
} from "lucide-react";
import Link from "next/link";
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

const PLATFORM_BLUEPRINT_PRESETS: Array<{
  key: string;
  title: string;
  description: string;
  blueprint: BusinessBlueprint;
}> = [
  {
    key: "retail",
    title: "Retail base",
    description:
      "POS generico con inventario operativo para mostrador o caja simple.",
    blueprint: {
      modules: ["POS", "INVENTORY"],
      edition: "STARTER",
      policyPacks: ["POS_GENERIC"],
      capabilities: ["POS_TRACK_INVENTORY_ON_SALE"],
    },
  },
  {
    key: "butchery",
    title: "Carniceria",
    description:
      "Preset base para balanza, lectura de peso y control operativo en POS.",
    blueprint: {
      modules: ["POS", "INVENTORY", "BILLING"],
      edition: "STARTER",
      policyPacks: ["POS_BUTCHERY"],
      capabilities: [
        "POS_SCALE_BARCODES",
        "POS_WEIGHT_FROM_BARCODE",
        "POS_TRACK_INVENTORY_ON_SALE",
      ],
    },
  },
  {
    key: "restaurant",
    title: "Restaurante",
    description:
      "Habilita mesas, cocina, takeout, delivery, caja e inventario por receta.",
    blueprint: {
      modules: ["POS", "BILLING", "REPORTS", "CASH_MANAGEMENT", "INVENTORY"],
      edition: "GROWTH",
      policyPacks: ["POS_RESTAURANT"],
      capabilities: [
        "POS_TABLE_SERVICE",
        "POS_KITCHEN_TICKETS",
        "POS_KITCHEN_DISPLAY",
        "POS_TAKEOUT_ORDERS",
        "POS_DELIVERY_ORDERS",
        "POS_SPLIT_BILL",
        "POS_TRANSFER_TABLES",
        "POS_MERGE_TABLES",
        "INVENTORY_RECIPE_CONSUMPTION",
        "INVENTORY_PREP_PRODUCTION",
      ],
    },
  },
];

const CAPABILITY_GROUPS: Array<{
  title: string;
  description: string;
  capabilities: CapabilityKey[];
}> = [
  {
    title: "POS base",
    description: "Capacidades operativas generales del punto de venta.",
    capabilities: [
      "POS_TRACK_INVENTORY_ON_SALE",
      "POS_SCALE_BARCODES",
      "POS_WEIGHT_FROM_BARCODE",
    ],
  },
  {
    title: "Restaurante / salon",
    description: "Atencion de mesa, divisiones y movimientos operativos.",
    capabilities: [
      "POS_TABLE_SERVICE",
      "POS_SPLIT_BILL",
      "POS_TRANSFER_TABLES",
      "POS_MERGE_TABLES",
    ],
  },
  {
    title: "Restaurante / canales",
    description: "Operaciones sin mesa fisica o con despacho interno.",
    capabilities: ["POS_TAKEOUT_ORDERS", "POS_DELIVERY_ORDERS"],
  },
  {
    title: "Restaurante / cocina",
    description: "Tickets impresos y visibilidad KDS por estacion.",
    capabilities: ["POS_KITCHEN_TICKETS", "POS_KITCHEN_DISPLAY"],
  },
  {
    title: "Restaurante / inventario",
    description: "Consumo de receta y mise en place para operacion real.",
    capabilities: [
      "INVENTORY_RECIPE_CONSUMPTION",
      "INVENTORY_PREP_PRODUCTION",
    ],
  },
  {
    title: "Caja",
    description: "Reglas operativas y controles de sesion de caja.",
    capabilities: [
      "CASH_SESSION_REQUIRED",
      "CASH_DECLARED_CLOSING",
      "CASH_WITHDRAWALS",
      "CASH_DEPOSITS",
      "CASH_SHIFT_RECONCILIATION",
      "CASH_BLIND_CLOSE",
      "CASH_APPROVAL_CLOSE",
    ],
  },
  {
    title: "Control y auditoria",
    description: "Trazabilidad y aprobaciones para escenarios formales.",
    capabilities: ["AUDIT_LOG", "APPROVAL_FLOWS"],
  },
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

  function mergeModules(
    values: readonly ModuleKey[],
    requiredModules: readonly ModuleKey[],
  ) {
    return Array.from(new Set([...values, ...requiredModules]));
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
    updateBlueprint((current) => {
      if (!enabled) {
        return {
          ...current,
          policyPacks: toggleBlueprintValue(
            current.policyPacks,
            policyPackKey,
            false,
          ),
        };
      }

      const nextModules = mergeModules(
        current.modules,
        POLICY_PACK_CATALOG[policyPackKey].requiresModules,
      );
      const nextPolicyPacks = current.policyPacks.filter(
        (currentValue) =>
          !(
            currentValue.startsWith("POS_") && policyPackKey.startsWith("POS_")
          ),
      );

      return {
        ...current,
        modules: nextModules,
        policyPacks: toggleBlueprintValue(nextPolicyPacks, policyPackKey, true),
      };
    });
  }

  function handleCapabilityToggle(
    capabilityKey: CapabilityKey,
    enabled: boolean,
  ) {
    updateBlueprint((current) => ({
      ...current,
      modules: enabled
        ? mergeModules(
            current.modules,
            CAPABILITY_CATALOG[capabilityKey].requiresModules,
          )
        : current.modules,
      capabilities: toggleBlueprintValue(
        current.capabilities,
        capabilityKey,
        enabled,
      ),
    }));
  }

  function applyBlueprintPreset(blueprint: BusinessBlueprint) {
    updateBlueprint(() => blueprint);
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

  const groupedCapabilities = new Set(
    CAPABILITY_GROUPS.flatMap((group) => group.capabilities),
  );
  const otherCapabilities = (Object.keys(CAPABILITY_CATALOG) as CapabilityKey[]).filter(
    (capability) => !groupedCapabilities.has(capability),
  );
  const restaurantPresetActive = form.blueprint.policyPacks.includes(
    "POS_RESTAURANT",
  );
  const restaurantConfigStatus = [
    {
      title: "Salon y mesas",
      enabled: form.blueprint.capabilities.includes("POS_TABLE_SERVICE"),
      detail: "Apertura de mesas, sesiones activas y servicio en salon.",
    },
    {
      title: "Cocina hibrida",
      enabled:
        form.blueprint.capabilities.includes("POS_KITCHEN_TICKETS") &&
        form.blueprint.capabilities.includes("POS_KITCHEN_DISPLAY"),
      detail: "Tickets por estacion y tablero KDS para seguimiento.",
    },
    {
      title: "Canales takeout y delivery",
      enabled:
        form.blueprint.capabilities.includes("POS_TAKEOUT_ORDERS") &&
        form.blueprint.capabilities.includes("POS_DELIVERY_ORDERS"),
      detail: "Pedidos sin mesa y despacho interno sobre la misma orden.",
    },
    {
      title: "Cierre y division de cuenta",
      enabled: form.blueprint.capabilities.includes("POS_SPLIT_BILL"),
      detail: "Liquidaciones parciales, multiples ventas y pagos mixtos.",
    },
    {
      title: "Inventario por receta",
      enabled:
        form.blueprint.capabilities.includes("INVENTORY_RECIPE_CONSUMPTION") &&
        form.blueprint.modules.includes("INVENTORY"),
      detail: "Descarga de insumos al enviar a cocina, no al cobrar.",
    },
  ];
  const restaurantChecklist = [
    {
      title: "Marcar productos visibles para restaurante",
      done: form.blueprint.modules.includes("INVENTORY"),
      detail:
        "Configura categoria, estacion y visibilidad del menu desde Productos.",
    },
    {
      title: "Activar flujo de cocina",
      done:
        form.blueprint.capabilities.includes("POS_KITCHEN_TICKETS") ||
        form.blueprint.capabilities.includes("POS_KITCHEN_DISPLAY"),
      detail:
        "Sin cocina activa podras tomar ordenes, pero no operar tandas ni estaciones.",
    },
    {
      title: "Configurar consumo de inventario",
      done: form.blueprint.capabilities.includes("INVENTORY_RECIPE_CONSUMPTION"),
      detail:
        "Necesario para descargar recetas y preparar mise en place real.",
    },
    {
      title: "Habilitar caja y cobro formal",
      done:
        form.blueprint.modules.includes("CASH_MANAGEMENT") &&
        form.blueprint.modules.includes("BILLING"),
      detail:
        "Permite operar caja, cierres y emision documental al liquidar la orden.",
    },
  ];
  const restaurantQuickActions = [
    {
      title: "Operar POS restaurante",
      caption: "Abrir mesas, tomar ordenes y enviar tandas a cocina.",
      href: "/pos",
      icon: ChefHat,
    },
    {
      title: "Configurar menu",
      caption: "Ajustar productos, categorias y datos operativos del menu.",
      href: "/inventory/products",
      icon: PackageSearch,
    },
    {
      title: "Revisar inventario",
      caption: "Validar stock, recetas y preproduccion sobre inventario real.",
      href: "/inventory/inventory-adjustment",
      icon: PackageSearch,
    },
    {
      title: "Monitorear reportes",
      caption: "Ver lectura operativa y cierres del negocio.",
      href: "/reports",
      icon: BarChart3,
    },
  ];

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
                  policy packs y capabilities. Al activar una pieza, el sistema
                  incorpora sus modulos requeridos.
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
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Presets de composicion
                    </Typography>
                    <Typography sx={{ color: "text.secondary", fontSize: 13, mt: 0.4 }}>
                      Cargan una base recomendada y luego puedes ajustar el blueprint manualmente.
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "grid",
                      gap: 1.25,
                      gridTemplateColumns: {
                        xs: "1fr",
                        md: "repeat(3, minmax(0, 1fr))",
                      },
                    }}
                  >
                    {PLATFORM_BLUEPRINT_PRESETS.map((preset) => (
                      <Paper
                        key={preset.key}
                        variant="outlined"
                        sx={{
                          borderRadius: "16px",
                          p: 1.5,
                          backgroundColor: alpha(theme.palette.background.paper, 0.68),
                        }}
                      >
                        <Stack spacing={1.25}>
                          <Box>
                            <Typography sx={{ fontWeight: 700 }}>
                              {preset.title}
                            </Typography>
                            <Typography sx={{ color: "text.secondary", fontSize: 12, mt: 0.35 }}>
                              {preset.description}
                            </Typography>
                          </Box>
                          <Button
                            variant="outlined"
                            size="small"
                            disabled={!canEdit}
                            onClick={() => applyBlueprintPreset(preset.blueprint)}
                          >
                            Aplicar preset
                          </Button>
                        </Stack>
                      </Paper>
                    ))}
                  </Box>
                </Stack>
              </Paper>

              {restaurantPresetActive ? (
                <Stack spacing={1.5}>
                  <Alert severity="success" variant="outlined" sx={{ borderRadius: "18px" }}>
                    Restaurante activo en el blueprint. El POS resolvera mesas, cocina,
                    takeout, delivery y consumo de inventario por receta cuando las
                    capabilities correspondientes esten encendidas.
                  </Alert>

                  <Paper
                    variant="outlined"
                    sx={{
                      borderRadius: "18px",
                      backgroundColor: alpha(theme.palette.background.paper, 0.76),
                      p: 1.5,
                    }}
                  >
                    <Stack spacing={1.5}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          Configuracion restaurante
                        </Typography>
                        <Typography sx={{ fontSize: 13, color: "text.secondary", mt: 0.35 }}>
                          Este bloque resume el runtime operativo del vertical y te lleva a
                          los lugares donde terminas la parametrizacion real.
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
                        {restaurantConfigStatus.map((item) => (
                          <Paper
                            key={item.title}
                            variant="outlined"
                            sx={{
                              borderRadius: "16px",
                              p: 1.25,
                              backgroundColor: alpha(theme.palette.background.paper, 0.62),
                            }}
                          >
                            <Stack spacing={0.9}>
                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                                justifyContent="space-between"
                              >
                                <Typography sx={{ fontWeight: 700 }}>
                                  {item.title}
                                </Typography>
                                <Chip
                                  size="small"
                                  color={item.enabled ? "success" : "default"}
                                  variant={item.enabled ? "filled" : "outlined"}
                                  label={item.enabled ? "Activo" : "Pendiente"}
                                />
                              </Stack>
                              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                                {item.detail}
                              </Typography>
                            </Stack>
                          </Paper>
                        ))}
                      </Box>

                      <Paper
                        variant="outlined"
                        sx={{
                          borderRadius: "16px",
                          p: 1.25,
                          backgroundColor: alpha(theme.palette.warning.light, 0.12),
                        }}
                      >
                        <Stack spacing={1}>
                          <Typography sx={{ fontWeight: 700 }}>
                            Checklist de salida operativa
                          </Typography>
                          {restaurantChecklist.map((item) => (
                            <Stack
                              key={item.title}
                              direction="row"
                              spacing={1}
                              alignItems="flex-start"
                              justifyContent="space-between"
                            >
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                                  {item.title}
                                </Typography>
                                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                                  {item.detail}
                                </Typography>
                              </Box>
                              <Chip
                                size="small"
                                color={item.done ? "success" : "warning"}
                                variant={item.done ? "filled" : "outlined"}
                                label={item.done ? "Listo" : "Falta"}
                              />
                            </Stack>
                          ))}
                        </Stack>
                      </Paper>

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
                        {restaurantQuickActions.map((action) => {
                          const Icon = action.icon;

                          return (
                            <Button
                              key={action.href}
                              component={Link}
                              href={action.href}
                              variant="outlined"
                              sx={{
                                justifyContent: "space-between",
                                borderRadius: "16px",
                                px: 2,
                                py: 1.5,
                              }}
                            >
                              <Stack direction="row" spacing={1.25} alignItems="center">
                                <Icon className="h-4 w-4" />
                                <Stack spacing={0.15} alignItems="flex-start">
                                  <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                                    {action.title}
                                  </Typography>
                                  <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                                    {action.caption}
                                  </Typography>
                                </Stack>
                              </Stack>
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          );
                        })}
                      </Box>
                    </Stack>
                  </Paper>
                </Stack>
              ) : null}

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
                      const missingModules = config.requiresModules.filter(
                        (moduleKey) => !form.blueprint.modules.includes(moduleKey),
                      );
                      const disabled = !canEdit;

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
                                {missingModules.length
                                  ? ` Al activarlo se agregan: ${missingModules
                                      .map((moduleKey) => MODULE_CATALOG[moduleKey].label)
                                      .join(", ")}.`
                                  : ""}
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
                  <Stack spacing={1.25}>
                    {CAPABILITY_GROUPS.map((group) => (
                      <Paper
                        key={group.title}
                        variant="outlined"
                        sx={{
                          borderRadius: "16px",
                          backgroundColor: alpha(theme.palette.background.paper, 0.62),
                          p: 1.25,
                        }}
                      >
                        <Stack spacing={1.2}>
                          <Box>
                            <Typography sx={{ fontWeight: 700 }}>
                              {group.title}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.3 }}>
                              {group.description}
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
                            {group.capabilities.map((capabilityKey) => {
                              const config = CAPABILITY_CATALOG[capabilityKey];
                              const missingModules = config.requiresModules.filter(
                                (moduleKey) =>
                                  !form.blueprint.modules.includes(moduleKey),
                              );

                              return (
                                <FormControlLabel
                                  key={capabilityKey}
                                  control={
                                    <Switch
                                      checked={form.blueprint.capabilities.includes(
                                        capabilityKey,
                                      )}
                                      onChange={(e) =>
                                        handleCapabilityToggle(
                                          capabilityKey,
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
                                        {missingModules.length
                                          ? ` Al activarlo se agregan: ${missingModules
                                              .map(
                                                (moduleKey) =>
                                                  MODULE_CATALOG[moduleKey].label,
                                              )
                                              .join(", ")}.`
                                          : ""}
                                      </Typography>
                                    </Stack>
                                  }
                                />
                              );
                            })}
                          </Box>
                        </Stack>
                      </Paper>
                    ))}

                    {otherCapabilities.length ? (
                      <Paper
                        variant="outlined"
                        sx={{
                          borderRadius: "16px",
                          backgroundColor: alpha(theme.palette.background.paper, 0.62),
                          p: 1.25,
                        }}
                      >
                        <Stack spacing={1.2}>
                          <Box>
                            <Typography sx={{ fontWeight: 700 }}>
                              Otras capabilities
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.3 }}>
                              Capacidades adicionales que no entran en una agrupacion principal.
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
                            {otherCapabilities.map((capabilityKey) => {
                              const config = CAPABILITY_CATALOG[capabilityKey];

                              return (
                                <FormControlLabel
                                  key={capabilityKey}
                                  control={
                                    <Switch
                                      checked={form.blueprint.capabilities.includes(
                                        capabilityKey,
                                      )}
                                      onChange={(e) =>
                                        handleCapabilityToggle(
                                          capabilityKey,
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
                              );
                            })}
                          </Box>
                        </Stack>
                      </Paper>
                    ) : null}
                  </Stack>
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
