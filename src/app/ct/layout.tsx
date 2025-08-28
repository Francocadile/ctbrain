import Link from "next/link";
import type { Route } from "next"; // 👈 para typedRoutes
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

/** Item del menú (si no hay href queda deshabilitado/PRONTO) */
function NavItem({
  href,
  children,
  soon,
}: {
  href?: Route; // 👈 tipado correcto para <Link/>
  children: React.ReactNode;
  soon?: boolean;
}) {
  if (!href) {
    return (
      <span className="block px-2 py-1 rounded text-gray-400 cursor-not-allowed">
        {children} {soon && <small className="ml-1">PRONTO</small>}
      </span>
    );
  }
  return (
    <Link href={href} className="block px-2 py-1 rounded hover:bg-gray-50">
      {children}
    </Link>
  );
}

export default async function CTLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Topbar */}
      <header className="h-11 px-3 flex items-center justify-between bg-white border-b">
        <div className="flex items-center gap-2 font-semibold">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-black text-white text-[10px]">
            CT
          </span>
          <span className="text-sm">CTBrain · Cuerpo Técnico</span>
        </div>
        <div className="text-[11px] text-gray-500">
          {session.user?.name || session.user?.email} · {session.user?.role}
          <a href="/api/auth/signout" className="ml-3 underline">
            Salir
          </a>
        </div>
      </header>

      {/* Shell */}
      <div className="mx-auto max-w-[1320px] px-2">
        <div className="grid grid-cols-[200px,1fr] gap-2 py-2">
          {/* Sidebar */}
          <aside className="bg-white border rounded-xl p-2">
            <nav className="text-[13px]">
              {/* INICIO */}
              <div className="px-2 py-1 text-[10px] font-semibold text-gray-500">
                INICIO
              </div>
              <ul className="space-y-0.5 mb-2">
                <li>
                  <NavItem href={"/ct"}>
                    Dashboard / Inicio rápido
                  </NavItem>
                </li>
              </ul>

              {/* PLANIFICACIÓN */}
              <div className="px-2 py-1 text-[10px] font-semibold text-gray-500">
                PLANIFICACIÓN
              </div>
              <ul className="space-y-0.5 mb-2">
                <li>
                  <NavItem href={"/ct/plan-semanal"}>
                    Plan semanal (Editor)
                  </NavItem>
                </li>
                <li>
                  <NavItem soon>
                    Sesiones y Ejercicios (almacén)
                  </NavItem>
                </li>
                <li>
                  <NavItem soon>
                    Plan de partido (Rivales & Videos)
                  </NavItem>
                </li>
                <li>
                  <NavItem soon>
                    Videos propios (colectivo / individual)
                  </NavItem>
                </li>
                <li>
                  <NavItem soon>
                    Calendario general / Competencia
                  </NavItem>
                </li>
              </ul>

              {/* MONITOREO */}
              <div className="px-2 py-1 text-[10px] font-semibold text-gray-500">
                MONITOREO
              </div>
              <ul className="space-y-0.5 mb-2">
                <li><NavItem soon>Carga semanal (planificado vs ejecutado)</NavItem></li>
                <li><NavItem soon>Rendimiento (colectivo / individual)</NavItem></li>
                <li><NavItem soon>Wellness</NavItem></li>
                <li><NavItem soon>RPE</NavItem></li>
                <li><NavItem soon>Lesionados</NavItem></li>
              </ul>

              {/* PERSONAS & RECURSOS */}
              <div className="px-2 py-1 text-[10px] font-semibold text-gray-500">
                PERSONAS & RECURSOS
              </div>
              <ul className="space-y-0.5 mb-2">
                <li><NavItem soon>Jugadores (ficha integral)</NavItem></li>
                <li><NavItem soon>Biblioteca / Recursos compartidos</NavItem></li>
                <li><NavItem soon>Notas / Bitácora del CT</NavItem></li>
              </ul>

              {/* SALIR */}
              <div className="px-2 py-1 text-[10px] font-semibold text-gray-500">
                SALIR
              </div>
              <ul>
                <li>
                  <a href="/api/auth/signout" className="block px-2 py-1 rounded hover:bg-gray-50">
                    Cerrar sesión
                  </a>
                </li>
              </ul>
            </nav>
          </aside>

          {/* Main content */}
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
