// src/app/superadmin/teams/page.tsx
import RoleGate from "@/components/auth/RoleGate";

export default async function SuperAdminTeamsPage() {
  return (
    <RoleGate allow={["SUPERADMIN"]}>
      <main className="min-h-[60vh] px-6 py-10">
        <h1 className="text-2xl font-bold">Equipos · SUPERADMIN</h1>
        <p className="mt-2 text-sm text-gray-600">Gestiona todos los equipos de la plataforma.</p>
        {/* Aquí irá la tabla/lista de equipos y acciones CRUD */}
      </main>
    </RoleGate>
  );
}
