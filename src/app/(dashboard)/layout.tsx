import { MvpDashboardNav } from "@/components/mvp-dashboard-nav";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#ecfeff,_#f8fafc_45%,_#f1f5f9)] p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="rounded-2xl border border-emerald-100 bg-white/90 p-6 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">ARGSOFT</p>
        </header>

        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <MvpDashboardNav />
          <section className="space-y-4">{children}</section>
        </div>
      </div>
    </main>
  );
}
