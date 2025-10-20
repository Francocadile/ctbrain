import RoleGate from "@/components/auth/RoleGate";

export const dynamic = "force-dynamic";

export default function SuperadminPage() {
  return (
  <RoleGate allow={["SUPERADMIN"]}>
      <div className="p-6 space-y-2">
        <h1 className="text-2xl font-bold">Panel SUPERADMIN</h1>
        <p>Acceso global habilitado. Próximo paso: gestión multi-equipo (crear/asignar equipos).</p>
      </div>
    </RoleGate>
  );
}
