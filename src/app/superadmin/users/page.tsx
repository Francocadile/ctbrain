


import RoleGate from "@/components/auth/RoleGate";
import Link from "next/link";
import { signOut } from "next-auth/react";
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
        {/* Sidebar */}
        <aside className="w-64 shrink-0 border-r bg-white p-3 space-y-3">
          <div className="px-2 py-1 text-[10px] font-semibold text-gray-500">SUPERADMIN</div>
          <ul className="space-y-0.5 mb-2">
            <li>
              <Link href="/superadmin/users" className="block rounded-md px-2 py-1.5 text-sm transition bg-black text-white">Usuarios</Link>
            </li>
            <li>
              <Link href="/superadmin/teams" className="block rounded-md px-2 py-1.5 text-sm transition hover:bg-gray-100">Equipos</Link>
            </li>
          </ul>
          <div className="px-2 py-1 text-[10px] font-semibold text-gray-500">SALIR</div>
          <ul className="space-y-0.5">
            <li>
              <button
                aria-label="Cerrar sesión"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="block w-full text-left rounded-md px-2 py-1.5 text-sm transition hover:bg-gray-100"
              >Cerrar sesión</button>
            </li>
          </ul>
        </aside>
        {/* Contenido */}
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
