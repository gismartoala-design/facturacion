"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Save,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { BusinessBlueprint } from "@/core/platform/business-blueprint";
import {
  CAPABILITY_CATALOG,
  EDITION_CATALOG,
  MODULE_CATALOG,
  POLICY_PACK_CATALOG,
} from "@/core/platform/catalog";
import { normalizeBusinessBlueprint } from "@/core/platform/composition";
import { DEFAULT_BUSINESS_BLUEPRINT } from "@/core/platform/defaults";
import type {
  CapabilityKey,
  EditionKey,
  ModuleKey,
  PolicyPackKey,
} from "@/core/platform/contracts";
import { fetchJson } from "@/shared/dashboard/api";
import { DashboardPageHeader } from "@/shared/dashboard/page-header";
import { useCompanyNotifier } from "@/shared/notifications/notifier-presets";
import { PageLoadingState } from "@/shared/states/page-loading-state";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type BusinessResponse = {
  blueprint: BusinessBlueprint;
};

type PresetDef = {
  key: string;
  title: string;
  description: string;
  blueprint: BusinessBlueprint;
};

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS: PresetDef[] = [
  {
    key: "retail",
    title: "Retail base",
    description: "POS genérico con inventario operativo para mostrador o caja simple.",
    blueprint: {
      modules: ["POS", "INVENTORY"],
      edition: "STARTER",
      policyPacks: ["POS_GENERIC"],
      capabilities: ["POS_TRACK_INVENTORY_ON_SALE"],
    },
  },
  {
    key: "butchery",
    title: "Carnicería",
    description: "Balanza, lectura de peso y control operativo de POS.",
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
    description: "Mesas, cocina, takeout, delivery, caja e inventario por receta.",
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

const EDITION_META: Record<EditionKey, { subtitle: string; color: string }> = {
  STARTER: { subtitle: "Operación básica sin controles adicionales", color: "#64748b" },
  GROWTH: { subtitle: "Operación establecida con reportes y flujos", color: "#0ea5e9" },
  ENTERPRISE: { subtitle: "Control completo con auditoría y aprobaciones", color: "#8b5cf6" },
};

const CAPABILITY_GROUPS: Array<{
  title: string;
  description: string;
  capabilities: CapabilityKey[];
}> = [
  {
    title: "POS base",
    description: "Capacidades operativas generales del punto de venta.",
    capabilities: ["POS_TRACK_INVENTORY_ON_SALE", "POS_SCALE_BARCODES", "POS_WEIGHT_FROM_BARCODE"],
  },
  {
    title: "Restaurante · Salón",
    description: "Atención de mesa, divisiones y movimientos operativos.",
    capabilities: ["POS_TABLE_SERVICE", "POS_SPLIT_BILL", "POS_TRANSFER_TABLES", "POS_MERGE_TABLES"],
  },
  {
    title: "Restaurante · Canales",
    description: "Operaciones sin mesa física o con despacho interno.",
    capabilities: ["POS_TAKEOUT_ORDERS", "POS_DELIVERY_ORDERS"],
  },
  {
    title: "Restaurante · Cocina",
    description: "Tickets impresos y visibilidad KDS por estación.",
    capabilities: ["POS_KITCHEN_TICKETS", "POS_KITCHEN_DISPLAY"],
  },
  {
    title: "Restaurante · Inventario",
    description: "Consumo de receta y mise en place para operación real.",
    capabilities: ["INVENTORY_RECIPE_CONSUMPTION", "INVENTORY_PREP_PRODUCTION"],
  },
  {
    title: "Caja",
    description: "Reglas operativas y controles de sesión de caja.",
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
    title: "Control y auditoría",
    description: "Trazabilidad y aprobaciones para escenarios formales.",
    capabilities: ["AUDIT_LOG", "APPROVAL_FLOWS"],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function unique<T>(values: readonly T[]): T[] {
  return Array.from(new Set(values));
}

function mergeModules(values: readonly ModuleKey[], required: readonly ModuleKey[]): ModuleKey[] {
  return unique([...values, ...required]);
}

function toggleValue<T>(values: readonly T[], value: T, enabled: boolean): T[] {
  if (enabled) return unique([...values, value]);
  return values.filter((v) => v !== value);
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "text.secondary",
      }}
    >
      {children}
    </Typography>
  );
}

function BlueprintSummary({ blueprint }: { blueprint: BusinessBlueprint }) {
  const theme = useTheme();
  const editionMeta = EDITION_META[blueprint.edition];
  const policyPackLabel =
    blueprint.policyPacks.length > 0
      ? POLICY_PACK_CATALOG[blueprint.policyPacks[0]]?.label
      : "Sin vertical";

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: "24px",
        border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)}, ${alpha(theme.palette.primary.light, 0.12)})`,
        p: { xs: 2, md: 2.5 },
      }}
    >
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Cpu size={16} style={{ color: theme.palette.primary.main }} />
            <SectionLabel>Composición activa</SectionLabel>
          </Stack>
          <Chip
            size="small"
            label={EDITION_CATALOG[blueprint.edition].label}
            sx={{
              fontWeight: 800,
              backgroundColor: alpha(editionMeta.color, 0.12),
              color: editionMeta.color,
              border: `1px solid ${alpha(editionMeta.color, 0.28)}`,
            }}
          />
        </Stack>

        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          }}
        >
          <Stack spacing={0.5}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Módulos
            </Typography>
            {blueprint.modules.length === 0 ? (
              <Typography sx={{ fontSize: 12, color: "text.disabled" }}>Ninguno</Typography>
            ) : (
              <Stack direction="row" flexWrap="wrap" gap={0.5} useFlexGap>
                {blueprint.modules.map((m) => (
                  <Chip
                    key={m}
                    label={MODULE_CATALOG[m].label}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: 11, fontWeight: 700 }}
                  />
                ))}
              </Stack>
            )}
          </Stack>

          <Stack spacing={0.5}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Vertical
            </Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{policyPackLabel}</Typography>
          </Stack>

          <Stack spacing={0.5}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Capacidades
            </Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
              {blueprint.capabilities.length} activa{blueprint.capabilities.length !== 1 ? "s" : ""}
            </Typography>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}

function PresetCard({
  preset,
  onApply,
  disabled,
}: {
  preset: PresetDef;
  onApply: (blueprint: BusinessBlueprint) => void;
  disabled: boolean;
}) {
  const theme = useTheme();
  const policyPackLabel = preset.blueprint.policyPacks[0]
    ? POLICY_PACK_CATALOG[preset.blueprint.policyPacks[0]]?.label
    : "Genérico";

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: "20px",
        border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
        backgroundColor: alpha(theme.palette.background.paper, 0.8),
        p: 2,
      }}
    >
      <Stack spacing={1.5} sx={{ height: "100%" }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 14 }}>{preset.title}</Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.35 }}>
            {preset.description}
          </Typography>
        </Box>

        <Stack spacing={0.75}>
          <Stack direction="row" flexWrap="wrap" gap={0.5} useFlexGap>
            <Chip
              label={policyPackLabel}
              size="small"
              sx={{ fontWeight: 700, fontSize: 11, backgroundColor: alpha(theme.palette.primary.main, 0.1), color: "primary.main" }}
            />
            <Chip
              label={EDITION_CATALOG[preset.blueprint.edition].label}
              size="small"
              variant="outlined"
              sx={{ fontSize: 11, fontWeight: 600 }}
            />
          </Stack>
          <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
            {preset.blueprint.modules.map((m) => MODULE_CATALOG[m].label).join(" · ")}
          </Typography>
        </Stack>

        <Button
          size="small"
          variant="outlined"
          disabled={disabled}
          onClick={() => onApply(preset.blueprint)}
          sx={{ borderRadius: "12px", fontWeight: 700 }}
        >
          Aplicar preset
        </Button>
      </Stack>
    </Paper>
  );
}

function EditionSelector({
  value,
  onChange,
  disabled,
}: {
  value: EditionKey;
  onChange: (edition: EditionKey) => void;
  disabled: boolean;
}) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "grid",
        gap: 1.25,
        gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
      }}
    >
      {(Object.entries(EDITION_CATALOG) as [EditionKey, { label: string }][]).map(([key, config]) => {
        const meta = EDITION_META[key];
        const active = value === key;

        return (
          <Paper
            key={key}
            elevation={0}
            onClick={() => !disabled && onChange(key)}
            sx={{
              borderRadius: "18px",
              border: `2px solid ${active ? meta.color : alpha(theme.palette.divider, 0.8)}`,
              backgroundColor: active ? alpha(meta.color, 0.06) : alpha(theme.palette.background.paper, 0.7),
              p: 1.75,
              cursor: disabled ? "default" : "pointer",
              transition: "border-color 160ms ease, background-color 160ms ease",
              "&:hover": disabled ? {} : {
                borderColor: active ? meta.color : alpha(meta.color, 0.5),
                backgroundColor: alpha(meta.color, 0.04),
              },
            }}
          >
            <Stack spacing={0.75}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography sx={{ fontWeight: 800, fontSize: 14, color: active ? meta.color : "text.primary" }}>
                  {config.label}
                </Typography>
                {active && (
                  <CheckCircle2
                    size={16}
                    style={{ color: meta.color, flexShrink: 0 }}
                  />
                )}
              </Stack>
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                {meta.subtitle}
              </Typography>
            </Stack>
          </Paper>
        );
      })}
    </Box>
  );
}

function PolicyPackSelector({
  policyPacks,
  onToggle,
  disabled,
}: {
  policyPacks: readonly PolicyPackKey[];
  onToggle: (key: PolicyPackKey, enabled: boolean) => void;
  disabled: boolean;
}) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "grid",
        gap: 1.25,
        gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
      }}
    >
      {(Object.entries(POLICY_PACK_CATALOG) as [PolicyPackKey, { label: string; description: string; requiresModules: ModuleKey[] }][]).map(
        ([key, config]) => {
          const active = policyPacks.includes(key);

          return (
            <Paper
              key={key}
              elevation={0}
              onClick={() => !disabled && onToggle(key, !active)}
              sx={{
                borderRadius: "18px",
                border: `2px solid ${active ? theme.palette.primary.main : alpha(theme.palette.divider, 0.8)}`,
                backgroundColor: active
                  ? alpha(theme.palette.primary.main, 0.06)
                  : alpha(theme.palette.background.paper, 0.7),
                p: 1.75,
                cursor: disabled ? "default" : "pointer",
                transition: "border-color 160ms ease, background-color 160ms ease",
                "&:hover": disabled ? {} : {
                  borderColor: alpha(theme.palette.primary.main, active ? 1 : 0.4),
                  backgroundColor: alpha(theme.palette.primary.main, 0.04),
                },
              }}
            >
              <Stack spacing={0.75}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: 14,
                      color: active ? "primary.main" : "text.primary",
                    }}
                  >
                    {config.label}
                  </Typography>
                  {active && (
                    <CheckCircle2 size={16} style={{ color: theme.palette.primary.main, flexShrink: 0 }} />
                  )}
                </Stack>
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  {config.description}
                </Typography>
                <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
                  Requiere: {config.requiresModules.map((m) => MODULE_CATALOG[m].label).join(", ")}
                </Typography>
              </Stack>
            </Paper>
          );
        },
      )}
    </Box>
  );
}

function CapabilityGroup({
  group,
  capabilities,
  modules,
  onToggle,
  disabled,
}: {
  group: { title: string; description: string; capabilities: CapabilityKey[] };
  capabilities: readonly CapabilityKey[];
  modules: readonly ModuleKey[];
  onToggle: (key: CapabilityKey, enabled: boolean) => void;
  disabled: boolean;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const activeCount = group.capabilities.filter((c) => capabilities.includes(c)).length;

  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        borderRadius: "18px",
        backgroundColor: alpha(theme.palette.background.paper, 0.7),
        overflow: "hidden",
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={() => setOpen((v) => !v)}
        sx={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2,
          py: 1.5,
          border: 0,
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
          "&:hover": { backgroundColor: alpha(theme.palette.background.paper, 0.5) },
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{group.title}</Typography>
            {activeCount > 0 && (
              <Chip
                label={`${activeCount} activa${activeCount !== 1 ? "s" : ""}`}
                size="small"
                sx={{
                  height: 18,
                  fontSize: 10,
                  fontWeight: 700,
                  backgroundColor: alpha(theme.palette.success.main, 0.12),
                  color: "success.dark",
                }}
              />
            )}
          </Stack>
          <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.2 }}>
            {group.description}
          </Typography>
        </Box>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </Box>

      <Collapse in={open}>
        <Divider />
        <Box
          sx={{
            display: "grid",
            gap: 0,
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
            px: 1.5,
            pb: 1.5,
            pt: 1,
          }}
        >
          {group.capabilities.map((capKey) => {
            const config = CAPABILITY_CATALOG[capKey];
            const missingModules = config.requiresModules.filter((m) => !modules.includes(m));

            return (
              <FormControlLabel
                key={capKey}
                control={
                  <Switch
                    checked={capabilities.includes(capKey)}
                    onChange={(e) => onToggle(capKey, e.target.checked)}
                    disabled={disabled}
                    size="small"
                  />
                }
                label={
                  <Stack spacing={0.2} sx={{ py: 0.5 }}>
                    <Typography sx={{ fontSize: 13 }}>{config.label}</Typography>
                    <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                      {config.description}
                      {missingModules.length > 0
                        ? ` · Activa: ${missingModules.map((m) => MODULE_CATALOG[m].label).join(", ")}`
                        : ""}
                    </Typography>
                  </Stack>
                }
              />
            );
          })}
        </Box>
      </Collapse>
    </Paper>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function PlatformBlueprintPage() {
  const theme = useTheme();
  const { apiError, saved } = useCompanyNotifier();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blueprint, setBlueprint] = useState<BusinessBlueprint>(DEFAULT_BUSINESS_BLUEPRINT);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data = await fetchJson<BusinessResponse>("/api/v1/business");
        if (mounted) setBlueprint(normalizeBusinessBlueprint(data.blueprint));
      } catch (err) {
        if (mounted) apiError(err, "No se pudo cargar la configuración de plataforma");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => { mounted = false; };
  }, [apiError]);

  const update = useCallback((updater: (b: BusinessBlueprint) => BusinessBlueprint) => {
    setBlueprint((current) => normalizeBusinessBlueprint(updater(current)));
  }, []);

  function handleEditionChange(edition: EditionKey) {
    update((b) => ({ ...b, edition }));
  }

  function handlePolicyPackToggle(key: PolicyPackKey, enabled: boolean) {
    update((b) => {
      if (!enabled) {
        return { ...b, policyPacks: b.policyPacks.filter((p) => p !== key) };
      }
      const nextPacks = b.policyPacks.filter(
        (p) => !(p.startsWith("POS_") && key.startsWith("POS_")),
      );
      return {
        ...b,
        modules: mergeModules(b.modules, POLICY_PACK_CATALOG[key].requiresModules),
        policyPacks: unique([...nextPacks, key]),
      };
    });
  }

  function handleModuleToggle(key: ModuleKey, enabled: boolean) {
    update((b) => ({ ...b, modules: toggleValue(b.modules, key, enabled) }));
  }

  function handleCapabilityToggle(key: CapabilityKey, enabled: boolean) {
    update((b) => ({
      ...b,
      modules: enabled
        ? mergeModules(b.modules, CAPABILITY_CATALOG[key].requiresModules)
        : b.modules,
      capabilities: toggleValue(b.capabilities, key, enabled),
    }));
  }

  function applyPreset(preset: BusinessBlueprint) {
    setBlueprint(normalizeBusinessBlueprint(preset));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await fetchJson<{ blueprint: BusinessBlueprint }>(
        "/api/v1/business/blueprint",
        { method: "PUT", body: JSON.stringify(blueprint) },
      );
      setBlueprint(normalizeBusinessBlueprint(result.blueprint));
      saved("Configuración de plataforma guardada");
    } catch (err) {
      apiError(err, "No se pudo guardar la configuración");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <PageLoadingState message="Cargando configuración de plataforma..." centered size={30} />;
  }

  const PAPER_SX = {
    borderRadius: "24px",
    border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
    backgroundColor: alpha(theme.palette.background.paper, 0.96),
    p: { xs: 2, md: 2.5 },
  } as const;

  return (
    <Box
      component="form"
      onSubmit={handleSave}
      sx={{ px: { xs: 1, md: 2 }, py: { xs: 1, md: 2 } }}
    >
      <Stack spacing={2.5}>
        <DashboardPageHeader
          icon={<Layers className="h-4.5 w-4.5" />}
          title="Motor de composición"
          description="Configura la plataforma como piezas: módulos, edición, vertical y capacidades. Esta configuración determina qué funciona y cómo en todo el sistema."
          sx={{ px: { xs: 1, sm: 2 }, pt: { xs: 1, sm: 2 } }}
        />

        {/* Composición activa */}
        <BlueprintSummary blueprint={blueprint} />

        {/* Configuraciones de partida */}
        <Paper elevation={0} sx={PAPER_SX}>
          <Stack spacing={2}>
            <Stack spacing={0.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Zap size={14} style={{ color: theme.palette.warning.main }} />
                <SectionLabel>Configuraciones de partida</SectionLabel>
              </Stack>
              <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                Carga una base recomendada. Puedes ajustar todo manualmente después.
              </Typography>
            </Stack>

            <Box
              sx={{
                display: "grid",
                gap: 1.25,
                gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
              }}
            >
              {PRESETS.map((preset) => (
                <PresetCard
                  key={preset.key}
                  preset={preset}
                  onApply={applyPreset}
                  disabled={saving}
                />
              ))}
            </Box>
          </Stack>
        </Paper>

        {/* Edición */}
        <Paper elevation={0} sx={PAPER_SX}>
          <Stack spacing={2}>
            <Stack spacing={0.5}>
              <SectionLabel>Edición de plataforma</SectionLabel>
              <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                Define el nivel de madurez, control y complejidad operativa del negocio.
              </Typography>
            </Stack>
            <EditionSelector
              value={blueprint.edition}
              onChange={handleEditionChange}
              disabled={saving}
            />
          </Stack>
        </Paper>

        {/* Vertical de operación */}
        <Paper elevation={0} sx={PAPER_SX}>
          <Stack spacing={2}>
            <Stack spacing={0.5}>
              <SectionLabel>Vertical de operación</SectionLabel>
              <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                Selecciona el policy pack que define cómo se comporta el POS. Solo uno puede estar activo a la vez.
              </Typography>
            </Stack>
            <PolicyPackSelector
              policyPacks={blueprint.policyPacks}
              onToggle={handlePolicyPackToggle}
              disabled={saving}
            />
          </Stack>
        </Paper>

        {/* Módulos activos */}
        <Paper elevation={0} sx={PAPER_SX}>
          <Stack spacing={2}>
            <Stack spacing={0.5}>
              <SectionLabel>Módulos activos</SectionLabel>
              <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                Bloques funcionales grandes. Los policy packs y capabilities pueden activarlos automáticamente.
              </Typography>
            </Stack>
            <Box
              sx={{
                display: "grid",
                gap: 0.5,
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
              }}
            >
              {(Object.entries(MODULE_CATALOG) as [ModuleKey, { label: string; description: string }][]).map(
                ([key, config]) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Switch
                        checked={blueprint.modules.includes(key)}
                        onChange={(e) => handleModuleToggle(key, e.target.checked)}
                        disabled={saving}
                      />
                    }
                    label={
                      <Stack spacing={0.2} sx={{ py: 0.5 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{config.label}</Typography>
                        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{config.description}</Typography>
                      </Stack>
                    }
                  />
                ),
              )}
            </Box>
          </Stack>
        </Paper>

        {/* Capacidades */}
        <Paper elevation={0} sx={PAPER_SX}>
          <Stack spacing={2}>
            <Stack spacing={0.5}>
              <SectionLabel>Capacidades</SectionLabel>
              <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                Piezas puntuales activables. Habilitan comportamiento específico sin cambiar el módulo base.
              </Typography>
            </Stack>
            <Stack spacing={1.25}>
              {CAPABILITY_GROUPS.map((group) => (
                <CapabilityGroup
                  key={group.title}
                  group={group}
                  capabilities={blueprint.capabilities}
                  modules={blueprint.modules}
                  onToggle={handleCapabilityToggle}
                  disabled={saving}
                />
              ))}
            </Stack>
          </Stack>
        </Paper>

        {/* Alerta si restaurante activo */}
        {blueprint.policyPacks.includes("POS_RESTAURANT") && (
          <Alert severity="info" variant="outlined" sx={{ borderRadius: "18px" }}>
            El vertical Restaurante está activo. Asegúrate de configurar el menú, las mesas y el flujo de cocina antes de operar.
          </Alert>
        )}

        {/* Guardar */}
        <Grid container justifyContent="flex-end">
          <Grid>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              startIcon={<Save className="h-4 w-4" />}
              sx={{ borderRadius: "14px", fontWeight: 700, minWidth: 180 }}
            >
              {saving ? "Guardando..." : "Guardar configuración"}
            </Button>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
}
