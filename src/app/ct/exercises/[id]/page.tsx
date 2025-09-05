// src/app/ct/exercises/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";

type Kind = { id: string; name: string } | null;
type Exercise = {
  id: string;
  title: string;
  description: string | null;
  space: string | null;
  players: string | null;
  duration: string | null;
  imageUrl: string | null;
  createdAt: string;
  kind: Kind;
};

export default function ExerciseDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [loading, setLoading] = useState(true);
  const [ex, setEx] = useState<Exercise | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/exercises/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        setEx(json.data as Exercise);
      } catch (e) {
        console.error(e);
        setEx(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div className="p-6 text-gray-500">Cargando…</div>;
  if (!ex) return <div className="p-6">No encontrado</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{ex.title}</h1>
          <p className="text-sm text-gray-500">
            {new Date(ex.createdAt).toLocaleString()} · {ex.kind?.name || "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/ct/exercises" className="rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50">← Volver</a>
          <button onClick={() => window.print()} className="rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50">
            🖨️ Imprimir
          </button>
        </div>
      </header>

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="text-sm text-gray-600 space-x-3 mb-3">
          {ex.space && <span>📍 {ex.space}</span>}
          {ex.players && <span>👥 {ex.players}</span>}
          {ex.duration && <span>⏱ {ex.duration}</span>}
        </div>

        {ex.description && (
          <div className="prose prose-sm max-w-none whitespace-pre-wrap">{ex.description}</div>
        )}

        {ex.imageUrl && (
          <div className="mt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ex.imageUrl} alt="Imagen del ejercicio" className="max-h-[60vh] rounded-lg border object-contain" />
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden !important; }
          .printable, .printable * { visibility: visible !important; }
        }
      `}</style>
    </div>
  );
}
