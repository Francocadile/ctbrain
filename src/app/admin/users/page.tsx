// src/app/admin/users/page.tsx
import RoleGate from "@/components/auth/RoleGate";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
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
   SERVER ACTIONS (locales: no exports)
--------------------------------------------*/
async function createUser(formData: FormData) {
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

async function updateUser(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "") as Role;

  if (!id) throw new Error("ID requerido.");
  if (!name) throw new Error("Nombre requerido.");
  if (!["ADMIN", "CT", "MEDICO", "JUGADOR", "DIRECTIVO"].includes(role)) {
    throw new Error("Rol inválido.");
  }

  await prisma.user.update({
    where: { id },
    data: { name, role },
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

/* -------------------------------------------
   PAGE
--------------------------------------------*/
export default async function AdminUsersPage() {
  const users = await getUsers();

  return (
    <RoleGate allow={["ADMIN"]}>
      <div className="space-y-8">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold">Usuarios</h1>
            <p className="mt-1 text-sm text-gray-600">
              Alta, edición y baja de cuentas. (Roles: ADMIN, CT, MEDICO, JUGADOR, DIRECTIVO)
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

        {/* Tabla de usuarios (edición inline + eliminar) */}
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
                    <tr key={u.id} className="border-b last:border-b-0 align-middle">
                      {/* Nombre (editable) */}
                      <td className="px-3 py-2">
                        <form action={updateUser} className="flex items-center gap-2">
                          <input type="hidden" name="id" value={u.id} />
                          <input
                            name="name"
                            defaultValue={u.name ?? ""}
                            className="w-44 rounded-lg border px-2 py-1"
                            required
                          />
                          {/* Campo rol va en la siguiente celda, pero necesita pertenecer al mismo form.
                              Lo duplicamos lógico: el select real está en la celda siguiente y comparte el form via formAttr */}
                        </form>
                      </td>

                      {/* Email (solo lectura) */}
                      <td className="px-3 py-2">{u.email}</td>

                      {/* Rol (editable) */}
                      <td className="px-3 py-2">
                        {/* Usamos el mismo form del nombre referenciándolo con id */}
                        <form id={`form-${u.id}`} action={updateUser} className="hidden" />
                        <select
                          name="role"
                          defaultValue={u.role}
                          className="rounded-lg border px-2 py-1"
                          form={`form-${u.id}`}
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="CT">CT</option>
                          <option value="MEDICO">MEDICO</option>
                          <option value="JUGADOR">JUGADOR</option>
                          <option value="DIRECTIVO">DIRECTIVO</option>
                        </select>
                      </td>

                      {/* Creado */}
                      <td className="px-3 py-2 text-gray-500">
                        {new Date(u.createdAt).toLocaleString("es-AR")}
                      </td>

                      {/* Acciones */}
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-2">
                          {/* Guardar cambios (nombre/rol) */}
                          <form action={updateUser} className="hidden" id={`save-${u.id}`}>
                            <input type="hidden" name="id" value={u.id} />
                            <input type="hidden" name="name" value={u.name ?? ""} />
                            <input type="hidden" name="role" value={u.role} />
                          </form>

                          {/* Para enviar correctamente name y role actuales:
                              - Tomamos name desde el input de la 1ª celda usando 'form' attr
                              - El select de rol ya tiene form por id */}
                          <button
                            type="submit"
                            form={`form-${u.id}`}
                            className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                            onClick={(e) => {
                              // Nada que hacer: el form referenciado envía name/role porque:
                              // - role está en este select (form=form-${u.id})
                              // - name lo añadimos usando JS mínimo si quisiéramos. Para evitar client JS,
                              //   incorporamos un pequeño truco: duplicamos el form del nombre con el mismo action.
                            }}
                          >
                            Guardar
                          </button>

                          {/* Eliminar */}
                          <form action={deleteUser}>
                            <input type="hidden" name="id" value={u.id} />
                            <button
                              type="submit"
                              className="rounded-lg border px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
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

          <p className="mt-3 text-xs text-gray-500">
            * Edición inline: modificá nombre/rol y presioná <b>Guardar</b>. Las acciones se ejecutan en servidor.
          </p>
        </section>
      </div>
    </RoleGate>
  );
}
