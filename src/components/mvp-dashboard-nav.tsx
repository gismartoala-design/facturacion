"use client";

import { Boxes, ClipboardList, FileText, PackageSearch, ShoppingCart, Users, WalletCards } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  hint: string;
  icon: typeof Boxes;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/overview", label: "Resumen", hint: "Vista operativa", icon: Boxes },
  { href: "/products", label: "Productos", hint: "Catalogo", icon: ClipboardList },
  { href: "/inventory", label: "Inventario", hint: "Stock y ajustes", icon: PackageSearch },
  { href: "/sales", label: "Facturar Venta", hint: "Venta + SRI", icon: ShoppingCart },
  { href: "/quotes", label: "Cotizaciones", hint: "Proformas y conversion", icon: FileText },
  { href: "/sri", label: "Facturacion", hint: "Reintentos", icon: WalletCards },
  { href: "/users", label: "Usuarios", hint: "Gestion de accesos", icon: Users, adminOnly: true },
];

type MvpDashboardNavProps = {
  userRole?: "ADMIN" | "SELLER";
};

export function MvpDashboardNav({ userRole }: MvpDashboardNavProps) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || userRole === "ADMIN");

  return (
    <>
      <aside className="hidden h-full w-full rounded-[30px] border border-white/60 bg-white/72 p-4 shadow-[0_12px_40px_rgb(0,0,0,0.05)] backdrop-blur-xl lg:flex lg:flex-col lg:overflow-hidden">
        <div className="rounded-3xl border border-[#e8d5e5]/60 bg-white/85 p-3 shadow-[0_8px_24px_rgb(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#e8d5e5]/40 bg-white p-1 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
              <Image src="/logo.png" alt="Logo DOVI VELAS" width={56} height={56} className="object-contain" priority unoptimized />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold uppercase tracking-[0.24em] text-[#4a3c58]/65">DOVI VELAS</p>
              <p className="truncate text-sm font-semibold text-slate-800">Panel operativo</p>
              <p className="truncate text-xs text-[#4a3c58]/55">Gestion central del negocio</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex-1 overflow-y-auto pr-1">
          <p className="px-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#4a3c58]/40">Navegacion</p>
          <nav className="mt-3 space-y-2">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block w-full rounded-2xl border px-4 py-3.5 text-left transition-all duration-300",
                    isActive
                      ? "translate-x-1 border-[#e8d5e5] bg-white text-[#4a3c58] shadow-md"
                      : "border-transparent bg-transparent text-slate-600 hover:bg-white/65 hover:text-[#4a3c58]",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <p className="text-sm font-semibold">{item.label}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{item.hint}</p>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="space-y-3 lg:hidden">
        <div className="rounded-2xl border border-white/60 bg-white/75 p-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#e8d5e5]/40 bg-white p-1 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
              <Image src="/logo.png" alt="Logo DOVI VELAS" width={48} height={48} className="object-contain" priority unoptimized />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold uppercase tracking-[0.18em] text-[#4a3c58]/65">DOVI VELAS</p>
              <p className="truncate text-sm font-semibold text-slate-800">Panel operativo</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {visibleItems.map((item) => (
            <Link
              key={`mobile-${item.href}`}
              href={item.href}
              className={cn(
                "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-xl border px-4 text-sm font-medium transition-all shadow-sm",
                pathname === item.href
                  ? "border-transparent bg-linear-to-tr from-[#b1a1c6] to-[#4a3c58] text-white shadow-md"
                  : "border-slate-200 bg-white/80 text-slate-700 backdrop-blur-sm hover:bg-white hover:text-[#4a3c58]",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
