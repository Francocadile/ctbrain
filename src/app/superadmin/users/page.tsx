import RoleGate from "@/components/auth/RoleGate";
import prisma from "@/lib/prisma";
import dynamic from "next/dynamic";

const CreateUserForm = dynamic(() => import("./CreateUserForm"), { ssr: false });
const UserRow = dynamic(() => import("./UserRow"), { ssr: false });

export default async function SuperAdminUsersPage() {
  let error: string | null = null;

  const users = await prisma.user
    .findMany({
      include: {
        teams: {
          include: { team: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })
    .catch((e: any) => {
      console.error("[SUPERADMIN_USERS_PAGE_GET]", e);
      error = e?.message || "Error desconocido";
      return [] as any[];
    });

  const rows = users.map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    teamId: u.teams?.[0]?.teamId ?? null,
    teamName: u.teams?.[0]?.team?.name ?? "Sin equipo",
  }));

  const teams = await prisma.team
    .findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    })
    .catch((e: any) => {
      console.error("[SUPERADMIN_USERS_PAGE_TEAMS_GET]", e);
      // No pisamos error de usuarios, solo dejamos teams vacío si falla
      return [] as { id: string; name: string }[];
    });

  const totalUsers = rows.length;

  const teamsMap = new Map<string, string>();
  rows.forEach((row) => {
    if (row.teamId) {
      teamsMap.set(row.teamId, row.teamName);
    }
  });
  const totalTeams = teamsMap.size;

  const usersByTeamMap = new Map<string, number>();
  rows.forEach((row) => {
    const key = row.teamId || "Sin equipo";
    usersByTeamMap.set(key, (usersByTeamMap.get(key) || 0) + 1);
  });
  const usersByTeam = Array.from(usersByTeamMap.entries()).map(([key, count]) => ({
    name: key === "Sin equipo" ? "Sin equipo" : teamsMap.get(key) || key,
    count,
  }));

  return (
    <RoleGate allow={["SUPERADMIN"]}>
      <main className="min-h-[60vh] px-6 py-10">
        <h1 className="text-2xl font-bold">Usuarios · SUPERADMIN</h1>
        <p className="mt-2 text-sm text-gray-600">Gestiona todos los usuarios de la plataforma.</p>
        {error && <div className="mt-4 text-red-600">{error}</div>}

        <section className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white shadow rounded-lg p-4">
            <h2 className="text-sm font-medium text-gray-500">Total usuarios</h2>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{totalUsers}</p>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <h2 className="text-sm font-medium text-gray-500">Equipos con usuarios</h2>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{totalTeams}</p>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <h2 className="text-sm font-medium text-gray-500">Usuarios por equipo</h2>
            <ul className="mt-2 space-y-1 text-sm text-gray-700">
              {usersByTeam.map((team) => (
                <li key={team.name} className="flex justify-between">
                  <span>{team.name}</span>
                  <span className="font-medium">{team.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-8">
          <table className="min-w-full border rounded-xl bg-white">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Rol</th>
                <th className="px-4 py-2 text-left">Equipo</th>
                <th className="px-4 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-gray-400">
                    No hay usuarios registrados.
                  </td>
                </tr>
              ) : (
                rows.map((user) => (
                  <UserRow key={user.id} user={user} teams={teams} />
                ))
              )}
            </tbody>
          </table>
        </section>
      </main>
    </RoleGate>
  );
}
