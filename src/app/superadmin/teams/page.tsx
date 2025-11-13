// src/app/superadmin/teams/page.tsx
import RoleGate from "@/components/auth/RoleGate";
import dynamic from "next/dynamic";
import TeamRow from "./TeamRow";
const CreateTeamForm = dynamic(() => import("./CreateTeamForm"), { ssr: false });
export default async function SuperAdminTeamsPage({}) {
  // Aquí deberías obtener los datos de teams y error como antes
  let teams: any[] = [];
  let error: string | null = null;
  // ...fetch de equipos y manejo de error...
  return (
    <RoleGate allow={["SUPERADMIN"]}>
      <main className="min-h-[60vh] px-6 py-10">
        <h1 className="text-2xl font-bold">Equipos · SUPERADMIN</h1>
        <p className="mt-2 text-sm text-gray-600">
          Gestiona todos los equipos de la plataforma.
        </p>

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Bloque: crear nuevo equipo + admin */}
        <section className="mt-6 max-w-xl">
          <h2 className="text-lg font-semibold">Crear nuevo equipo</h2>
          <p className="mt-1 text-sm text-gray-500">
            Crea un equipo y su usuario administrador principal. Luego ese admin podrá crear sus propios usuarios.
          </p>
          <div className="mt-4 rounded-xl border bg-white p-4 shadow-sm">
            <CreateTeamForm />
          </div>
        </section>

        {/* Bloque: tabla de equipos */}
        <section className="mt-8">
          <table className="min-w-full border rounded-xl bg-white">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {teams.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-4 text-center text-sm text-gray-400"
                  >
                    No hay equipos registrados.
                  </td>
                </tr>
              ) : (
                teams.map((team) => <TeamRow key={team.id} team={team} />)
              )}
            </tbody>
          </table>
        </section>
      </main>
    </RoleGate>
  );
}
