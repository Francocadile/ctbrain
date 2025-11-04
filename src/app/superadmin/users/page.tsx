
import RoleGate from "@/components/auth/RoleGate";
import TopRightLogout from "@/components/auth/TopRightLogout";
import BackButton from "@/components/ui/BackButton";
import dynamic from "next/dynamic";

const CreateUserForm = dynamic(() => import("./CreateUserForm"), { ssr: false });
const EditUserModal = dynamic(() => import("./EditUserModal"), { ssr: false });

export default async function SuperAdminUsersPage() {
  let users: any[] = [];
  let teams: any[] = [];
  let error = null;
  try {
    const [usersRes, teamsRes] = await Promise.all([
      fetch("/api/superadmin/users", { next: { revalidate: 0 } }),
      fetch("/api/superadmin/teams", { next: { revalidate: 0 } })
    ]);
    if (!usersRes.ok) throw new Error("No se pudo cargar la lista de usuarios");
    if (!teamsRes.ok) throw new Error("No se pudo cargar la lista de equipos");
    users = await usersRes.json();
    teams = await teamsRes.json();
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
          <h1 className="text-2xl font-bold">Usuarios registrados</h1>
          <p className="mt-2 text-sm text-gray-600">Gestiona todos los usuarios, roles y equipos. Puedes editar, reasignar y eliminar usuarios.</p>
          {error && (
            <div className="mt-4 text-red-600 font-semibold">{error}</div>
          )}
          <section className="mt-8">
            <CreateUserForm teams={teams} />
            <div className="overflow-x-auto">
              <table className="min-w-full border rounded-xl bg-white mt-6 shadow-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">Nombre</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Equipo</th>
                    <th className="px-4 py-2 text-left">Rol</th>
                    <th className="px-4 py-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-4 text-gray-400 text-center">No hay usuarios registrados.</td></tr>
                  ) : (
                    users.map((user) => {
                      const team = teams.find((t: any) => t.id === user.teamId);
                      return (
                        <tr key={user.id} className={!user.teamId ? "bg-yellow-100" : ""}>
                          <td className="px-4 py-2 font-medium">{user.name || "-"}</td>
                          <td className="px-4 py-2 text-xs text-gray-700">{user.email}</td>
                          <td className="px-4 py-2 text-xs text-gray-700">{team ? team.name : <span className="text-red-600 font-semibold">Sin equipo</span>}</td>
                          <td className="px-4 py-2 text-xs text-gray-700">{user.role}</td>
                          <td className="px-4 py-2">
                            <EditUserModal user={user} teams={teams} />
                            <button className="ml-2 text-red-600 hover:underline" onClick={async () => {
                              if (!confirm("¿Seguro que deseas eliminar este usuario?")) return;
                              await fetch("/api/superadmin/users", {
                                method: "DELETE",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ id: user.id })
                              });
                              window.location.reload();
                            }}>Eliminar</button>
                          </td>
                        </tr>
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
