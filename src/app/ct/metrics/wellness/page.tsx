// src/app/ct/metrics/wellness/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type WRow = {
  id: string;
  userId: string;
  userName: string;      // lo resolvemos en API; si no, mostramos email o "—"
  date: string;          // ISO
  sleepQuality: number;  // 1..5
  sleepHours?: number | null;
  fatigue: number;       // 1..5
  muscleSoreness: number;// 1..5
  stress: number;        // 1..5
  mood: number;          // 1..5
  comment?: string | null;
  total?: number | null; // suma (5 ítems)
};

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

function toneFor15(v: number) {
  // 1 rojo, 2 naranja, 3 amarillo, 4 verde-amarillo, 5 verde
  if (v <= 1) return "red";
  if (v === 2) return "orange";
  if (v === 3) return "yellow";
  if (v === 4) return "lime";
  return "green";
}

function badge(v: number) {
  const tone = toneFor15(v);
  const map: Record<string, string> = {
    red: "bg-red-50 text-red-700 border-red-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    yellow: "bg-amber-50 text-amber-700 border-amber-200",
    lime: "bg-lime-50 text-lime-700 border-lime-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return (
    <span className={`inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-semibold ${map[tone]}`}>
      {v}
    </span>
  );
}

export default function WellnessCT() {
  const [date, setDate] = useState(toYMD(new Date()));
  const [rows, setRows] = useState<WRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/metrics/wellness?date=${date}`, { cache: "no-store" });
    const data = res.ok ? await res.json() : [];
    // compat por si API no devuelve userName:
    const fixed = (Array.isArray(data) ? data : []).map((r: any) => ({
      ...r,
      userName: r.userName || r.user?.name || r.user?.email || "—",
    }));
    setRows(fixed);
    setLoading(false);
  }

  useEffect(() => { load(); }, [date]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(r =>
      (r.userName || "").toLowerCase().includes(t) ||
      (r.comment || "").toLowerCase().includes(t)
    );
  }, [rows, q]);

  const totals = useMemo(() => {
    const vals = filtered.map(r => Number(r.total ?? (r.sleepQuality + r.fatigue + r.muscleSoreness + r.stress + r.mood)));
    const sum = vals.reduce((a,b)=>a+b,0);
    const avg = filtered.length ? sum / filtered.length : 0;
    return { count: filtered.length, avg: avg };
  }, [filtered]);

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Wellness — Día</h1>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="rounded-md border px-2 py-1.5 text-sm"
            value={date}
            onChange={(e)=> setDate(e.target.value)}
          />
          <button onClick={load} className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50">Recargar</button>
        </div>
      </header>

      {/* Leyenda rápida */}
      <div className="rounded-xl border bg-white p-3 text-xs text-gray-600 flex flex-wrap gap-3">
        <div><b>Semáforo:</b></div>
        <div className="flex items-center gap-1">{badge(1)} <span>Muy malo</span></div>
        <div className="flex items-center gap-1">{badge(3)} <span>Medio</span></div>
        <div className="flex items-center gap-1">{badge(5)} <span>Excelente</span></div>
        <div className="ml-auto">Promedio del día: <b>{totals.count ? totals.avg.toFixed(1) : "—"}</b></div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2">
        <input
          className="w-full md:w-80 rounded-md border px-2 py-1.5 text-sm"
          placeholder="Buscar por jugador o comentario…"
          value={q}
          onChange={(e)=>setQ(e.target.value)}
        />
        <span className="text-[12px] text-gray-500">{filtered.length} resultado(s)</span>
      </div>

      {/* Tabla */}
      <section className="rounded-2xl border bg-white overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 text-[12px] font-semibold uppercase">Entradas</div>
        {loading ? (
          <div className="p-4 text-gray-500">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-gray-500 italic">Sin datos</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-3 py-2">Jugador</th>
                  <th className="text-left px-3 py-2">Sueño</th>
                  <th className="text-left px-3 py-2">Horas</th>
                  <th className="text-left px-3 py-2">Fatiga</th>
                  <th className="text-left px-3 py-2">Dolor musc.</th>
                  <th className="text-left px-3 py-2">Estrés</th>
                  <th className="text-left px-3 py-2">Ánimo</th>
                  <th className="text-left px-3 py-2">Total</th>
                  <th className="text-left px-3 py-2">Comentario</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const total = r.total ?? (r.sleepQuality + r.fatigue + r.muscleSoreness + r.stress + r.mood);
                  // tonalidad del total (25 es excelente)
                  const pct = total / 25;
                  const totalTone =
                    pct < 0.4 ? "bg-red-50 text-red-700 border-red-200" :
                    pct < 0.6 ? "bg-orange-50 text-orange-700 border-orange-200" :
                    pct < 0.8 ? "bg-amber-50 text-amber-700 border-amber-200" :
                                 "bg-emerald-50 text-emerald-700 border-emerald-200";
                  return (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{r.userName}</td>
                      <td className="px-3 py-2">{badge(r.sleepQuality)}</td>
                      <td className="px-3 py-2">{r.sleepHours ?? "—"}</td>
                      <td className="px-3 py-2">{badge(r.fatigue)}</td>
                      <td className="px-3 py-2">{badge(r.muscleSoreness)}</td>
                      <td className="px-3 py-2">{badge(r.stress)}</td>
                      <td className="px-3 py-2">{badge(r.mood)}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${totalTone}`}>
                          {total}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-gray-600">{r.comment || "—"}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
