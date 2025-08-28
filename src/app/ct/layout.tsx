import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function CTLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="h-12 px-4 flex items-center justify-between bg-white border-b">
        <div className="flex items-center gap-2 font-semibold">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded bg-black text-white text-xs">CT</span>
          <span className="text-sm">CTBrain · Cuerpo Técnico</span>
        </div>
        <div className="text-xs text-gray-500">
          {session.user?.name || session.user?.email} · {session.user?.role}
          <a href="/api/auth/signout" className="ml-3 underline">Salir</a>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-3">
        <div className="grid grid-cols-[180px,1fr] gap-3 py-3">
          <aside className="bg-white border rounded-xl p-2">
            <nav className="text-sm">
              <div className="px-2 py-1 text-[11px] font-semibold text-gray-500">PLANIFICACIÓN</div>
              <ul className="space-y-1">
                <li><Link href="/ct/plan-semanal" className="block px-2 py-1 rounded hover:bg-gray-50">Plan semanal</Link></li>
                <li><span className="block px-2 py-1 rounded text-gray-400 cursor-not-allowed">Ejercicios <small>PRONTO</small></span></li>
                <li><span className="block px-2 py-1 rounded text-gray-400 cursor-not-allowed">Dashboards <small>PRONTO</small></span></li>
              </ul>

              <div className="px-2 py-2 text-[11px] font-semibold text-gray-500">OPERATIVO</div>
              <ul className="space-y-1">
                <li><span className="block px-2 py-1 rounded text-gray-400 cursor-not-allowed">Cargas <small>PRONTO</small></span></li>
                <li><span className="block px-2 py-1 rounded text-gray-400 cursor-not-allowed">Reportes <small>PRONTO</small></span></li>
              </ul>

              <div className="px-2 py-2 text-[11px] font-semibold text-gray-500">SALIR</div>
              <ul>
                <li><a href="/api/auth/signout" className="block px-2 py-1 rounded hover:bg-gray-50">Cerrar sesión</a></li>
              </ul>
            </nav>
          </aside>

          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
