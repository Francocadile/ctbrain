// src/app/medico/wellness/page.tsx
import Link from "next/link";
import RoleGate from "@/components/auth/RoleGate";
import BackToMedico from "@/components/ui/BackToMedico";

export default function MedWellnessHubPage() {
  return (
    <RoleGate allow={["MEDICO", "ADMIN"]} requireTeam>
      <main className="min-h-[70vh] px-6 py-10 space-y-4">
        <BackToMedico />

        <header className="space-y-1">
          <h1 className="text-2xl font-bold">Wellness / RPE  Médico</h1>
          <p className="text-sm text-gray-600">
            Accedé a las vistas diarias de Wellness y RPE, con los mismos tableros operativos que usa el CT.
          </p>
        </header>

        <section className="max-w-xl rounded-xl border bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
            Monitoreo diario
          </div>
          <nav className="rounded-xl border bg-gray-50 p-1 flex gap-1">
            <Link
              href="/medico/wellness/wellness"
              className="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-gray-100"
            >
              Wellness
            </Link>
            <Link
              href="/medico/wellness/rpe"
              className="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-gray-100"
            >
              RPE
            </Link>
          </nav>
        </section>
      </main>
    </RoleGate>
  );
}
