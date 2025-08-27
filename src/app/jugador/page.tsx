// src/app/jugador/page.tsx
import RoleGate from "@/components/auth/RoleGate";

export default async function JugadorPage() {
  return (
    <RoleGate allow={["JUGADOR"]}>
      <main className="min-h-[60vh] px-6 py-10">
        <h1 className="text-2xl font-bold">Panel — Jugador</h1>
        <p className="mt-2 text-sm text-gray-600">
          Solo usuarios con rol <b>JUGADOR</b> pueden ver esta página.
        </p>

        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="font-semibold">Agenda</h3>
            <p className="text-sm text-gray-500">Sesión del día y objetivos.</p>
          </div>
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="font-semibold">Individual</h3>
            <p className="text-sm text-gray-500">
              Rutinas asignadas 1 a 1.
            </p>
          </div>
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="font-semibold">Feedback</h3>
            <p className="text-sm text-gray-500">RPE y comentarios.</p>
          </div>
        </section>
      </main>
    </RoleGate>
  );
}
