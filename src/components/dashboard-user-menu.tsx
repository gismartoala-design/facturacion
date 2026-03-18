"use client";

import { LogOut, Shield, User2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { LogoutButton } from "@/components/logout-button";

type DashboardUserMenuProps = {
  name: string;
  roleLabel: string;
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "DV";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function DashboardUserMenu({ name, roleLabel }: DashboardUserMenuProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const initials = initialsFromName(name);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    if (!open) return;
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        aria-label="Abrir opciones de usuario"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="group relative flex h-13 w-13 items-center justify-center rounded-full border border-white/70 bg-white/82 shadow-[0_14px_32px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-all hover:scale-[1.02] hover:bg-white"
      >
        <div className="absolute inset-0 rounded-full bg-linear-to-br from-rose-100/55 via-transparent to-purple-100/40 opacity-80" />
        <span className="relative z-10 text-sm font-bold tracking-[0.16em] text-[#4a3c58]">{initials}</span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Cerrar opciones de usuario"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-transparent lg:hidden"
          />

          <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[28px] border border-white/70 bg-white/88 shadow-[0_20px_50px_rgba(0,0,0,0.12)] backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-br from-rose-100/55 via-transparent to-purple-100/45" />

            <div className="relative z-10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-[#fdfcf5]/95 text-sm font-bold tracking-[0.16em] text-[#4a3c58] shadow-[0_8px_18px_rgba(0,0,0,0.06)]">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#4a3c58]/38">Sesion activa</p>
                    <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
                    <p className="text-xs text-slate-500">{roleLabel}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-white/80 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 rounded-2xl border border-[#e8d5e5]/65 bg-[#fdfcf5]/82 px-3 py-2.5 text-sm text-[#4a3c58]">
                  <User2 className="h-4 w-4 text-[#b1a1c6]" />
                  <span className="truncate">{name}</span>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-[#e8d5e5]/65 bg-[#fdfcf5]/82 px-3 py-2.5 text-sm text-[#4a3c58]">
                  <Shield className="h-4 w-4 text-[#b1a1c6]" />
                  <span>{roleLabel}</span>
                </div>
              </div>

              <div className="mt-4 border-t border-[#e8d5e5]/55 pt-4">
                <div className="flex items-center justify-between rounded-2xl border border-[#e8d5e5]/65 bg-white/88 px-3 py-2.5">
                  <div className="flex items-center gap-2 text-sm font-medium text-[#4a3c58]">
                    <LogOut className="h-4 w-4 text-[#b1a1c6]" />
                    <span>Cerrar sesion</span>
                  </div>
                  <LogoutButton />
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
