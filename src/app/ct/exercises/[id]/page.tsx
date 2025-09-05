// src/app/ct/exercises/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type KindDTO = { id: string; name: string };
type ExerciseDTO = {
  id: string;
  title: string;
  description: string | null;
  space: string | null;
  players: string | null;
  duration: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  kindId: string | null;
  kind?: KindDTO | null;
};

export default function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<ExerciseDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/exercises/${id}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo obtener el ejercicio");
      setRow(json.data as ExerciseDTO);
    } catch (e: any) {
      setError(e?.message || "Error");
      setRow(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [id]);

  return (
    <div id="print-root" className="max-w-4xl mx-auto p-6 space-y-4">
      {/* —— Estilos de impresión: A4, una hoja —— */}
      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden !important; }
          #print-root, #print-root * { visibility: visible !important; }
          #print-root { position: absolute; inset: 0; margin: 0 !important; }
          a[href]:after { content: ""; }
          .no-print { display: none !important; }
        }
      `}</style>

      <header className="flex items-center justify-between no-print">
        <div className="space-x-2">
          <a href="/ct/exercises" className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">
            ← Volver
          </a>
          <a href="/ct/dashboard" className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">
            Dashboard
          </a>
        </div>
        <button
          onClick={() => window.print()}
          className="px-3 py-1.5 rounded-xl border text-xs hover:bg-gray-50"
        >
          🖨 Imprimir
        </button>
      </header>

      {loading ? (
        <div className="text-sm text-gray-500">Cargando…</div>
      ) : error ? (
        <div className="rounded-lg border p-4 text-sm text-red-700 bg-red-50">{error}</div>
      ) : !row ? (
        <div className="rounded-lg border p-4 text-sm text-gray-600">No encontrado</div>
      ) : (
        <article className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          {/* Encabezado */}
          <div className="bg-gray-50 px-4 py-3 border-b">
            <h1 className="text-xl font-semibold">{row.title || "(Sin título)"}</h1>
            <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-3">
              <span>📅 {new Date(row.createdAt).toLocaleString()}</span>
              {row.kind?.name && <span>🏷 {row.kind.name}</span>}
              {row.space && <span>📍 {row.space}</span>}
              {row.players && <span>👥 {row.players}</span>}
              {row.duration && <span>⏱ {row.duration}</span>}
            </div>
          </div>

          {/* Cuerpo */}
          <div className="p-4 space-y-4">
            {row.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.imageUrl}
                alt="Gráfico / diagrama del ejercicio"
                className="w-full max-h-[520px] object-contain rounded-lg border"
              />
            ) : null}

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700 mb-1">
                Descripción
              </h2>
              <div className="min-h-[140px] whitespace-pre-wrap leading-6 text-[13px]">
                {row.description?.trim() || <span className="text-gray-400 italic">—</span>}
              </div>
            </section>
          </div>
        </article>
      )}
    </div>
  );
}
