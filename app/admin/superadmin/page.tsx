import RoleGate from "@/components/auth/RoleGate";

export default async function SuperadminPage() {
  return (
    <RoleGate allow={["SUPERADMIN"]}>
      <main className="p-6">
        <h1 className="text-2xl font-bold">Panel — Superadmin</h1>
        <p className="text-sm text-gray-500">
          Acceso global a equipos, invitaciones y auditoría.
        </p>
      </main>
    </RoleGate>
  );
}
