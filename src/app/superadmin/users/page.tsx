

import RoleGate from "@/components/auth/RoleGate";
import TopRightLogout from "@/components/auth/TopRightLogout";
import BackButton from "@/components/ui/BackButton";

import CreateUserForm from "./CreateUserForm";
import UserRow from "./UserRow";
import EditUserModal from "./EditUserModal";

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
          <h1 className="text-2xl font-bold">Gestión de usuarios</h1>
          <p className="mt-2 text-sm text-gray-600">Administra todos los usuarios, roles y equipos. Puedes crear, editar, eliminar, aprobar y reasignar usuarios.</p>
          {error && (
            <div className="mt-4 text-red-600 font-semibold">{error}</div>
          )}
          <section className="mt-8">
            {/* Formulario de creación de usuario */}
            <CreateUserForm teams={teams} />
            {/* Tabla de usuarios */}
            <div className="overflow-x-auto">
              <table className="min-w-full border rounded-xl bg-white mt-6 shadow-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">Nombre</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Rol</th>
                    <th className="px-4 py-2 text-left">Equipo</th>
                    <th className="px-4 py-2 text-left">Estado</th>
                    <th className="px-4 py-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-4 text-gray-400 text-center">No hay usuarios registrados.</td></tr>
                  ) : (
                    users.map((user) => (
                      <UserRow key={user.id} user={user} teams={teams} />
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
