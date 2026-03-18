"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-4">
      {/* Background orbs */}
      <div className="absolute left-1/4 top-0 h-125 w-125 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-200/40 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 h-150 w-150 translate-x-1/3 translate-y-1/3 rounded-full bg-purple-200/40 blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="rounded-3xl border border-white/60 bg-white/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] backdrop-blur-xl">
          {/* Logo */}
          <div className="mb-6 flex flex-col items-center gap-2">
            <div className="relative flex h-22 w-22 items-center justify-center overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.10)]">
              <Image
                src="/logo-original.jpg"
                alt="Logo de ARGSOFT"
                fill
                className="object-cover"
                priority
              />
            </div>
            <p className="text-xs font-bold tracking-[0.2em] text-indigo-900/60 uppercase">ARGSOFT</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Iniciar sesion</h1>
            <p className="text-sm text-slate-500">Ingresa tus credenciales para continuar</p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <Label htmlFor="email">Correo electronico</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@empresa.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Contrasena</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>

            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p>
            ) : null}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Ingresando...
                </>
              ) : (
                "Ingresar"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
