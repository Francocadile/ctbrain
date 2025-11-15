// src/app/directivo/page.tsx
import RoleGate from "@/components/auth/RoleGate";
import { getDirectivoDashboardMetrics } from "@/lib/directivo/dashboard";

const numberFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
});

export default async function DirectivoPage() {
  const metrics = await getDirectivoDashboardMetrics();
  const windowLabel = formatRange(metrics.windowStart, metrics.windowEnd);

  const cards = [
    {
      title: "Sesiones últimas 2 semanas",
      value: formatNumber(metrics.sessionCount),
      hint: "Periodo analizado: últimos 7 días",
      detail: windowLabel,
    },
    {
      title: "Minutos totales",
      value: formatNumber(metrics.plannedMinutes),
      hint: "Sin minutos cargados se cuentan sesiones",
      detail: windowLabel,
    },
    {
      title: "Respuestas de jugadores",
      value: formatNumber(metrics.feedbackResponses),
      detail: windowLabel,
    },
    {
      title: "Jugadores que respondieron",
      value: formatNumber(metrics.playersResponded),
      detail: windowLabel,
    },
  ];

  return (
    <RoleGate allow={["DIRECTIVO", "ADMIN", "CT"]} requireTeam>
      <main className="min-h-[70vh] px-6 py-10">
        <header className="max-w-3xl">
          <p className="text-sm uppercase tracking-wide text-gray-500">Dashboard Directivo</p>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Indicadores clave del equipo
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Resumen multitenant basado en el equipo seleccionado. Métricas calculadas para los últimos 7 días.
          </p>
        </header>

        <section className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <MetricCard key={card.title} {...card} />
          ))}
        </section>
      </main>
    </RoleGate>
  );
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatRange(start: Date, end: Date) {
  return `${dateFormatter.format(start)} – ${dateFormatter.format(end)}`;
}

function MetricCard({
  title,
  value,
  hint,
  detail,
}: {
  title: string;
  value: string;
  hint?: string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{value}</p>
      {detail ? <p className="mt-1 text-xs text-gray-500">{detail}</p> : null}
      {hint ? <p className="mt-3 text-[11px] text-gray-400">{hint}</p> : null}
    </div>
  );
}

