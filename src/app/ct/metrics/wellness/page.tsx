// src/app/ct/metrics/wellness/page.tsx
"use client";

import { useEffect, useState } from "react";

function toYMD(d: Date) { return d.toISOString().slice(0, 10); }

type Row = {
  id: string;
  userId: string;
  userName: string;
  date: string;
  sleepQuality: number;
  fatigue: number;
  muscleSoreness: number;
  stress: number;
  mood: number;
  sleepHours: number | null;
  total: number | null;
  comment?: string | null;
};

export default function WellnessCT() {
  const [date, setDate] = useState(toYMD(new Date()));
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const q = new URLSearchParams({ date });
    const res = await fetch(`/api/metrics/wellness?${q.toString()}`, { cache: "no-store" });
    const data = res.ok ? await res.json() : [];
    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [date]);

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Wellness — Hoy</h1>
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
                  <th className="text-left px-3 py-2">Sueño</th>
                  <th className="text-left px-3 py-2">Fatiga</th>
                  <th className="text-left px-3 py-2">Dolor</th>
                  <th className="text-left px-3 py-2">Estrés</th>
                  <th className="text-left px-3 py-2">Ánimo</th>
                  <th className="text-left px-3 py-2">Horas</th>
                  <th className="text-left px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{r.userName}</td>
                    <td className="px-3 py-2">{r.sleepQuality}</td>
                    <td className="px-3 py-2">{r.fatigue}</td>
                    <td className="px-3 py-2">{r.muscleSoreness}</td>
                    <td className="px-3 py-2">{r.stress}</td>
                    <td className="px-3 py-2">{r.mood}</td>
                    <td className="px-3 py-2">{r.sleepHours ?? "—"}</td>
                    <td className="px-3 py-2">{r.total ?? "—"}</td>
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

