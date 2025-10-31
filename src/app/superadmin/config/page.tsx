import TopRightLogout from "@/components/auth/TopRightLogout";
import BackButton from "@/components/ui/BackButton";
import RoleGate from "@/components/auth/RoleGate";

export default function SuperAdminConfigPage() {
  return (
    <RoleGate allow={["SUPERADMIN"]}>
      <main className="min-h-[60vh] px-6 py-10 relative">
        <TopRightLogout />
        <BackButton />
        <h1 className="text-2xl font-bold">Configuración Global · SUPERADMIN</h1>
        <p className="mt-2 text-sm text-gray-600">Aquí irán los toggles de módulos, seeds, auditoría y endpoints dev/ops.</p>
        {/* Aquí se agregarán los controles globales en futuras fases */}
      </main>
    </RoleGate>
  );
}
