import { fetchJson } from "@/shared/dashboard/api";
import type {
  EditProductForm,
  NewProductForm,
  Product,
} from "@/shared/dashboard/types";

function buildCreateProductPayload(form: NewProductForm) {
  return {
    nombre: form.nombre,
    sku: form.sku || undefined,
    codigoBarras: form.codigoBarras || undefined,
    tipoProducto: form.tipoProducto,
    precio: Number(form.precio),
    tarifaIva: Number(form.tarifaIva),
    stockInicial: form.tipoProducto === "BIEN" ? Number(form.stockInicial) : 0,
    minStock: form.tipoProducto === "BIEN" ? Number(form.minStock) : 0,
  };
}

function buildUpdateProductPayload(form: EditProductForm) {
  return {
    nombre: form.nombre,
    sku: form.sku || undefined,
    codigoBarras: form.codigoBarras || undefined,
    tipoProducto: form.tipoProducto,
    precio: Number(form.precio),
    tarifaIva: Number(form.tarifaIva),
    minStock: form.tipoProducto === "BIEN" ? Number(form.minStock) : 0,
  };
}

export async function fetchProducts() {
  return fetchJson<Product[]>("/api/v1/products");
}

export async function createProduct(form: NewProductForm) {
  return fetchJson("/api/v1/products", {
    method: "POST",
    body: JSON.stringify(buildCreateProductPayload(form)),
  });
}

export async function updateProduct(id: string, form: EditProductForm) {
  return fetchJson(`/api/v1/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(buildUpdateProductPayload(form)),
  });
}

export async function deactivateProduct(id: string) {
  return fetchJson(`/api/v1/products/${id}`, {
    method: "DELETE",
  });
}
