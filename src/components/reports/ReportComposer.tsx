"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { ReportDTO } from "@/lib/reports";
import { REPORT_TYPE_OPTIONS, getReportTypeLabel } from "@/lib/reports";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

type FormState = {
  title: string;
  type: string;
  summary: string;
  content: string;
};

const initialForm: FormState = {
  title: "",
  type: REPORT_TYPE_OPTIONS[0].value,
  summary: "",
  content: "",
};

type Props = {
  initialReports: ReportDTO[];
};

export default function ReportComposer({ initialReports }: Props) {
  const [reports, setReports] = useState(initialReports);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "No se pudo crear el informe");
      }
      if (payload?.data) {
        setReports((prev) => [payload.data as ReportDTO, ...prev]);
      }
      setForm(initialForm);
      setMessage("Informe creado correctamente");
    } catch (err: any) {
      setError(err?.message || "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "No se pudieron obtener los informes");
      }
      setReports(Array.isArray(payload?.data) ? payload.data : []);
      setMessage("Listado actualizado");
    } catch (err: any) {
      setError(err?.message || "Error inesperado");
    } finally {
      setRefreshing(false);
    }
  }

  const reportCountLabel = useMemo(() => {
    const total = reports.length;
    if (total === 0) return "Sin informes todavía";
    if (total === 1) return "1 informe creado";
    return `${total} informes creados`;
  }, [reports.length]);

  return (
    <div className="grid gap-6 lg:grid-cols-[360px,minmax(0,1fr)]">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Nuevo informe</p>
          <h2 className="text-xl font-semibold text-gray-900">Compartí actualizaciones con los directivos</h2>
          <p className="text-xs text-gray-500">Se comparte automáticamente con el equipo seleccionado.</p>
        </header>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-medium text-gray-700">Título</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
              placeholder="Ej. Informe post-partido vs. Rivales"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Tipo</label>
            <select
              value={form.type}
              onChange={(e) => updateField("type", e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            >
              {REPORT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Resumen breve</label>
            <textarea
              value={form.summary}
              onChange={(e) => updateField("summary", e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
              placeholder="Puntos destacados en 2–3 líneas"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Contenido</label>
            <textarea
              value={form.content}
              onChange={(e) => updateField("content", e.target.value)}
              rows={8}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
              placeholder="Detalles completos, se admite Markdown básico"
              required
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
          >
            {submitting ? "Guardando..." : "Publicar informe"}
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {refreshing ? "Actualizando..." : "Actualizar listado"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Informes publicados</p>
            <h2 className="text-xl font-semibold text-gray-900">{reportCountLabel}</h2>
          </div>
        </header>

        <div className="mt-4 space-y-3">
          {reports.length === 0 ? (
            <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
              Cuando publiques un informe aparecerá aquí.
            </p>
          ) : (
            reports.map((report) => (
              <article key={report.id} className="rounded-xl border border-gray-100 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      {getReportTypeLabel(report.type)} · {dateFormatter.format(new Date(report.createdAt))}
                    </p>
                    <h3 className="text-base font-semibold text-gray-900">{report.title}</h3>
                  </div>
                  <span className="text-xs text-gray-400">{report.author?.name || report.author?.email || ""}</span>
                </div>
                {report.summary ? (
                  <p className="mt-2 text-sm text-gray-600">{report.summary}</p>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
