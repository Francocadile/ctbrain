// src/app/admin/layout.tsx
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import TeamSwitcher from "@/components/nav/TeamSwitcher";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const name = session?.user?.name ?? "Usuario";
  const role = (session?.user as any)?.role ?? "ADMIN";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-black text-white grid place-items-center font-extrabold">
              CT
            </div>
            <div className="font-semibold">OPENBASE · Admin</div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <TeamSwitcher className="hidden min-w-[160px] md:flex" />
            <div className="hidden sm:block text-gray-600">
              <span className="font-medium">{name}</span>{" "}
              <span className="text-gray-400">·</span>{" "}
              <span className="rounded bg-gray-100 px-2 py-0.5">{role}</span>
            </div>

            {/* Logout vía POST a NextAuth (sin componentes cliente) */}
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
              >
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
            <Section title="General" />
            <NavItem href="/admin">Resumen</NavItem>
            <NavItem href="/admin/users">Usuarios</NavItem>
            <NavItem href="/admin/permissions" disabled>
              Permisos
            </NavItem>

            <Section title="Sistema" />
            <NavItem href="/admin/settings" disabled>
              Configuración
            </NavItem>
            <NavItem href="/admin/auditoria" disabled>
              Auditoría
            </NavItem>

            <Section title="Salir" />
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="w-full rounded-lg border px-3 py-2 text-left hover:bg-gray-50"
              >
                Cerrar sesión
              </button>
            </form>
          </nav>
        </aside>

        {/* Contenido */}
        <main className="min-h-[70vh]">
          {children}
        </main>
      </div>
    </div>
  );
}

function Section({ title }: { title: string }) {
  return <div className="mt-3 mb-1 text-[11px] font-semibold uppercase text-gray-400">{title}</div>;
}

function NavItem({
  href,
  children,
  disabled = false,
}: {
  href: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div className="cursor-not-allowed rounded-lg px-3 py-2 text-gray-400">
        {children}
        <span className="ml-2 text-[10px] uppercase tracking-wide">Pronto</span>
      </div>
    );
  }
  return (
    <Link
      href={href as any}
      className="block rounded-lg px-3 py-2 hover:bg-gray-50"
    >
      {children}
    </Link>
  );
}
