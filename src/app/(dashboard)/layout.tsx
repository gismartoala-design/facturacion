import { DashboardUserMenu } from "@/components/dashboard-user-menu";
import { MvpDashboardNav } from "@/components/mvp-dashboard-nav";
import { getSession } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const roleLabel = session?.role === "ADMIN" ? "Administrador" : "Vendedor";

  return (
    <main className="relative min-h-screen overflow-x-hidden p-3 md:p-4 xl:p-6">
      <div className="relative mx-auto max-w-400">
        <div className="lg:hidden">
          <MvpDashboardNav userRole={session?.role} />
        </div>

        <div className="hidden lg:fixed lg:bottom-4 lg:left-4 lg:top-4 lg:z-40 lg:block lg:w-70 xl:bottom-6 xl:left-6 xl:top-6 xl:w-74">
          <MvpDashboardNav userRole={session?.role} />
        </div>

        {session ? (
          <div className="mb-3 flex justify-end lg:fixed lg:right-4 lg:top-4 lg:z-50 lg:mb-0 xl:right-6 xl:top-6">
            <DashboardUserMenu name={session.name} roleLabel={roleLabel} />
          </div>
        ) : null}

        <div className="min-w-0 lg:ml-76 xl:ml-82">
          <section className="min-w-0">
            <div className="flex flex-col">{children}</div>
          </section>
        </div>
      </div>
    </main>
  );
}
