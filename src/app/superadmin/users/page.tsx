

import RoleGate from "@/components/auth/RoleGate";
import TopRightLogout from "@/components/auth/TopRightLogout";
import BackButton from "@/components/ui/BackButton";

import CreateUserForm from "./CreateUserForm";
import EditUserModal from "./EditUserModal";

export default async function SuperAdminUsersPage() {
  let users: any[] = [];
  let teams: any[] = [];
  let error = null;
  try {
    const [usersRes, teamsRes] = await Promise.all([
      fetch("/api/superadmin/users", { next: { revalidate: 0 } }),
      fetch("/api/superadmin/teams", { next: { revalidate: 0 } })
    ]);
    if (!usersRes.ok) throw new Error("No se pudo cargar la lista de usuarios");
    if (!teamsRes.ok) throw new Error("No se pudo cargar la lista de equipos");
    users = await usersRes.json();
    teams = await teamsRes.json();
  } catch (e: any) {
    error = e.message || "Error desconocido";
  }

  const Container = (await import("@/components/ui/container")).default;
    return (
      <RoleGate allow={["SUPERADMIN"]}>
        <main className="min-h-[60vh] bg-gray-50 py-10 relative">
          <Container>
            <TopRightLogout />
            <BackButton />
            <h1 className="text-2xl font-bold">Configuración de equipos</h1>
            <p className="mt-2 text-sm text-gray-600">Gestiona los equipos y la configuración global de la plataforma.</p>
            {/* Aquí puedes agregar componentes de equipos y configuración global */}
          </Container>
        </main>
      </RoleGate>
    );
}
