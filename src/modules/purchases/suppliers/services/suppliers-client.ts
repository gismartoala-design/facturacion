import { fetchJson } from "@/shared/dashboard/api";

import type { Supplier, SupplierForm } from "../types";

function buildSupplierPayload(form: SupplierForm) {
  return {
    tipoIdentificacion: form.tipoIdentificacion,
    identificacion: form.identificacion,
    razonSocial: form.razonSocial,
    nombreComercial: form.nombreComercial || undefined,
    contactoPrincipal: form.contactoPrincipal || undefined,
    email: form.email || undefined,
    telefono: form.telefono || undefined,
    direccion: form.direccion || undefined,
    diasCredito: Number(form.diasCredito || 0),
  };
}

export async function fetchSuppliers(search?: string) {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return fetchJson<Supplier[]>(`/api/v1/suppliers${query}`);
}

export async function createSupplier(form: SupplierForm) {
  return fetchJson<Supplier>("/api/v1/suppliers", {
    method: "POST",
    body: JSON.stringify(buildSupplierPayload(form)),
  });
}

export async function updateSupplier(id: string, form: SupplierForm) {
  return fetchJson<Supplier>(`/api/v1/suppliers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(buildSupplierPayload(form)),
  });
}

export async function deactivateSupplier(id: string) {
  return fetchJson<Supplier>(`/api/v1/suppliers/${id}`, {
    method: "DELETE",
  });
}
