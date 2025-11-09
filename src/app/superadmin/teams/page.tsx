// src/app/superadmin/teams/page.tsx
import RoleGate from "@/components/auth/RoleGate";
import dynamic from "next/dynamic";

const CreateTeamForm = dynamic(() => import("./CreateTeamForm"), { ssr: false });

export default async function SuperAdminTeamsPage() {
  // Fetch equipos desde el endpoint API
  let teams: any[] = [];
  let error = null;
  try {
    const res = await fetch("/superadmin/api/teams", { next: { revalidate: 0 } });
    if (!res.ok) throw new Error("No se pudo cargar la lista de equipos");
    teams = await res.json();
  } catch (e: any) {
    error = e.message || "Error desconocido";
  }

  return (
    <RoleGate allow={["SUPERADMIN"]}>
      <main className="min-h-[60vh] px-6 py-10">
        <h1 className="text-2xl font-bold">Equipos · SUPERADMIN</h1>
        <p className="mt-2 text-sm text-gray-600">Gestiona todos los equipos de la plataforma.</p>
        {error && (
          <div className="mt-4 text-red-600">{error}</div>
        )}
        <section className="mt-8">
          <CreateTeamForm />
          <table className="min-w-full border rounded-xl bg-white">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">ID</th>
              </tr>
            </thead>
            <tbody>
              {teams.length === 0 ? (
                <tr><td colSpan={2} className="px-4 py-4 text-gray-400">No hay equipos registrados.</td></tr>
              ) : (
                teams.map((team) => (
                  <tr key={team.id} className="border-t">
                    <td className="px-4 py-2">{team.name}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{team.id}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </main>
    </RoleGate>
  );
}
