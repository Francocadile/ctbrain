


import RoleGate from "@/components/auth/RoleGate";
import SuperAdminSidebar from "./SuperAdminSidebar";
import CreateUserForm from "./CreateUserForm";
import UserRow from "./UserRow";
import prisma from "@/lib/prisma";

export default async function SuperAdminUsersPage() {
  let users: any[] = [];
  let teams: any[] = [];
  let error = null;
  try {
    users = await prisma.user.findMany();
    teams = await prisma.team.findMany();
  } catch (e: any) {
    error = e.message || "Error desconocido";
  }

  return (
    <RoleGate allow={["SUPERADMIN"]}>
      <div className="min-h-screen flex bg-gray-50">
        <SuperAdminSidebar />
        <main className="flex-1 p-3 md:p-4">
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
        </main>
      </div>
    </RoleGate>
  );
}
