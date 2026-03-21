"use client";

import type { SessionFeatureKey } from "@/lib/auth";
import { Boxes, ClipboardList, FileText, Monitor, PackageSearch, ShoppingCart, Users, WalletCards } from "lucide-react";
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
  requiredFeature?: SessionFeatureKey;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/overview", label: "Resumen", hint: "Vista operativa", icon: Boxes },
  { href: "/pos", label: "POS", hint: "Terminal separada", icon: Monitor, requiredFeature: "POS" },
  { href: "/products", label: "Productos", hint: "Catalogo", icon: ClipboardList },
  { href: "/inventory", label: "Inventario", hint: "Stock y ajustes", icon: PackageSearch },
  { href: "/sales", label: "Facturar Venta", hint: "Venta + SRI", icon: ShoppingCart },
  { href: "/quotes", label: "Cotizaciones", hint: "Proformas y conversion", icon: FileText, requiredFeature: "QUOTES" },
  { href: "/sri", label: "Facturacion", hint: "Reintentos", icon: WalletCards, requiredFeature: "BILLING" },
  { href: "/users", label: "Usuarios", hint: "Gestion de accesos", icon: Users, adminOnly: true },
];

type MvpDashboardNavProps = {
  userRole?: "ADMIN" | "SELLER";
  businessName?: string;
  enabledFeatures?: SessionFeatureKey[];
};

export function MvpDashboardNav({ userRole, businessName, enabledFeatures }: MvpDashboardNavProps) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => {
    const roleAllowed = !item.adminOnly || userRole === "ADMIN";
    const featureAllowed = !item.requiredFeature || enabledFeatures?.includes(item.requiredFeature);
    return roleAllowed && featureAllowed;
  });

  return (
    <>
      <aside className="hidden h-full w-full rounded-[30px] border border-[var(--border)]/80 bg-[color:var(--sidebar)]/88 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:flex lg:flex-col lg:overflow-hidden">
        <div className="rounded-3xl border border-[var(--border)] bg-white/96 p-3 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--primary-light)] p-1 shadow-[0_2px_10px_rgba(15,23,42,0.05)]">
              <Image src="/logo.png" alt="Logo DOVI VELAS" width={56} height={56} className="object-contain" priority unoptimized />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
                {businessName ?? "Negocio Principal"}
              </p>
              <p className="truncate text-sm font-semibold text-[var(--foreground)]">Panel operativo</p>
              <p className="truncate text-xs text-[color:var(--text-muted)]">Gestion central del negocio</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex-1 overflow-y-auto pr-1">
          <p className="px-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--text-muted)]">Navegacion</p>
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
                      ? "translate-x-1 border-[var(--primary)]/16 bg-[var(--primary-light)] text-[var(--foreground)] shadow-[0_8px_20px_rgba(139,92,246,0.12)]"
                      : "border-transparent bg-transparent text-[color:var(--text-muted)] hover:bg-white/78 hover:text-[var(--foreground)]",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <p className="text-sm font-semibold">{item.label}</p>
                  </div>
                  <p className="mt-1 text-xs text-[color:var(--text-muted)]">{item.hint}</p>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="space-y-3 lg:hidden">
        <div className="rounded-2xl border border-[var(--border)]/80 bg-white/86 p-3 shadow-[0_8px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--primary-light)] p-1 shadow-[0_2px_10px_rgba(15,23,42,0.05)]">
              <Image src="/logo.png" alt="Logo DOVI VELAS" width={48} height={48} className="object-contain" priority unoptimized />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                {businessName ?? "Negocio Principal"}
              </p>
              <p className="truncate text-sm font-semibold text-[var(--foreground)]">Panel operativo</p>
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
                  ? "border-transparent bg-linear-to-tr from-[var(--primary)] to-[var(--secondary)] text-white shadow-[0_8px_18px_rgba(99,102,241,0.18)]"
                  : "border-[var(--border)] bg-white/85 text-[var(--foreground)] backdrop-blur-sm hover:bg-white hover:text-[var(--primary)]",
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
