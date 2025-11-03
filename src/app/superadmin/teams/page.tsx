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
    teams = await prisma.team.findMany();
  } catch (e: any) {
    error = e.message || "Error desconocido";
  }

  const Container = (await import("@/components/ui/container")).default;
  return (
    <RoleGate allow={["SUPERADMIN"]}>
      <main className="min-h-[60vh] bg-gray-50 py-10 relative">
        <Container>
          <TopRightLogout />
          <BackButton />
          <h1 className="text-2xl font-bold">Equipos · SUPERADMIN</h1>
          <p className="mt-2 text-sm text-gray-600">Gestiona todos los equipos de la plataforma. Puedes crear, editar y eliminar equipos. Pronto podrás asignar CTs.</p>
          {error && (
            <div className="mt-4 text-red-600 font-semibold">{error}</div>
          )}
          <section className="mt-8">
            <CreateTeamForm />
            <div className="overflow-x-auto">
              <table className="min-w-full border rounded-xl bg-white mt-6 shadow-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">Nombre</th>
                    <th className="px-4 py-2 text-left">ID</th>
                    <th className="px-4 py-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-4 text-gray-400 text-center">No hay equipos registrados.</td></tr>
                  ) : (
                    teams.map((team) => (
                      <TeamRow key={team.id} team={team} />
                    ))
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
