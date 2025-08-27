// src/app/directivo/page.tsx
import RoleGate from "@/components/auth/RoleGate";

export default async function DirectivoPage() {
  return (
    <RoleGate allow={["DIRECTIVO"]}>
      <main className="min-h-[60vh] px-6 py-10">
        <h1 className="text-2xl font-bold">Panel — Directivo</h1>
        <p className="mt-2 text-sm text-gray-600">
          Solo usuarios con rol <b>DIRECTIVO</b> pueden ver esta página.
        </p>

        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="font-semibold">Resumen</h3>
            <p className="text-sm text-gray-500">KPIs y alertas clave.</p>
          </div>
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="font-semibold">Reportes</h3>
            <p className="text-sm text-gray-500">Semanal / Mensual.</p>
          </div>
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="font-semibold">Comunicación</h3>
            <p className="text-sm text-gray-500">Notas del CT.</p>
          </div>
        </section>
      </main>
    </RoleGate>
  );
}
