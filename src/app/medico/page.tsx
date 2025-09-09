// src/app/medico/page.tsx
import RoleGate from "@/components/auth/RoleGate";

export default async function MedicoPage() {
  return (
    <RoleGate allow={["MEDICO"]}>
      <main className="min-h-[70vh] px-6 py-10">
        <header>
          <h1 className="text-2xl font-bold">Panel · Médico</h1>
          <p className="mt-1 text-sm text-gray-600">
            Solo usuarios con rol <b>MEDICO</b> pueden acceder.
          </p>
        </header>

        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card de Lesiones sin enlace (deshabilitada por ahora) */}
          <Card
            title="Lesiones"
            desc="Altas, bajas y evolución clínica."
            disabledNote="Módulo en reconstrucción — volvemos a habilitar mañana."
          />

          {/* Estas dos quedan como info (sin enlaces) */}
          <Card
            title="Wellness"
            desc="Cuestionarios diarios y alertas automáticas."
          />
          <Card
            title="Protocolos"
            desc="Intervenciones, guías y lineamientos."
          />
        </section>
      </main>
    </RoleGate>
  );
}

function Card({
  title,
  desc,
  disabledNote,
}: {
  title: string;
  desc: string;
  disabledNote?: string;
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm ${
        disabledNote ? "opacity-60 pointer-events-none" : "hover:shadow"
      }`}
    >
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-gray-500">{desc}</p>
      {disabledNote ? (
        <p className="mt-2 text-xs text-amber-600">{disabledNote}</p>
      ) : null}
    </div>
  );
}
