import TopRightLogout from "@/components/auth/TopRightLogout";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import RoleGate from "@/components/auth/RoleGate";

export default function SuperAdminConfigPage() {
  return (
    <RoleGate allow={["SUPERADMIN"]}>
      <main className="min-h-[60vh] px-6 py-10 relative">
        <TopRightLogout />
        <button onClick={() => window.history.back()} className="absolute left-6 top-8 flex items-center text-gray-600 hover:text-blue-600">
          <ArrowLeftIcon className="h-5 w-5 mr-1" /> Volver
        </button>
        <h1 className="text-2xl font-bold">Configuración Global · SUPERADMIN</h1>
        <p className="mt-2 text-sm text-gray-600">Aquí irán los toggles de módulos, seeds, auditoría y endpoints dev/ops.</p>
        {/* Aquí se agregarán los controles globales en futuras fases */}
      </main>
    </RoleGate>
  );
}
