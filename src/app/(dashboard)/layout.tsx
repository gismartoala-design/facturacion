import { MvpDashboardNav } from "@/components/mvp-dashboard-nav";
import { HelpBot } from "@/components/help-bot";
import { LogoutButton } from "@/components/logout-button";
import { getSession } from "@/lib/auth";
import Image from "next/image";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  return (
    <main className="min-h-screen relative overflow-hidden bg-[#fdfcf5] p-3 md:p-6">
      {/* Background elegant orbs - Themed to DOVI VELAS (Lavender/Rose) */}
      <div className="pointer-events-none absolute left-1/4 top-0 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-200/30 blur-[90px]" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-[420px] w-[420px] translate-x-1/3 translate-y-1/3 rounded-full bg-rose-200/30 blur-[100px]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-100/20 blur-[90px]" />

      <div className="relative mx-auto max-w-7xl space-y-4">
        <header className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/75 px-4 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl md:px-5">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-purple-200 to-rose-200 opacity-35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-gradient-to-tr from-rose-100 to-amber-100 opacity-35 blur-3xl" />

          <div className="relative z-10">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)] overflow-hidden p-1 border border-[#e8d5e5]/30">
                    <Image src="/logo.png" alt="Logo DOVI VELAS" width={48} height={48} className="object-contain" priority />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold uppercase tracking-[0.18em] text-[#4a3c58]/70">DOVI VELAS</p>
                    <p className="truncate text-sm font-semibold text-slate-800">Panel operativo</p>
                  </div>
                </div>
                {session ? (
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-800">{session.name}</p>
                      <p className="text-xs text-slate-400">{session.role === "ADMIN" ? "Administrador" : "Vendedor"}</p>
                    </div>
                    <LogoutButton />
                  </div>
                ) : null}
              </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <MvpDashboardNav userRole={session?.role} />
          <section className="space-y-4">{children}</section>
        </div>
      </div>
      <HelpBot />
    </main>
  );
}
