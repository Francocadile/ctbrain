// src/app/superadmin/teams/page.tsx
import RoleGate from "@/components/auth/RoleGate";
import dynamic from "next/dynamic";
import TeamRow from "./TeamRow";
import { headers } from "next/headers";
const CreateTeamForm = dynamic(() => import("./CreateTeamForm"), { ssr: false });
export default async function SuperAdminTeamsPage() {
  const heads = headers();
  const host = heads.get("host");
  const protocol = heads.get("x-forwarded-proto") ?? "https";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${protocol}://${host}`;

  let teams: any[] = [];
  let error: string | null = null;

  try {
    const res = await fetch(`${baseUrl}/api/superadmin/teams`, { cache: "no-store" });

    if (!res.ok) {
      let detail = "";
      try {
        const json = await res.json();
        if (json?.error) detail = ` (${json.error})`;
      } catch {}
      throw new Error(`Status ${res.status}${detail}`);
    }

    teams = await res.json();
  } catch (e: any) {
    error = e.message;
  }

  return (
    <RoleGate allow={["SUPERADMIN"]}>
      <main className="min-h-[70vh] px-6 py-10 space-y-10">
        {/* Título */}
        <header>
          <h1 className="text-3xl font-bold">Equipos · SUPERADMIN</h1>
          <p className="text-gray-600 mt-1">
            Gestiona equipos, administradores y estructura global.
          </p>
        </header>

        {/* Formulario Crear Equipo */}
        <section className="rounded-xl border bg-white shadow-sm p-6 max-w-2xl">
          <h2 className="text-xl font-semibold mb-4">Crear nuevo equipo</h2>
          <p className="text-sm text-gray-500 mb-4">
            Crea un equipo y su usuario administrador principal.
          </p>
          <CreateTeamForm />
        </section>

        {/* Tabla de equipos */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Equipos existentes</h2>

          {error && (
            <div className="mb-4 text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="overflow-hidden rounded-xl border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Nombre</th>
                  <th className="px-4 py-2 text-left font-medium">ID</th>
                  <th className="px-4 py-2 text-left font-medium">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {teams.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-6 text-center text-gray-400"
                    >
                      No hay equipos registrados.
                    </td>
                  </tr>
                ) : (
                  teams.map((team) => (
                    <TeamRow key={team.id} team={team} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </RoleGate>
  );
}
