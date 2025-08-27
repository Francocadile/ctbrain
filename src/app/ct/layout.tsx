// src/app/ct/layout.tsx
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function CtLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const name = session?.user?.name ?? "Usuario";
  const role = (session?.user as any)?.role ?? "CT";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-black font-extrabold text-white">
              CT
            </div>
            <div className="font-semibold">CTBrain · Cuerpo Técnico</div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="hidden text-gray-600 sm:block">
              <span className="font-medium">{name}</span>{" "}
              <span className="text-gray-400">·</span>{" "}
              <span className="rounded bg-gray-100 px-2 py-0.5">{role}</span>
            </div>
            <form action="/api/auth/signout" method="post">
              <button type="submit" className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-gray-50">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <aside className="h-max rounded-2xl border bg-white p-4">
          <nav className="space-y-1 text-sm">
            <Section title="Planificación" />
            <NavItem href="/ct">Plan Semanal</NavItem>
            <NavItem href="/ct/ejercicios" disabled>Ejercicios</NavItem>
            <NavItem href="/ct/dashboards" disabled>Dashboards</NavItem>

            <Section title="Operativo" />
            <NavItem href="/ct/cargas" disabled>Cargas</NavItem>
            <NavItem href="/ct/reportes" disabled>Reportes</NavItem>

            <Section title="Salir" />
            <form action="/api/auth/signout" method="post">
              <button type="submit" className="w-full rounded-lg border px-3 py-2 text-left hover:bg-gray-50">
                Cerrar sesión
              </button>
            </form>
          </nav>
        </aside>

        {/* Contenido */}
        <main className="min-h-[70vh]">{children}</main>
      </div>
    </div>
  );
}

function Section({ title }: { title: string }) {
  return <div className="mb-1 mt-3 text-[11px] font-semibold uppercase text-gray-400">{title}</div>;
}
function NavItem({ href, children, disabled = false }: { href: string; children: React.ReactNode; disabled?: boolean }) {
  if (disabled) {
    return (
      <div className="cursor-not-allowed rounded-lg px-3 py-2 text-gray-400">
        {children}
        <span className="ml-2 text-[10px] uppercase tracking-wide">Pronto</span>
      </div>
    );
  }
  return <Link href={href as any} className="block rounded-lg px-3 py-2 hover:bg-gray-50">{children}</Link>;
}
