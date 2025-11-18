import RoleGate from "@/components/auth/RoleGate";
import prisma from "@/lib/prisma";
import dynamic from "next/dynamic";

const CreateUserForm = dynamic(() => import("./CreateUserForm"), { ssr: false });
const UserRow = dynamic(() => import("./UserRow"), { ssr: false });

export default async function SuperAdminUsersPage() {
  let error: string | null = null;

  const users = await prisma.user
    .findMany({
      include: { teams: true },
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
  }));

  return (
    <RoleGate allow={["SUPERADMIN"]}>
      <main className="min-h-[60vh] px-6 py-10">
        <h1 className="text-2xl font-bold">Usuarios · SUPERADMIN</h1>
        <p className="mt-2 text-sm text-gray-600">Gestiona todos los usuarios de la plataforma.</p>
        {error && <div className="mt-4 text-red-600">{error}</div>}
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
                rows.map((user) => <UserRow key={user.id} user={user} />)
              )}
            </tbody>
          </table>
        </section>
      </main>
    </RoleGate>
  );
}
