import RoleGate from "@/components/auth/RoleGate";
import ReportComposer from "@/components/reports/ReportComposer";
import { listReportsForTeam } from "@/lib/reports";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function CTReportsPage() {
  const reports = await listReportsForTeam({ roles: [Role.CT, Role.ADMIN] });

  return (
    <RoleGate allow={["CT", "ADMIN"]} requireTeam>
      <main className="min-h-[70vh] space-y-8 px-6 py-10">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Módulo de informes</p>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Comparte reportes con Directivos</h1>
          <p className="mt-2 text-sm text-gray-600">
            Publicá informes estratégicos del microciclo, pre o post partido. Los directivos del equipo seleccionado los verán al instante.
          </p>
        </header>

        <ReportComposer initialReports={reports} />
      </main>
    </RoleGate>
  );
}
