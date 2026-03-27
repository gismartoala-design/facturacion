"use client";

import { Loader2, Pencil, Trash2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";

import { fetchJson } from "@/shared/dashboard/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";

type UserItem = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "SELLER";
  createdAt: string;
};

type NewUserForm = {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "SELLER";
};

type EditUserForm = {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "SELLER";
};

const EMPTY_FORM: NewUserForm = { name: "", email: "", password: "", role: "SELLER" };
const EMPTY_EDIT_FORM: EditUserForm = { name: "", email: "", password: "", role: "SELLER" };

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<NewUserForm>(EMPTY_FORM);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editForm, setEditForm] = useState<EditUserForm>(EMPTY_EDIT_FORM);
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  async function loadUsers() {
    setLoading(true);
    try {
      const result = await fetchJson<UserItem[]>("/api/v1/users");
      setUsers(result);
    } catch (error) {
      if (error instanceof Error && error.message.includes("403")) {
        setUnauthorized(true);
      } else {
        setMessage(error instanceof Error ? error.message : "No se pudo cargar usuarios");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadUsers(); }, []);

  async function onCreateUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      await fetchJson("/api/v1/users", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm(EMPTY_FORM);
      setIsFormOpen(false);
      setMessage("Usuario creado correctamente");
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear usuario");
    } finally {
      setSaving(false);
    }
  }

  function onOpenEditUser(user: UserItem) {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
    });
    setMessage("");
  }

  async function onUpdateUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    setMessage("");

    try {
      await fetchJson(`/api/v1/users/${editingUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          role: editForm.role,
          ...(editForm.password ? { password: editForm.password } : {}),
        }),
      });

      setEditingUser(null);
      setEditForm(EMPTY_EDIT_FORM);
      setMessage("Usuario actualizado correctamente");
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar usuario");
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteUser() {
    if (!deletingUser) return;
    setDeleting(true);
    setMessage("");

    try {
      await fetchJson(`/api/v1/users/${deletingUser.id}`, { method: "DELETE" });
      setDeletingUser(null);
      setMessage("Usuario eliminado correctamente");
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo eliminar usuario");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando usuarios...
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        <p className="font-semibold">Acceso denegado</p>
        <p className="mt-1 text-sm">Solo los administradores pueden gestionar usuarios.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4 p-4">
        <div className="space-y-1">
          <CardTitle className="text-[#4a3c58]">Gestion de Usuarios</CardTitle>
          <CardDescription className="max-w-2xl text-[#4a3c58]/68">
            Crea y administra los accesos al sistema desde una sola vista.
          </CardDescription>
        </div>
      </div>

      {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}

      <Card className="rounded-[28px]">
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-[#e8d5e5]/75 bg-white/85 px-3 py-1 text-xs font-medium text-[#4a3c58]/80">
                {users.length} usuario{users.length !== 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center rounded-full border border-amber-200/80 bg-amber-50/85 px-3 py-1 text-xs font-medium text-amber-800">
                {users.filter((user) => user.role === "ADMIN").length} administradores
              </span>
            </div>
            <Button type="button" onClick={() => setIsFormOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Nuevo usuario
            </Button>
          </div>

          <div className="mt-4 overflow-x-auto rounded-3xl border border-[#e8d5e5]/70 bg-white">
            <Table>
              <THead>
                <Tr>
                  <Th>Nombre</Th>
                  <Th>Email</Th>
                  <Th>Rol</Th>
                  <Th>Creado</Th>
                  <Th>Acciones</Th>
                </Tr>
              </THead>
              <TBody>
                {users.map((user) => (
                  <Tr key={user.id}>
                    <Td className="font-medium">{user.name}</Td>
                    <Td>{user.email}</Td>
                    <Td>
                      <Badge variant={user.role === "ADMIN" ? "warning" : "default"}>
                        {user.role === "ADMIN" ? "Administrador" : "Vendedor"}
                      </Badge>
                    </Td>
                    <Td className="text-slate-500">{new Date(user.createdAt).toLocaleDateString("es-EC")}</Td>
                    <Td>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenEditUser(user)}
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => { setDeletingUser(user); setMessage(""); }}
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal nuevo usuario */}
      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Nuevo Usuario</h3>
              <p className="mt-1 text-sm text-slate-600">Completa los datos de acceso del nuevo integrante.</p>
            </div>
            <form className="grid gap-3 p-5" onSubmit={onCreateUser}>
              <div>
                <Label htmlFor="u-name">Nombre completo</Label>
                <Input
                  id="u-name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="u-email">Correo electronico</Label>
                <Input
                  id="u-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="u-password">Contrasena (min. 6 caracteres)</Label>
                <Input
                  id="u-password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  minLength={6}
                  required
                />
              </div>
              <div>
                <Label htmlFor="u-role">Rol</Label>
                <select
                  id="u-role"
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as "ADMIN" | "SELLER" }))}
                >
                  <option value="SELLER">Vendedor</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>
                  ) : (
                    "Crear usuario"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Modal editar usuario */}
      {editingUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Editar Usuario</h3>
              <p className="mt-1 text-sm text-slate-600">Actualiza los datos del usuario seleccionado.</p>
            </div>
            <form className="grid gap-3 p-5" onSubmit={onUpdateUser}>
              <div>
                <Label htmlFor="eu-name">Nombre completo</Label>
                <Input
                  id="eu-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="eu-email">Correo electronico</Label>
                <Input
                  id="eu-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="eu-password">Nueva contrasena (opcional)</Label>
                <Input
                  id="eu-password"
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))}
                  minLength={6}
                  placeholder="Dejar vacio para no cambiar"
                />
              </div>
              <div>
                <Label htmlFor="eu-role">Rol</Label>
                <select
                  id="eu-role"
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                  value={editForm.role}
                  onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value as "ADMIN" | "SELLER" }))}
                >
                  <option value="SELLER">Vendedor</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingUser(null);
                    setEditForm(EMPTY_EDIT_FORM);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>
                  ) : (
                    "Guardar cambios"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Modal eliminar usuario */}
      {deletingUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Eliminar Usuario</h3>
              <p className="mt-1 text-sm text-slate-600">Esta accion no se puede deshacer.</p>
            </div>
            <div className="grid gap-4 p-5">
              <p className="text-sm text-slate-700">
                Vas a eliminar a <span className="font-semibold">{deletingUser.name}</span> ({deletingUser.email}).
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDeletingUser(null)} disabled={deleting}>
                  Cancelar
                </Button>
                <Button type="button" variant="destructive" onClick={() => { void onDeleteUser(); }} disabled={deleting}>
                  {deleting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Eliminando...</>
                  ) : (
                    "Eliminar usuario"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
