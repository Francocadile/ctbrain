import RoleGate from "@/components/auth/RoleGate";
import ReportsViewer from "@/components/reports/ReportsViewer";
import { listReportsForTeam } from "@/lib/reports";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function DirectivoInformesPage() {
  const reports = await listReportsForTeam({ roles: [Role.DIRECTIVO, Role.ADMIN, Role.CT] });

  return (
    <RoleGate allow={["DIRECTIVO", "ADMIN", "CT"]} requireTeam>
      <main className="min-h-[70vh] space-y-8 px-6 py-10">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Informes del cuerpo técnico</p>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Seguimiento estratégico del equipo</h1>
          <p className="mt-2 text-sm text-gray-600">
            Revisá reportes pre y post partido, análisis de microciclos y notas clave creadas por el cuerpo técnico del equipo seleccionado.
          </p>
        </header>

        <ReportsViewer initialReports={reports} />
      </main>
    </RoleGate>
  );
}
