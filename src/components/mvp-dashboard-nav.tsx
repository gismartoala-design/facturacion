"use client";

import { Boxes, ClipboardList, PackageSearch, ShoppingCart, WalletCards } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  hint: string;
  icon: typeof Boxes;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/overview", label: "Resumen", hint: "Vista operativa", icon: Boxes },
  { href: "/products", label: "Productos", hint: "Catalogo", icon: ClipboardList },
  { href: "/inventory", label: "Inventario", hint: "Stock y ajustes", icon: PackageSearch },
  { href: "/checkout", label: "Checkout", hint: "Venta + SRI", icon: ShoppingCart },
  { href: "/sri", label: "Facturacion SRI", hint: "Reintentos", icon: WalletCards },
];

export function MvpDashboardNav() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-8 lg:block lg:h-fit">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block w-full rounded-xl border px-3 py-3 text-left transition",
                isActive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-transparent bg-slate-50 text-slate-700 hover:border-slate-200 hover:bg-white",
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
        {NAV_ITEMS.map((item) => (
          <Link
            key={`mobile-${item.href}`}
            href={item.href}
            className={cn(
              "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border px-3 text-sm font-medium transition-colors",
              pathname === item.href
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </>
  );
}
