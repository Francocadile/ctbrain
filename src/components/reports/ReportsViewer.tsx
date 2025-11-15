"use client";

import { useState } from "react";
import type { ReportDTO } from "@/lib/reports";
import { getReportTypeLabel } from "@/lib/reports";

const shortDateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
});

const longDateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type Props = {
  initialReports: ReportDTO[];
};

export default function ReportsViewer({ initialReports }: Props) {
  const [reports, setReports] = useState(initialReports);
  const [selected, setSelected] = useState<ReportDTO | null>(initialReports[0] ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "No se pudieron cargar los informes");
      }
      const items = Array.isArray(payload?.data) ? payload.data : [];
      setReports(items);
      setSelected(items[0] ?? null);
    } catch (err: any) {
      setError(err?.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px,minmax(0,1fr)]">
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <header className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Informes</p>
            <h2 className="text-xl font-semibold text-gray-900">{reports.length || "Sin"} registros</h2>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </header>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-4 space-y-2 max-h-[520px] overflow-auto pr-1">
          {reports.length === 0 ? (
            <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
              El cuerpo técnico todavía no publicó informes para este equipo.
            </p>
          ) : (
            reports.map((report) => {
              const isActive = selected?.id === report.id;
              return (
                <button
                  type="button"
                  key={report.id}
                  onClick={() => setSelected(report)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition focus:outline-none ${
                    isActive
                      ? "border-gray-900 bg-gray-900/90 text-white"
                      : "border-gray-200 bg-white hover:border-gray-400"
                  }`}
                >
                  <p className={`text-xs uppercase tracking-wide ${isActive ? "text-gray-200" : "text-gray-500"}`}>
                    {getReportTypeLabel(report.type)} · {shortDateFormatter.format(new Date(report.createdAt))}
                  </p>
                  <p className={`text-sm font-semibold ${isActive ? "text-white" : "text-gray-900"}`}>
                    {report.title}
                  </p>
                  {report.summary ? (
                    <p className={`mt-1 text-xs ${isActive ? "text-gray-100" : "text-gray-600"}`}>
                      {report.summary}
                    </p>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {selected ? (
          <article>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {getReportTypeLabel(selected.type)} · {longDateFormatter.format(new Date(selected.createdAt))}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-gray-900">{selected.title}</h2>
            <p className="text-sm text-gray-500">
              Autor: {selected.author?.name || selected.author?.email || ""}
            </p>
            {selected.summary ? (
              <p className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-700">{selected.summary}</p>
            ) : null}
            <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-gray-900">
              {selected.content}
            </div>
          </article>
        ) : (
          <div className="flex min-h-[320px] flex-col items-center justify-center text-center text-gray-500">
            <p className="text-sm">Seleccioná un informe para ver el contenido.</p>
          </div>
        )}
      </section>
    </div>
  );
}
