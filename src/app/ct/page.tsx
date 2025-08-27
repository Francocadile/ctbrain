// src/app/ct/page.tsx
import RoleGate from "@/components/auth/RoleGate";

export default async function CtPage() {
  return (
    <RoleGate allow={["CT"]}>
      <main className="min-h-[60vh] px-6 py-10">
        <h1 className="text-2xl font-bold">Panel — Cuerpo Técnico</h1>
        <p className="mt-2 text-sm text-gray-600">
          Solo usuarios con rol <b>CT</b> pueden ver esta página.
        </p>

        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="font-semibold">Plan Semanal</h3>
            <p className="text-sm text-gray-500">
              Microciclo, cargas, tareas.
            </p>
          </div>
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="font-semibold">Ejercicios</h3>
            <p className="text-sm text-gray-500">
              Biblioteca tipo TacticalPad.
            </p>
          </div>
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="font-semibold">Dashboards</h3>
            <p className="text-sm text-gray-500">KPIs por jugador y global.</p>
          </div>
        </section>
      </main>
    </RoleGate>
  );
}
