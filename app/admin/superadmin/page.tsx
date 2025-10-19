import RoleGate from "@/components/auth/RoleGate";

export default async function SuperadminHome() {
  return (
    <RoleGate allow={["SUPERADMIN"]}>
      <main className="p-6">
        <h1 className="text-2xl font-bold">Superadmin</h1>
        <p className="text-sm text-gray-600 mt-2">
          Acceso global. Próximo paso: CRUD de equipos e invitaciones.
        </p>
      </main>
    </RoleGate>
  );
}
