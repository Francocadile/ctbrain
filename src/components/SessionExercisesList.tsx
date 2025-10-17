"use client";
import * as React from "react";

type Row = {
  id: string;
  title: string;
  kind?: string | null;
  space?: string | null;
  players?: string | null;
  duration?: string | null;
  exIndex?: number;
};

export default function SessionExercisesList({ sessionId }: { sessionId: string }) {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`/api/exercises-flat?sessionId=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "No se pudieron cargar los ejercicios");
        const all: Row[] = (j.data || []).map((x: any) => ({
          id: x.id,
          title: x.title,
          kind: x.kind ?? null,
          space: x.space ?? null,
          players: x.players ?? null,
          duration: x.duration ?? null,
          exIndex: x.exIndex ?? x.idx ?? 0,
        }));
        if (!cancel) setRows(all.sort((a,b)=> (a.exIndex??0) - (b.exIndex??0)));
      } catch (e:any) {
        if (!cancel) setError(e.message || "Error");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [sessionId]);

  if (loading) return <div className="text-sm text-gray-500">Cargando ejercicios…</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (rows.length === 0) return <div className="text-sm text-gray-500">Sin ejercicios guardados.</div>;

  return (
    <ul className="space-y-2">
      {rows.map((r, i) => (
        <li key={`${r.id}-${i}`} className="rounded-md border p-3 text-sm">
          <div className="font-medium">{(r.exIndex ?? i) + 1}. {r.title}</div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
            {r.kind ? <span>🏷️ {r.kind}</span> : null}
            {r.space ? <span>📍 {r.space}</span> : null}
            {r.players ? <span>👥 {r.players}</span> : null}
            {r.duration ? <span>⏱️ {r.duration}</span> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
