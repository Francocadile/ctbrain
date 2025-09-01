// src/app/ct/metrics/wellness/semana/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type DayRow = {
  id: string;
  userId?: string;
  userName?: string;
  date: string;
  sleepQuality: number;   // 1..5
  sleepHours?: number | null;
  fatigue: number;        // 1..5
  muscleSoreness: number; // 1..5
  stress: number;         // 1..5
  mood: number;           // 1..5
  comment?: string | null;
};

type AggRow = {
  userName: string;
  count: number;
  sleepQuality: number;   // promedio
  fatigue: number;        // promedio
  muscleSoreness: number; // promedio
  stress: number;         // promedio
  mood: number;           // promedio
  total: number;          // promedio sumado (hasta 25)
};

function toYMD(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, days: number) { const x = new Date(d); x.setDate(x.getDate() + days); return x; }
function mondayOf(date: Date) {
  const x = new Date(date);
  const day = x.getDay(); // 0=Dom, 1=Lun, ...
  const diff = (day === 0 ? -6 : 1 - day);
  return addDays(x, diff);
}

// Semáforo por valor 1..5
function tone15(v: number) {
  if (v <= 1.5) return "bg-red-50 text-red-700 border-red-200";
  if (v <= 2.5) return "bg-orange-50 text-orange-700 border-orange-200";
  if (v <= 3.5) return "bg-amber-50 text-amber-700 border-amber-200";
  if (v <= 4.5) return "bg-lime-50 text-lime-700 border-lime-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

// Semáforo por total (0..25)
function tone25(total: number) {
  const pct = total / 25;
  if (pct < 0.4) return "bg-red-50 text-red-700 border-red-200";
  if (pct < 0.6) return "bg-orange-50 text-orange-700 border-orange-200";
  if (pct < 0.8) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function Badge({ children, klass = "" }: { children: any; klass?: string }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-semibold ${klass}`}>
      {children}
    </span>
  );
}

export default function WellnessSemanaCT() {
  const [monday, setMonday] = useState<Date>(() => mondayOf(new Date()));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DayRow[]>([]);
  const [q, setQ] = useState("");

  // Construye array de fechas (7 días)
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => toYMD(addDays(monday, i)));
  }, [monday]);

  async function loadWeek() {
    setLoading(true);
    try {
      const reqs = days.map(d => fetch(`/api/metrics/wellness?date=${d}`, { cache: "no-store" }));
      const resps = await Promise.all(reqs);
      const all: DayRow[] = [];
      for (const r of resps) {
        if (!r.ok) continue;
        const data = await r.json();
        if (Array.isArray(data)) {
          // Normalizo userName
          for (const it of data) {
            all.push({
              ...it,
              userName: it.userName || it.user?.name || it.user?.email || it.playerKey || "—",
            });
          }
        }
      }
      setRows(all);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadWeek(); /* eslint-disable-next-line */ }, [days.join(",")]);

  // Agregación por jugador
  const aggregated: AggRow[] = useMemo(() => {
    const m = new Map<string, { c: number; sq: number; fa: number; ms: number; st: number; mo: number }>();
    for (const r of rows) {
      const key = r.userName || "—";
      const prev = m.get(key) || { c: 0, sq: 0, fa: 0, ms: 0, st: 0, mo: 0 };
      m.set(key, {
        c: prev.c + 1,
        sq: prev.sq + Number(r.sleepQuality || 0),
        fa: prev.fa + Number(r.fatigue || 0),
        ms: prev.ms + Number(r.muscleSoreness || 0),
        st: prev.st + Number(r.stress || 0),
        mo: prev.mo + Number(r.mood || 0),
      });
    }
    const out: AggRow[] = [];
    for (const [userName, v] of m.entries()) {
      if (v.c === 0) continue;
      const sleepQuality = v.sq / v.c;
      const fatigue = v.fa / v.c;
      const muscleSoreness = v.ms / v.c;
      const stress = v.st / v.c;
      const mood = v.mo / v.c;
      const total = sleepQuality + fatigue + muscleSoreness + stress + mood;
      out.push({ userName, count: v.c, sleepQuality, fatigue, muscleSoreness, stress, mood, total });
    }
    // Orden: peor total primero para ver alertas arriba
    out.sort((a, b) => a.total - b.total);
    return out;
  }, [rows]);

  // Filtro por nombre
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return aggregated;
    return aggregated.filter(r => r.userName.toLowerCase().includes(t));
  }, [aggregated, q]);

  // Totales de la semana (promedio de promedios)
  const weekSummary = useMemo(() => {
    if (!filtered.length) return { count: 0, avgTotal: 0 };
    const avgTotal = filtered.reduce((a, r) => a + r.total, 0) / filtered.length;
    return { count: filtered.length, avgTotal };
  }, [filtered]);

  function shiftWeek(delta: number) {
    setMonday(prev => addDays(prev, delta * 7));
  }

  function onPickDate(s: string) {
    const d = new Date(s);
    setMonday(mondayOf(d));
  }

  // Export CSV
  function exportCSV() {
    const header = [
      "Jugador",
      "Días con datos",
      "Sueño(1-5)",
      "Fatiga(1-5)",
      "Dolor musc.(1-5)",
      "Estrés(1-5)",
      "Ánimo(1-5)",
      "Total(0-25)",
      `Semana (${toYMD(monday)} a ${toYMD(addDays(monday, 6))})`,
    ];
    const lines = [header.join(",")];
    for (const r of filtered) {
      lines.push([
        `"${r.userName.replace(/"/g, '""')}"`,
        r.count,
        r.sleepQuality.toFixed(2),
        r.fatigue.toFixed(2),
        r.muscleSoreness.toFixed(2),
        r.stress.toFixed(2),
        r.mood.toFixed(2),
        r.total.toFixed(2),
        "",
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wellness_semana_${toYMD(monday)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">Wellness — Semana (CT)</h1>
          <p className="text-xs text-gray-500">
            Semana: <b>{toYMD(monday)}</b> a <b>{toYMD(addDays(monday, 6))}</b> — {rows.length} registros
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => shiftWeek(-1)} className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50">← Semana anterior</button>
          <input
            type="date"
            className="rounded-md border px-2 py-1.5 text-sm"
            value={toYMD(monday)}
            onChange={(e) => onPickDate(e.target.value)}
          />
          <button onClick={() => shiftWeek(+1)} className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50">Semana siguiente →</button>
          <button onClick={loadWeek} className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50">Recargar</button>
          <button onClick={exportCSV} className="rounded-lg bg-black text-white px-3 py-1.5 text-sm hover:opacity-90">Exportar CSV</button>
        </div>
      </header>

      {/* Resumen */}
      <div className="rounded-xl border bg-white p-3 text-xs text-gray-600 flex flex-wrap gap-3">
        <div><b>Promedio semanal (total):</b> <Badge klass={tone25(weekSummary.avgTotal)}>{weekSummary.count ? weekSummary.avgTotal.toFixed(1) : "—"}</Badge></div>
        <div className="ml-auto text-gray-500">Jugadores: <b>{weekSummary.count}</b></div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2">
        <input
          className="w-full md:w-80 rounded-md border px-2 py-1.5 text-sm"
          placeholder="Buscar jugador…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="text-[12px] text-gray-500">{filtered.length} resultado(s)</span>
      </div>

      {/* Tabla */}
      <section className="rounded-2xl border bg-white overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 text-[12px] font-semibold uppercase">Promedios por jugador</div>
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
                  <th className="text-left px-3 py-2">Días</th>
                  <th className="text-left px-3 py-2">Sueño</th>
                  <th className="text-left px-3 py-2">Fatiga</th>
                  <th className="text-left px-3 py-2">Dolor musc.</th>
                  <th className="text-left px-3 py-2">Estrés</th>
                  <th className="text-left px-3 py-2">Ánimo</th>
                  <th className="text-left px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.userName} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{r.userName}</td>
                    <td className="px-3 py-2">{r.count}</td>
                    <td className="px-3 py-2"><Badge klass={tone15(r.sleepQuality)}>{r.sleepQuality.toFixed(1)}</Badge></td>
                    <td className="px-3 py-2"><Badge klass={tone15(r.fatigue)}>{r.fatigue.toFixed(1)}</Badge></td>
                    <td className="px-3 py-2"><Badge klass={tone15(r.muscleSoreness)}>{r.muscleSoreness.toFixed(1)}</Badge></td>
                    <td className="px-3 py-2"><Badge klass={tone15(r.stress)}>{r.stress.toFixed(1)}</Badge></td>
                    <td className="px-3 py-2"><Badge klass={tone15(r.mood)}>{r.mood.toFixed(1)}</Badge></td>
                    <td className="px-3 py-2"><Badge klass={tone25(r.total)}>{r.total.toFixed(1)}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Hint de criterios (simple) */}
      <div className="rounded-xl border bg-white p-3 text-xs text-gray-600">
        <b>Criterios rápidos:</b> totales &lt; 15/25 o promedios &lt; 3.0 suelen indicar alerta. Revisar fatiga/estrés y comparar con sesiones planificadas.
      </div>
    </div>
  );
}
