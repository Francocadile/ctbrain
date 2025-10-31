// src/app/superadmin/teams/page.tsx
import RoleGate from "@/components/auth/RoleGate";
import dynamic from "next/dynamic";
import TeamRow from "./TeamRow";
import TopRightLogout from "@/components/auth/TopRightLogout";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

const CreateTeamForm = dynamic(() => import("./CreateTeamForm"), { ssr: false });

export default async function SuperAdminTeamsPage() {
  // Fetch equipos desde el endpoint API
  let teams: any[] = [];
  let error = null;
  try {
  const res = await fetch("/api/superadmin/teams", { next: { revalidate: 0 } });
    if (!res.ok) throw new Error("No se pudo cargar la lista de equipos");
    teams = await res.json();
  } catch (e: any) {
    error = e.message || "Error desconocido";
  }

  return (
    <RoleGate allow={["SUPERADMIN"]}>
      <main className="min-h-[60vh] px-6 py-10 relative">
        <TopRightLogout />
        <button onClick={() => window.history.back()} className="absolute left-6 top-8 flex items-center text-gray-600 hover:text-blue-600">
          <ArrowLeftIcon className="h-5 w-5 mr-1" /> Volver
        </button>
        <h1 className="text-2xl font-bold">Equipos · SUPERADMIN</h1>
        <p className="mt-2 text-sm text-gray-600">Gestiona todos los equipos de la plataforma.</p>
        {error && (
          <div className="mt-4 text-red-600">{error}</div>
        )}
        <section className="mt-8">
          <CreateTeamForm />
          <table className="min-w-full border rounded-xl bg-white mt-6">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {teams.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-4 text-gray-400">No hay equipos registrados.</td></tr>
              ) : (
                teams.map((team) => (
                  <TeamRow key={team.id} team={team} />
                ))
              )}
            </tbody>
          </table>
        </section>
      </main>
    </RoleGate>
  );
}
