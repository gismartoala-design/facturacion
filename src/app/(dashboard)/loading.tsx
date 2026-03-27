import Image from "next/image";

export default function DashboardLoading() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fdfcf5] p-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-90 w-90 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-200/30 blur-[90px]" />
        <div className="absolute bottom-0 right-1/4 h-105 w-105 translate-x-1/3 translate-y-1/3 rounded-full bg-rose-200/30 blur-[100px]" />
        <div className="absolute left-1/2 top-1/2 h-70 w-70 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-100/20 blur-[90px]" />
      </div>

      <div className="relative flex flex-col items-center gap-4">
        <div className="flex h-28 w-28 items-center justify-center rounded-[30px] border border-white/70 bg-white/82 shadow-[0_18px_44px_rgba(74,60,88,0.12)] backdrop-blur-xl">
          <Image
            src="/logo/logo-intuit.jpg"
            alt="ARGSOFT"
            width={72}
            height={72}
            className="animate-spin rounded-2xl object-contain [animation-duration:2.8s]"
            priority
          />
        </div>
        <p className="text-sm font-semibold tracking-[0.18em] text-[#4a3c58]/68 uppercase">
          Cargando
        </p>
      </div>
    </main>
  );
}
