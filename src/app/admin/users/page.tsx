// src/app/admin/users/page.tsx
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import RoleGate from "@/components/auth/RoleGate";
import { prisma } from "@/lib/prisma";
import { Prisma, Role, TeamRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { isRedirectError } from "next/dist/client/components/redirect";

/* =========================
   HELPERS
========================= */
const allowedPageRoles: Role[] = [
  Role.SUPERADMIN,
  Role.ADMIN,
  Role.CT,
  Role.MEDICO,
  Role.DIRECTIVO,
];

const creatableRoles: Role[] = [
  Role.ADMIN,
  Role.CT,
  Role.MEDICO,
  Role.JUGADOR,
  Role.DIRECTIVO,
];

function roleToTeamRole(role: Role): TeamRole {
  switch (role) {
    case Role.ADMIN:
      return TeamRole.ADMIN;
    case Role.CT:
      return TeamRole.CT;
    case Role.MEDICO:
      return TeamRole.MEDICO;
    case Role.JUGADOR:
      return TeamRole.JUGADOR;
    case Role.DIRECTIVO:
      return TeamRole.DIRECTIVO;
    default:
      throw new Error("Rol inválido.");
  }
}

function getSessionTeamId(session: Session | null | undefined): string | null {
  const userAny = session?.user as any;
  if (!userAny) return null;
  if (typeof userAny.currentTeamId === "string" && userAny.currentTeamId.trim().length > 0) {
    return userAny.currentTeamId;
  }
  if (Array.isArray(userAny.teamIds) && userAny.teamIds.length > 0) {
    return userAny.teamIds[0];
  }
  if (typeof userAny.teamId === "string" && userAny.teamId.trim().length > 0) {
    return userAny.teamId;
  }
  return null;
}

async function fetchUsers(session: Session) {
  const role = session.user.role as Role;
  if (!allowedPageRoles.includes(role)) {
    throw new Error("FORBIDDEN");
  }

  let query = "";
  if (role !== Role.SUPERADMIN) {
    const teamId = getSessionTeamId(session);
    if (!teamId) {
      throw new Error("FORBIDDEN");
    }
    query = `?teamId=${encodeURIComponent(teamId)}`;
  }

  const host = headers().get("host");
  const protocol = host?.includes("localhost") ? "http" : "https";
  const baseUrl = host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const cookieStore = cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const res = await fetch(`${baseUrl}/api/admin/users${query}`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : {},
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Error al cargar usuarios");
  }

  const data = await res.json();
  return data.users as Array<{
    id: string;
    name: string | null;
    email: string;
    role: Role;
    isApproved: boolean;
    createdAt: string;
  }>;
}

/* =========================
   SERVER ACTIONS
========================= */
async function createUser(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return redirect("/login");
  }

  const creatorRole = session.user.role as Role | undefined;
  if (!creatorRole || !allowedPageRoles.includes(creatorRole)) {
    return redirect("/login");
  }

  const providedTeamId = creatorRole === Role.SUPERADMIN ? String(formData.get("teamId") ?? "").trim() : null;
  const sessionTeamId = creatorRole === Role.SUPERADMIN ? providedTeamId || null : getSessionTeamId(session);
  if (!sessionTeamId && creatorRole !== Role.SUPERADMIN) {
    return redirect(
      `/admin/users?error=${encodeURIComponent("Tu sesión no tiene un equipo asignado.")}`
    );
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const roleValue = String(formData.get("role") ?? "").trim().toUpperCase();
  const role = roleValue as Role;

  if (!name || !email || !password) {
    return redirect(`/admin/users?error=${encodeURIComponent("Completa nombre, email y contraseña.")}`);
  }

  if (!creatableRoles.includes(role)) {
    return redirect(`/admin/users?error=${encodeURIComponent("Rol inválido.")}`);
  }

  try {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return redirect(`/admin/users?error=${encodeURIComponent("Ese email ya está registrado.")}`);
    }

    const hashed = await bcrypt.hash(password, 10);
    const data: Prisma.UserCreateInput = {
      name,
      email,
      passwordHash: hashed,
      role,
      isApproved: true,
    };

    if (sessionTeamId && role !== Role.SUPERADMIN) {
      data.teams = {
        create: [
          {
            role: roleToTeamRole(role),
            team: { connect: { id: sessionTeamId } },
          },
        ],
      };
    }

    await prisma.user.create({ data });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error("[admin/users] createUser error", error);
    let message = "No se pudo crear el usuario.";
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      message = "Ese email ya está registrado.";
    } else if (error instanceof Error && error.message) {
      message = error.message;
    }

    return redirect(`/admin/users?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/users");
  return redirect("/admin/users?status=created");
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
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("UNAUTHENTICATED");
  }
  const role = session.user.role as Role;
  if (!role || !allowedPageRoles.includes(role)) {
    throw new Error("FORBIDDEN");
  }

  const users = await fetchUsers(session);
  const successMessage =
    typeof searchParams?.status === "string" && searchParams.status === "created"
      ? "Usuario creado correctamente."
      : null;
  const errorMessage =
    typeof searchParams?.error === "string" && searchParams.error.length > 0
      ? (searchParams.error as string)
      : null;

  return (
    <RoleGate allow={allowedPageRoles}>
      <div className="space-y-8">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold">Usuarios</h1>
            <p className="mt-1 text-sm text-gray-600">
              Alta, aprobación, cambio de rol y baja de cuentas.
            </p>
          </div>
        </header>

        {(successMessage || errorMessage) && (
          <div className="space-y-3">
            {successMessage && (
              <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <span>{successMessage}</span>
                <a
                  href="/admin/users"
                  className="text-xs font-semibold uppercase tracking-wide text-emerald-900 underline"
                >
                  Ocultar
                </a>
              </div>
            )}
            {errorMessage && (
              <div className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <span>{errorMessage}</span>
                <a
                  href="/admin/users"
                  className="text-xs font-semibold uppercase tracking-wide text-red-900 underline"
                >
                  Ocultar
                </a>
              </div>
            )}
          </div>
        )}

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
