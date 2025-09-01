// src/app/ct/metrics/rpe/page.tsx
"use client";

import { useEffect, useState } from "react";

function toYMD(d: Date) { return d.toISOString().slice(0, 10); }

type Row = {
  id: string;
  userId: string;
  userName: string;
  date: string;
  rpe: number;
  duration: number | null;
  load: number | null;
};

export default function RPECT() {
  const [date, setDate] = useState(toYMD(new Date()));
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const q = new URLSearchParams({ date });
    const res = await fetch(`/api/metrics/rpe?${q.toString()}`, { cache: "no-store" });
    const data = res.ok ? await res.json() : [];
    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [date]);

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold">RPE — Hoy</h1>
        <div className="flex items-center gap-2">
          <input type="date" className="rounded-md border px-2 py-1.5 text-sm" value={date} onChange={(e)=>setDate(e.target.value)} />
          <button onClick={load} className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50">Recargar</button>
        </div>
      </header>

      <section className="rounded-2xl border bg-white overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 text-[12px] font-semibold uppercase">Entradas</div>
        {loading ? (
          <div className="p-4 text-gray-500">Cargando…</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-gray-500 italic">Sin datos</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-3 py-2">Jugador</th>
                  <th className="text-left px-3 py-2">RPE</th>
                  <th className="text-left px-3 py-2">Duración (min)</th>
                  <th className="text-left px-3 py-2">sRPE (AU)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{r.userName}</td>
                    <td className="px-3 py-2">{r.rpe}</td>
                    <td className="px-3 py-2">{r.duration ?? "—"}</td>
                    <td className="px-3 py-2">{r.load ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
