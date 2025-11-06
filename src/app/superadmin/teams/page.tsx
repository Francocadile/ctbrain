// src/app/superadmin/teams/page.tsx

import RoleGate from "@/components/auth/RoleGate";
import dynamic from "next/dynamic";
import TeamRow from "./TeamRow";
import TopRightLogout from "@/components/auth/TopRightLogout";
import BackButton from "@/components/ui/BackButton";
import prisma from "@/lib/prisma";

const CreateTeamForm = dynamic(() => import("./CreateTeamForm"), { ssr: false });

export default async function SuperAdminTeamsPage() {
  // Fetch equipos desde el endpoint API
  let teams: any[] = [];
  let error = null;
  try {
    const baseUrl = typeof window === "undefined"
      ? process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"
      : "";
    const res = await fetch(`${baseUrl}/api/superadmin/teams`, { next: { revalidate: 0 } });
    if (!res.ok) throw new Error("No se pudo cargar la lista de equipos");
    teams = await res.json();
    // Enriquecer equipos con adminEmail y CTs
    const usersRes = await fetch(`${baseUrl}/api/superadmin/users`, { next: { revalidate: 0 } });
    const users = usersRes.ok ? await usersRes.json() : [];
    teams = teams.map((team: any) => {
      const admin = users.find((u: any) => u.role === "ADMIN" && u.teamId === team.id);
      const cts = users.filter((u: any) => u.role === "CT" && u.teamId === team.id);
      return {
        ...team,
        adminEmail: admin?.email || "",
        cts: cts.map((ct: any) => ({ id: ct.id, email: ct.email })),
      };
    });
  } catch (e: any) {
    error = e.message || "Error desconocido";
  }

  const Container = (await import("@/components/ui/container")).default;
  // Filtro visual de equipos (client component)
  // El filtro se implementa en un componente aparte para mantener la estética y funcionalidad
  // El siguiente bloque va antes de la tabla:
  // <TeamFilter teams={teams} onSelect={setFilteredTeams} />

  // Client component wrapper for filter state
  const TeamFilterWrapper = dynamic(() => import("./TeamFilter"), { ssr: false });

  // Estado filtrado (client only)
  // @ts-ignore
  if (typeof window !== "undefined") {
    const React = require("react");
    const [filteredTeams, setFilteredTeams] = React.useState(teams);
    React.useEffect(() => { setFilteredTeams(teams); }, [teams]);
    return (
      <RoleGate allow={["SUPERADMIN"]}>
        <main className="min-h-[60vh] px-6 py-10">
          <h1 className="text-2xl font-bold">Equipos · SUPERADMIN</h1>
          <p className="mt-2 text-sm text-gray-600">Gestiona todos los equipos de la plataforma.</p>
          <div className="mt-6">
            <CreateTeamForm />
          </div>
          {error && (
            <div className="mt-4 text-red-600">{error}</div>
          )}
          <section className="mt-8">
            <TeamFilterWrapper teams={teams} onSelect={setFilteredTeams} />
            <table className="min-w-full border rounded-xl bg-white">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">Logo</th>
                  <th className="px-4 py-2 text-left">Nombre</th>
                  <th className="px-4 py-2 text-left">ID</th>
                  <th className="px-4 py-2 text-left">Email ADMIN</th>
                  <th className="px-4 py-2 text-left">CTs</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeams.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-4 text-gray-400">No hay equipos registrados.</td></tr>
                ) : (
                  filteredTeams.map((team: any) => (
                    <TeamRow key={team.id} team={team} adminEmail={team.adminEmail} />
                  ))
                )}
              </tbody>
            </table>
          </section>
        </main>
      </RoleGate>
    );
  }
  // SSR fallback
  return (
    <RoleGate allow={["SUPERADMIN"]}>
      <main className="min-h-[60vh] px-6 py-10">
        <h1 className="text-2xl font-bold">Equipos · SUPERADMIN</h1>
        <p className="mt-2 text-sm text-gray-600">Gestiona todos los equipos de la plataforma.</p>
        <div className="mt-6">
          <CreateTeamForm />
        </div>
        {error && (
          <div className="mt-4 text-red-600">{error}</div>
        )}
        <section className="mt-8">
          <table className="min-w-full border rounded-xl bg-white">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">Logo</th>
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Email ADMIN</th>
                <th className="px-4 py-2 text-left">CTs</th>
                <th className="px-4 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {teams.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-4 text-gray-400">No hay equipos registrados.</td></tr>
              ) : (
                teams.map((team: any) => (
                  <TeamRow key={team.id} team={team} adminEmail={team.adminEmail} />
                ))
              )}
            </tbody>
          </table>
        </section>
      </main>
    </RoleGate>
  );
}
