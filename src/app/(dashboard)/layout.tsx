import { MvpDashboardNav } from "@/components/mvp-dashboard-nav";
import { HelpBot } from "@/components/help-bot";
import { Boxes } from "lucide-react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen relative overflow-hidden bg-slate-50 p-4 md:p-8">
      {/* Background elegant orbs */}
      <div className="absolute top-0 left-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-200/40 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 h-[600px] w-[600px] translate-x-1/3 translate-y-1/3 rounded-full bg-purple-200/40 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-200/30 blur-[100px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl space-y-6">
        <header className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-indigo-200 to-purple-200 opacity-40 blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-gradient-to-tr from-rose-100 to-amber-100 opacity-40 blur-3xl pointer-events-none"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm">
                <Boxes className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold tracking-[0.2em] text-indigo-900/70 uppercase">ARGSOFT MVP</p>
            </div>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 lg:text-5xl">
              Inventario y <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Facturación SRI</span>
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-slate-600 leading-relaxed">
              Gestiona todo tu catálogo, controla el stock en tiempo real y emite tus facturas fácilmente desde una sola plataforma unificada e intuitiva.
            </p>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <MvpDashboardNav />
          <section className="space-y-4">{children}</section>
        </div>
      </div>
      <HelpBot />
    </main>
  );
}
