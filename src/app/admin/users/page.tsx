// src/app/admin/users/page.tsx
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import RoleGate from "@/components/auth/RoleGate";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

/* =========================
   DATA
========================= */
async function getUsers() {
  return prisma.user.findMany({
    orderBy: [{ approved: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isApproved: true,
      createdAt: true,
    },
  });
}

/* =========================
   SERVER ACTIONS
========================= */
async function createUser(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "") as Role;

  if (!name || !email || !password) throw new Error("Completa nombre, email y contraseña.");
  if (!["ADMIN", "CT", "MEDICO", "JUGADOR", "DIRECTIVO"].includes(role))
    throw new Error("Rol inválido.");

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new Error("Ese email ya está registrado.");

  const hashed = await bcrypt.hash(password, 10);

  // Los usuarios creados por Admin se crean APROBADOS
  await prisma.user.create({
    data: { name, email, password: hashed, role, isApproved: true },
  });

  revalidatePath("/admin/users");
}

async function deleteUser(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID requerido.");
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/users");
}

async function updateRole(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  if (!id) throw new Error("ID requerido.");
  if (!["ADMIN", "CT", "MEDICO", "JUGADOR", "DIRECTIVO"].includes(role))
    throw new Error("Rol inválido.");

  await prisma.user.update({ where: { id }, data: { role } });
  revalidatePath("/admin/users");
}

async function setApproval(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const approved = String(formData.get("approved") ?? "") === "true";
  if (!id) throw new Error("ID requerido.");

  await prisma.user.update({ where: { id }, data: { isApproved: approved } });
  revalidatePath("/admin/users");
}

/* =========================
   PAGE
========================= */
export default async function AdminUsersPage() {
  const users = await getUsers();

  return (
    <RoleGate allow={["ADMIN"]}>
      <div className="space-y-8">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold">Usuarios</h1>
            <p className="mt-1 text-sm text-gray-600">
              Alta, aprobación, cambio de rol y baja de cuentas.
            </p>
          </div>
        </header>

        {/* Crear usuario */}
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Crear usuario</h2>
          <p className="mt-1 text-xs text-gray-500">
            Los usuarios creados aquí quedan <b>aprobados</b> automáticamente.
          </p>
          <form action={createUser} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5">
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
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Creado</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-gray-500" colSpan={6}>
                      No hay usuarios todavía.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2 font-medium">{u.name || "—"}</td>
                      <td className="px-3 py-2">{u.email}</td>
                      <td className="px-3 py-2">
                        <form action={updateRole} className="inline-flex items-center gap-2">
                          <input type="hidden" name="id" value={u.id} />
                          <select
                            name="role"
                            defaultValue={u.role}
                            className="rounded border px-2 py-1 text-xs"
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="CT">CT</option>
                            <option value="MEDICO">MEDICO</option>
                            <option value="JUGADOR">JUGADOR</option>
                            <option value="DIRECTIVO">DIRECTIVO</option>
                          </select>
                          <button
                            type="submit"
                            className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                            title="Guardar rol"
                          >
                            Guardar
                          </button>
                        </form>
                      </td>
                      <td className="px-3 py-2">
                        {u.isApproved ? (
                          <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            Aprobado
                          </span>
                        ) : (
                          <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-500">
                        {new Date(u.createdAt).toLocaleString("es-AR")}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-2">
                          {/* Aprobar / Suspender */}
                          <form action={setApproval}>
                            <input type="hidden" name="id" value={u.id} />
                            <input
                              type="hidden"
                              name="approved"
                              value={u.isApproved ? "false" : "true"}
                            />
                            <button
                              type="submit"
                              className={`rounded border px-3 py-1.5 text-xs font-medium ${
                                u.isApproved
                                  ? "text-amber-700 hover:bg-amber-50"
                                  : "text-emerald-700 hover:bg-emerald-50"
                              }`}
                            >
                              {u.isApproved ? "Suspender" : "Aprobar"}
                            </button>
                          </form>

                          {/* Eliminar */}
                          <form action={deleteUser}>
                            <input type="hidden" name="id" value={u.id} />
                            <button
                              type="submit"
                              className="rounded border px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              Eliminar
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </RoleGate>
  );
}
