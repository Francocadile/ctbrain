import RoleGate from "@/components/auth/RoleGate";
import dynamic from "next/dynamic";
import TopRightLogout from "@/components/auth/TopRightLogout";
import BackButton from "@/components/ui/BackButton";

const CreateUserForm = dynamic(() => import("./CreateUserForm"), { ssr: false });
const UserRow = dynamic(() => import("./UserRow"), { ssr: false });

export default async function SuperAdminUsersPage() {
  let users: any[] = [];
  let error = null;
  try {
    const res = await fetch("/api/superadmin/users", { next: { revalidate: 0 } });
    if (!res.ok) throw new Error("No se pudo cargar la lista de usuarios");
    users = await res.json();
  } catch (e: any) {
    error = e.message || "Error desconocido";
  }

  return (
    <RoleGate allow={["SUPERADMIN"]}>
      <main className="min-h-[60vh] px-6 py-10 relative">
        <TopRightLogout />
        <BackButton />
        <h1 className="text-2xl font-bold">Usuarios · SUPERADMIN</h1>
        <p className="mt-2 text-sm text-gray-600">Gestiona todos los usuarios y roles de la plataforma.</p>
        {error && (
          <div className="mt-4 text-red-600">{error}</div>
        )}
        <section className="mt-8">
          <CreateUserForm />
          <table className="min-w-full border rounded-xl bg-white mt-6">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">Email</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-4 text-gray-400">No hay usuarios registrados.</td></tr>
              ) : (
                users.map((user) => (
                  <UserRow key={user.id} user={user} />
                ))
              )}
            </tbody>
          </table>
        </section>
      </main>
    </RoleGate>
  );
}
