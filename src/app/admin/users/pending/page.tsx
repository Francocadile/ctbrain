// src/app/admin/users/pending/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";

const prisma = new PrismaClient();

export default async function PendingUsersPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/login");

  const users = await prisma.user.findMany({
    where: { approved: false },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return (
    <main className="p-6">
      <h1 className="text-xl font-bold">Usuarios pendientes</h1>
      <p className="text-sm text-gray-600 mb-4">Aprobá el acceso de cuentas nuevas.</p>

      {users.length === 0 ? (
        <div className="rounded-lg border p-4 text-gray-600">No hay usuarios pendientes.</div>
      ) : (
        <ul className="space-y-3">
          {users.map((u) => (
            <li key={u.id} className="rounded-lg border p-3 bg-white flex items-center justify-between">
              <div>
                <div className="font-semibold">{u.name || u.email}</div>
                <div className="text-xs text-gray-500">
                  {u.email} · Rol: <b>{u.role}</b> · Alta: {u.createdAt.toLocaleString()}
                </div>
              </div>
              <form action={`/api/admin/users/${u.id}/approve`} method="post">
                <button
                  type="submit"
                  className="text-xs rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                  title="Aprobar"
                >
                  Aprobar
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
