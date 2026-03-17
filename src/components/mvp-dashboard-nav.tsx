"use client";

import { Boxes, ClipboardList, PackageSearch, ShoppingCart, Users, WalletCards } from "lucide-react";
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
  { href: "/checkout", label: "Facturar Venta", hint: "Venta + SRI", icon: ShoppingCart },
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
      <aside className="hidden space-y-2 rounded-3xl border border-white/60 bg-white/70 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl lg:sticky lg:top-8 lg:block lg:h-fit">
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
                  ? "border-[#e8d5e5] bg-white shadow-md text-[#4a3c58] font-semibold translate-x-1"
                  : "border-transparent bg-transparent text-slate-600 hover:bg-white/60 hover:text-[#4a3c58]",
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
      </aside>

      <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
        {visibleItems.map((item) => (
          <Link
            key={`mobile-${item.href}`}
            href={item.href}
            className={cn(
              "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-xl border px-4 text-sm font-medium transition-all shadow-sm",
              pathname === item.href
                ? "border-transparent bg-gradient-to-tr from-[#b1a1c6] to-[#4a3c58] text-white shadow-md"
                : "border-slate-200 bg-white/80 text-slate-700 hover:bg-white hover:text-[#4a3c58] backdrop-blur-sm",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </>
  );
}
