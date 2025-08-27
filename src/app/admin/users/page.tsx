// src/app/admin/users/page.tsx
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { format } from "node:util";
import bcrypt from "bcryptjs";

/* -------------------------------------------
   DATA
--------------------------------------------*/
async function getUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
}

/* -------------------------------------------
   SERVER ACTIONS
--------------------------------------------*/
export async function createUser(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "") as Role;

  if (!name || !email || !password) {
    throw new Error("Completa nombre, email y contraseña.");
  }
  if (!["ADMIN", "CT", "MEDICO", "JUGADOR", "DIRECTIVO"].includes(role)) {
    throw new Error("Rol inválido.");
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new Error("Ese email ya está registrado.");

  const hashed = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: { name, email, password: hashed, role },
  });

  revalidatePath("/admin/users");
}

export async function deleteUser(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID requerido.");

  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/users");
}

/* -------------------------------------------
   PAGE
--------------------------------------------*/
export default async function AdminUsersPage() {
  const users = await getUsers();

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="mt-1 text-sm text-gray-600">
            Alta, baja y vista general de cuentas. (Roles: ADMIN, CT, MEDICO, JUGADOR, DIRECTIVO)
          </p>
        </div>
      </header>

      {/* Crear usuario */}
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Crear usuario</h2>
        <form
          action={createUser}
          className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5"
        >
          <input
            name="name"
            placeholder="Nombre"
            className="rounded-lg border px-3 py-2 md:col-span-1"
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            className="rounded-lg border px-3 py-2 md:col-span-2"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Contraseña (mín. 6)"
            className="rounded-lg border px-3 py-2 md:col-span-1"
            required
            minLength={6}
          />
          <select
            name="role"
            className="rounded-lg border px-3 py-2 md:col-span-1"
            defaultValue="JUGADOR"
            required
          >
            <option value="ADMIN">ADMIN</option>
            <option value="CT">CT</option>
            <option value="MEDICO">MEDICO</option>
            <option value="JUGADOR">JUGADOR</option>
            <option value="DIRECTIVO">DIRECTIVO</option>
          </select>

          <div className="md:col-span-5">
            <button
              type="submit"
              className="rounded-lg border bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90"
            >
              Crear usuario
            </button>
          </div>
        </form>
      </section>

      {/* Tabla de usuarios */}
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Listado</h2>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Rol</th>
                <th className="px-3 py-2">Creado</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-gray-500" colSpan={5}>
                    No hay usuarios todavía.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2 font-medium">{u.name}</td>
                    <td className="px-3 py-2">{u.email}</td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">
                      {new Date(u.createdAt).toLocaleString("es-AR")}
                    </td>
                    <td className="px-3 py-2">
                      <form action={deleteUser} className="flex justify-end">
                        <input type="hidden" name="id" value={u.id} />
                        <button
                          type="submit"
                          className="rounded-lg border px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Eliminar
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="text-xs text-gray-400">
        * Las acciones ejecutan en servidor (Server Actions) y refrescan la tabla automáticamente.
      </footer>
    </div>
  );
}
