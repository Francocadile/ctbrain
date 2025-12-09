"use client";

import { useEffect, useState } from "react";

type RivalReport = {
  id: string;
  matchDate: string;
  rivalName: string;
  competition?: string | null;
  notes?: string | null;
  videos?: { title: string; url: string }[];
};

type RivalFormState = {
  id: string | null;
  matchDate: string;
  rivalName: string;
  competition: string;
  notes: string;
  videoTitle: string;
  videoUrl: string;
};

const emptyForm: RivalFormState = {
  id: null,
  matchDate: "",
  rivalName: "",
  competition: "",
  notes: "",
  videoTitle: "",
  videoUrl: "",
};

export default function RivalPage() {
  const [reports, setReports] = useState<RivalReport[]>([]);
  const [form, setForm] = useState<RivalFormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/rival", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("No se pudieron cargar los rivales");
      }
      const data = (await res.json()) as any[];

      const mapped: RivalReport[] = (data ?? []).map((item) => ({
        id: item.id,
        matchDate: item.matchDate,
        rivalName: item.rivalName,
        competition: item.competition ?? null,
        notes: item.notes ?? null,
        videos: Array.isArray(item.videos) ? item.videos : [],
      }));

      setReports(mapped);
    } catch (e: any) {
      setError(e.message ?? "Error cargando rivales");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(
    field: keyof RivalFormState,
    value: string
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleEdit(report: RivalReport) {
    const firstVideo = Array.isArray(report.videos) && report.videos.length > 0
      ? report.videos[0]
      : undefined;

    setForm({
      id: report.id,
      matchDate: report.matchDate.slice(0, 10),
      rivalName: report.rivalName,
      competition: report.competition ?? "",
      notes: report.notes ?? "",
      videoTitle: firstVideo?.title ?? "",
      videoUrl: firstVideo?.url ?? "",
    });
    setSuccess(null);
    setError(null);
  }

  function handleNew() {
    setForm(emptyForm);
    setSuccess(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!form.matchDate || !form.rivalName) {
        throw new Error("Fecha de partido y nombre del rival son obligatorios");
      }

      const videos =
        form.videoUrl.trim().length > 0
          ? [
              {
                title:
                  form.videoTitle.trim().length > 0
                    ? form.videoTitle.trim()
                    : "Video 1",
                url: form.videoUrl.trim(),
              },
            ]
          : [];

      const res = await fetch("/api/rival", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: form.id ?? undefined,
          matchDate: form.matchDate,
          rivalName: form.rivalName,
          competition: form.competition || null,
          notes: form.notes || null,
          videos,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data?.error ?? "No se pudo guardar el informe del rival"
        );
      }

      setSuccess("Informe de rival guardado correctamente");
      await loadReports();
      // Dejamos el formulario con los datos guardados pero sin tocar la selección
    } catch (e: any) {
      setError(e.message ?? "Error guardando el informe");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Rival – Informes del próximo partido</h1>
        <p className="mt-1 text-sm text-gray-500">
          Desde acá cargás para tu equipo contra quién juegan, datos clave y un video para que el jugador lo vea.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-[2fr,3fr]">
        {/* Formulario */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium">
              {form.id ? "Editar informe" : "Nuevo informe"}
            </h2>
            <button
              type="button"
              onClick={handleNew}
              className="text-xs text-blue-600 hover:underline"
            >
              + Nuevo
            </button>
          </div>

          {error && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Fecha del partido
              </label>
              <input
                type="date"
                value={form.matchDate}
                onChange={(e) => handleChange("matchDate", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Nombre del rival
              </label>
              <input
                type="text"
                value={form.rivalName}
                onChange={(e) => handleChange("rivalName", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Ej: Club Atlético Ejemplo"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Competición (opcional)
              </label>
              <input
                type="text"
                value={form.competition}
                onChange={(e) => handleChange("competition", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Liga, copa, etc."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Notas para el plantel
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={4}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Puntos fuertes, debilidades, esquema, etc."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Título del video (opcional)
              </label>
              <input
                type="text"
                value={form.videoTitle}
                onChange={(e) => handleChange("videoTitle", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Ej: Análisis del rival"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                URL del video (YouTube, Vimeo, etc.)
              </label>
              <input
                type="url"
                value={form.videoUrl}
                onChange={(e) => handleChange("videoUrl", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="https://..."
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-2 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar informe"}
            </button>
          </form>
        </div>

        {/* Lista de informes */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium">Informes cargados</h2>
            <button
              type="button"
              onClick={loadReports}
              className="text-xs text-blue-600 hover:underline"
            >
              Recargar
            </button>
          </div>

          {loading && (
            <p className="text-sm text-gray-500">Cargando informes...</p>
          )}

          {!loading && reports.length === 0 && (
            <p className="text-sm text-gray-500">
              Todavía no cargaste informes de rivales.
            </p>
          )}

          {!loading && reports.length > 0 && (
            <div className="space-y-3">
              {reports.map((report) => {
                const firstVideo =
                  Array.isArray(report.videos) && report.videos.length > 0
                    ? report.videos[0]
                    : undefined;

                return (
                  <div
                    key={report.id}
                    className="flex flex-col gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold uppercase text-gray-500">
                          {report.matchDate.slice(0, 10)}
                        </div>
                        <div className="font-medium">
                          {report.rivalName}
                        </div>
                        {report.competition && (
                          <div className="text-xs text-gray-500">
                            {report.competition}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleEdit(report)}
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100"
                      >
                        Editar
                      </button>
                    </div>
                    {report.notes && (
                      <p className="text-xs text-gray-600">
                        {report.notes.length > 160
                          ? report.notes.slice(0, 160) + "..."
                          : report.notes}
                      </p>
                    )}
                    {firstVideo && (
                      <a
                        href={firstVideo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        Ver video: {firstVideo.title}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
