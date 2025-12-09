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

export function RivalSection() {
  const [report, setReport] = useState<RivalReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNextRival();
  }, []);

  async function loadNextRival() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/rival/next", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("No se pudo cargar el próximo rival");
      }
      const data = await res.json();
      if (!data) {
        setReport(null);
        return;
      }

      const mapped: RivalReport = {
        id: data.id,
        matchDate: data.matchDate,
        rivalName: data.rivalName,
        competition: data.competition ?? null,
        notes: data.notes ?? null,
        videos: Array.isArray(data.videos) ? data.videos : [],
      };

      setReport(mapped);
    } catch (e: any) {
      setError(e.message ?? "Error cargando el próximo rival");
    } finally {
      setLoading(false);
    }
  }

  const firstVideo =
    report && Array.isArray(report.videos) && report.videos.length > 0
      ? report.videos[0]
      : undefined;

  return (
    <section className="mt-4 w-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">Próximo rival</h2>
        <button
          type="button"
          onClick={loadNextRival}
          className="text-xs text-blue-600 hover:underline"
        >
          Actualizar
        </button>
      </div>

      {loading && (
        <p className="text-xs text-gray-500">Cargando información del próximo rival...</p>
      )}

      {!loading && error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {!loading && !error && !report && (
        <p className="text-xs text-gray-500">
          Todavía no hay información cargada del próximo rival.
        </p>
      )}

      {!loading && !error && report && (
        <div className="space-y-2 text-sm">
          <div>
            <div className="text-xs font-semibold uppercase text-gray-500">
              {report.matchDate.slice(0, 10)}
            </div>
            <div className="text-lg font-semibold">
              {report.rivalName}
            </div>
            {report.competition && (
              <div className="text-xs text-gray-500">
                {report.competition}
              </div>
            )}
          </div>

          {report.notes && (
            <p className="text-xs text-gray-700 whitespace-pre-line">
              {report.notes}
            </p>
          )}

          {firstVideo && (
            <a
              href={firstVideo.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-md border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
            >
              Ver video: {firstVideo.title}
            </a>
          )}

          {report && (
            <a
              href="/jugador/rival"
              className="text-xs text-blue-600 hover:underline mt-1 block"
            >
              Ver más del rival
            </a>
          )}
        </div>
      )}
    </section>
  );
}
