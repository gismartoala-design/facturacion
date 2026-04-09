"use client";

import Autocomplete from "@mui/material/Autocomplete";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";

import type {
  AccountGroupKey,
  AccountRow,
} from "@/modules/accounting/accounting-ledger/components/account-plan-view-model";

import {
  GROUP_OPTIONS,
  NATURE_OPTIONS,
  type AccountFormState,
} from "../shared";

type AccountFormFieldsProps = {
  form: AccountFormState;
  disabled: boolean;
  parentOptions: AccountRow[];
  selectedParent: AccountRow | null;
  onFieldChange: <K extends keyof AccountFormState>(
    field: K,
    value: AccountFormState[K],
  ) => void;
  onGroupChange: (groupKey: AccountGroupKey) => void;
};

export function AccountFormFields({
  form,
  disabled,
  parentOptions,
  selectedParent,
  onFieldChange,
  onGroupChange,
}: AccountFormFieldsProps) {
  return (
    <>
      <TextField
        label="Codigo"
        value={form.code}
        onChange={(event) => onFieldChange("code", event.target.value)}
        disabled={disabled}
        required
        size="small"
      />

      <TextField
        label="Nombre de cuenta"
        value={form.name}
        onChange={(event) => onFieldChange("name", event.target.value)}
        disabled={disabled}
        required
        size="small"
      />

      <TextField
        select
        label="Grupo"
        value={form.groupKey}
        onChange={(event) => onGroupChange(event.target.value as AccountGroupKey)}
        disabled={disabled}
        size="small"
      >
        {GROUP_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="Naturaleza"
        value={form.defaultNature}
        onChange={(event) =>
          onFieldChange("defaultNature", event.target.value as AccountFormState["defaultNature"])
        }
        disabled={disabled}
        size="small"
      >
        {NATURE_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>

      <Autocomplete
        options={parentOptions}
        value={selectedParent}
        onChange={(_, value) => onFieldChange("parentId", value?.id ?? null)}
        disabled={disabled}
        getOptionLabel={(option) => `${option.code} · ${option.name}`}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Cuenta padre"
            placeholder="Sin padre"
            size="small"
          />
        )}
      />

      <TextField
        label="Descripcion"
        value={form.description}
        onChange={(event) => onFieldChange("description", event.target.value)}
        disabled={disabled}
        size="small"
        multiline
        minRows={3}
      />

      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
        <FormControlLabel
          control={
            <Switch
              checked={form.acceptsPostings}
              onChange={(event) =>
                onFieldChange("acceptsPostings", event.target.checked)
              }
              disabled={disabled}
            />
          }
          label="Acepta movimientos"
        />
        <FormControlLabel
          control={
            <Switch
              checked={form.active}
              onChange={(event) => onFieldChange("active", event.target.checked)}
              disabled={disabled}
            />
          }
          label="Cuenta activa"
        />
      </Stack>
    </>
  );
}
