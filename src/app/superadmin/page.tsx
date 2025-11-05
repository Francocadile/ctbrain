import RoleGate from "@/components/auth/RoleGate";
import SuperAdminSidebar from "./users/SuperAdminSidebar";

export default async function SuperAdminPage() {
  return (
    <RoleGate allow={["SUPERADMIN"]}>
      <div className="min-h-screen flex bg-gray-50">
        <SuperAdminSidebar />
        <main className="flex-1 p-3 md:p-4">
          <header>
            <h1 className="text-3xl font-bold">Panel Global · SUPERADMIN</h1>
            <p className="mt-2 text-gray-600 text-sm">
              Control total sobre equipos, usuarios y configuración global.
            </p>
          </header>
          <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <a href="/superadmin/teams" className="rounded-xl border bg-white p-5 shadow-sm hover:bg-gray-50 transition cursor-pointer block">
              <h3 className="font-semibold">Equipos</h3>
              <p className="text-sm text-gray-500">Ver, crear, editar y eliminar equipos.</p>
            </a>
            <a href="/superadmin/users" className="rounded-xl border bg-white p-5 shadow-sm hover:bg-gray-50 transition cursor-pointer block">
              <h3 className="font-semibold">Usuarios</h3>
              <p className="text-sm text-gray-500">Gestión global de usuarios y roles.</p>
            </a>
            <a href="/superadmin/config" className="rounded-xl border bg-white p-5 shadow-sm hover:bg-gray-50 transition cursor-pointer block">
              <h3 className="font-semibold">Configuración</h3>
              <p className="text-sm text-gray-500">Toggles de módulos, auditoría y soporte.</p>
            </a>
          </section>
        </main>
      </div>
    </RoleGate>
  );
}
