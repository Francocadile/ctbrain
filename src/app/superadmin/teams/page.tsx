// src/app/superadmin/teams/page.tsx

import RoleGate from "@/components/auth/RoleGate";
import dynamic from "next/dynamic";
import TeamRow from "./TeamRow";
import TopRightLogout from "@/components/auth/TopRightLogout";
import BackButton from "@/components/ui/BackButton";
import prisma from "@/lib/prisma";

const CreateTeamForm = dynamic(() => import("./CreateTeamForm"), { ssr: false });

export default async function SuperAdminTeamsPage() {
  let teams: any[] = [];
  let error = null;
  try {
    // Consulta simplificada: solo id y name
    const rawTeams = await prisma.team.findMany({
      select: {
        id: true,
        name: true
      }
    });
    teams = rawTeams.map(team => ({
      id: team.id,
      name: team.name,
      users: [] // temporal, para mantener la estructura
    }));
  } catch (e: any) {
    console.error("[SuperAdminTeamsPage] Error:", e);
    error = (e && e.stack) ? e.stack : (e.message || "Error desconocido");
  }

  const Container = (await import("@/components/ui/container")).default;
  // Filtro de equipos (client component)
  // ...existing code...
  // El filtro se implementa en un componente aparte para mantener la estética y funcionalidad
  // El siguiente bloque debe ir antes de la tabla:
  // <TeamFilter teams={teams} onSelect={...} />

  // ...existing code...
  return (
    <RoleGate allow={["SUPERADMIN"]}>
      <main className="min-h-[60vh] bg-gray-50 py-10 relative">
        <Container>
          <TopRightLogout />
          <BackButton label="Volver al panel" />
          <h1 className="text-2xl font-bold">Equipos · SUPERADMIN</h1>
          <p className="mt-2 text-sm text-gray-600">Gestiona todos los equipos de la plataforma. Puedes crear, editar y eliminar equipos. Pronto podrás asignar CTs.</p>
          {error && (
            <div className="mt-4 text-red-600 font-semibold">{error}</div>
          )}
          <section className="mt-8">
            <CreateTeamForm />
            {/* Filtro de equipos */}
            <div className="mb-4 flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-700">Filtrar por equipo:</label>
              <select className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black" id="teamFilter" onChange={(e) => {
                const val = e.target.value;
                document.querySelectorAll('.team-row').forEach(row => {
                  if (val === "") row.classList.remove('hidden');
                  else row.classList.toggle('hidden', row.getAttribute('data-team-id') !== val);
                });
              }}>
                <option value="">Todos</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border rounded-xl bg-white mt-6 shadow-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">Nombre</th>
                    <th className="px-4 py-2 text-left">ID</th>
                    <th className="px-4 py-2 text-left">ADMIN Email</th>
                    <th className="px-4 py-2 text-left">CTs asignados</th>
                    <th className="px-4 py-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-4 text-gray-400 text-center">No hay equipos registrados.</td></tr>
                  ) : (
                    teams.map((team) => {
                      // Obtener usuarios CT asignados a este equipo
                      const cts = (team.users || []).filter((u: any) => u.role === "CT");
                      const admin = (team.users || []).find((u: any) => u.role === "ADMIN");
                      return (
                        <TeamRow key={team.id} team={{ id: team.id, name: team.name, cts: cts.map((ct: any) => ({ id: ct.id, email: ct.email })) }} adminEmail={admin?.email || "-"} rowProps={{ className: 'team-row', 'data-team-id': team.id }} />
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </Container>
      </main>
    </RoleGate>
  );
}
