// src/app/directivo/page.tsx
import RoleGate from "@/components/auth/RoleGate";

export default async function DirectivoPage() {
  return (
    <RoleGate allow={["DIRECTIVO"]}>
      <main className="min-h-[70vh] px-6 py-10">
        <header>
          <h1 className="text-2xl font-bold">Panel · Directivo</h1>
          <p className="mt-1 text-sm text-gray-600">
            Solo usuarios con rol <b>DIRECTIVO</b> pueden acceder.
          </p>
        </header>

        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card title="Resumen" desc="KPIs y métricas clave en tiempo real." />
          <Card title="Reportes" desc="Reportes semanales y mensuales." />
          <Card title="Comunicación" desc="Notas y mensajes del Cuerpo Técnico." />
        </section>
      </main>
    </RoleGate>
  );
}

function Card({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-gray-500">{desc}</p>
    </div>
  );
}

