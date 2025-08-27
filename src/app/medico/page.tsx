// src/app/medico/page.tsx
import RoleGate from "@/components/auth/RoleGate";

export default async function MedicoPage() {
  return (
    <RoleGate allow={["MEDICO"]}>
      <main className="min-h-[60vh] px-6 py-10">
        <h1 className="text-2xl font-bold">Panel — Médico</h1>
        <p className="mt-2 text-sm text-gray-600">
          Solo usuarios con rol <b>MEDICO</b> pueden ver esta página.
        </p>

        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="font-semibold">Lesiones</h3>
            <p className="text-sm text-gray-500">Altas, bajas, evolución.</p>
          </div>
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="font-semibold">Wellness</h3>
            <p className="text-sm text-gray-500">Cuestionarios y alertas.</p>
          </div>
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="font-semibold">Protocolos</h3>
            <p className="text-sm text-gray-500">Intervenciones y guías.</p>
          </div>
        </section>
      </main>
    </RoleGate>
  );
}
