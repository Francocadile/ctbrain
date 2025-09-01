// src/app/ct/metrics/wellness/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getPlayers,
  getWellnessByDay,
  getWellnessBetween,
  type Player,
} from "@/lib/metrics";

/**
 * Mapeo de 6 ítems estándar:
 * - sueñoCalidad (1–5)
 * - sueñoHoras (0–12) -> lo normalizamos a 0–5 para el total /30
 * - fatiga (1–5)
 * - dolor (1–5)
 * - estrés (1–5)
 * - humor (1–5)
 *
 * Total normalizado = (calidad + fatiga + dolor + estrés + humor) + normalización(horas)
 * Normalización horas: 8h -> 5 puntos, 0h -> 0 puntos, 10h o más -> cap en 5.
 */

type WRow = {
  playerId: string;
  // valores crudos guardados por el jugador
  sleepQuality?: number;   // 1–5
  sleepHours?: number;     // 0–12 (aprox)
  fatigue?: number;        // 1–5 (a mayor valor = mejor energía)
  musclePain?: number;     // 1–5 (5 = sin dolor)
  stress?: number;         // 1–5 (5 = muy bajo)
  mood?: number;           // 1–5 (5 = excelente)
  comment?: string;
};

function todayYMD() { return new Date().toISOString().slice(0, 10); }
function toYMD(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, k: number) { const x = new Date(d); x.setDate(x.getDate() + k); return x; }

function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)); }
function normalizeHoursToFive(hours: number) {
  // 0h -> 0; 8h -> 5; 10h+-> 5 (cap). Interpolación lineal.
  if (hours <= 0) return 0;
  if (hours >= 10) return 5;
  // 0..8 => 0..5  ;  8..10 => ~5..5
  const h = clamp(hours, 0, 10);
  return clamp((h / 8) * 5, 0, 5);
}
function totalScore(r?: Partial<WRow>) {
  if (!r) return 0;
  const s1 = Number(r.sleepQuality ?? 0);
  const s2 = normalizeHoursToFive(Number(r.sleepHours ?? 0));
  const s3 = Number(r.fatigue ?? 0);
  const s4 = Number(r.musclePain ?? 0);
  const s5 = Number(r.stress ?? 0);
  const s6 = Number(r.mood ?? 0);
  return Math.round((s1 + s2 + s3 + s4 + s5 + s6) * 10) / 10; // 1 dec
}

function bandForTotal(total: number) {
  // Total máx aprox = 30. Semáforo por % respecto del máximo (y práctico de campo)
  // ≥24 (80%) verde, 18–24 amarillo, <18 rojo.
  if (!total) return { band: "—", color: "gray" as const, label: "Sin datos" };
  if (total >= 24) return { band: "Óptimo", color: "green" as const, label: "dentro de rango" };
  if (total >= 18) return { band: "Cuidado", color: "yellow" as const, label: "descenso moderado" };
  return { band: "Alerta", color: "red" as const, label: "descenso fuerte" };
}

function Badge({ tone, children }: { tone: "green"|"yellow"|"orange"|"red"|"gray"; children: React.ReactNode }) {
  const map: Record<typeof tone, string> = {
    green:  "text-emerald-700 bg-emerald-50 border-emerald-200",
    yellow: "text-amber-700 bg-amber-50 border-amber-200",
    orange: "text-orange-700 bg-orange-50 border-orange-200",
    red:    "text-red-700 bg-red-50 border-red-200",
    gray:   "text-gray-700 bg-gray-50 border-gray-200",
  };
  return <span className={`inline-block text-[11px] px-2 py-0.5 rounded border ${map[tone]}`}>{children}</span>;
}

export default function WellnessPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [ymd, setYmd] = useState<string>(todayYMD());
  const [baseMonday, setBaseMonday] = useState<string>(() => {
    const d = new Date(); const day = d.getDay(); // 0 dom .. 6 sab
    const diff = (day + 6) % 7; // retrocede a lunes
    return toYMD(addDays(d, -diff));
  });

  useEffect(() => { setPlayers(getPlayers()); }, []);

  // Datos del día
  const rows = useMemo(() => getWellnessByDay(ymd) as WRow[], [ymd]);

  const mapByPlayer = useMemo(() => {
    const m = new Map<string, WRow>();
    for (const p of players) m.set(p.id, { playerId: p.id });
    for (const r of rows) m.set(r.playerId, r);
    return m;
  }, [players, rows]);

  // Semana aguda para KPIs (lunes->domingo)
  const acuteStart = baseMonday;
  const acuteEnd   = toYMD(addDays(new Date(baseMonday), 6));
  const acuteAll   = useMemo(() => getWellnessBetween(acuteStart, acuteEnd) as WRow[], [acuteStart, acuteEnd]);

  // Crónica simple: últimas 3 semanas previas completas (21 días previos a baseMonday)
  const chronicStart = toYMD(addDays(new Date(baseMonday), -21));
  const chronicEnd   = toYMD(addDays(new Date(baseMonday), -1));
  const chronicAll   = useMemo(() => getWellnessBetween(chronicStart, chronicEnd) as WRow[], [chronicStart, chronicEnd]);

  // KPI helpers
  function mean(arr: number[]) { return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }
  function stdev(arr: number[]) {
    if (arr.length < 2) return 0;
    const mu = mean(arr);
    const v = mean(arr.map(x => (x - mu) ** 2));
    return Math.sqrt(v);
  }

  const acuteTotals = useMemo(() => {
    // promedio de totales del plantel por día (agregado semanal)
    // Para semáforo de “estado general” tomamos el promedio simple de todos los registros
    const totals = acuteAll.map(r => totalScore(r));
    const avg = mean(totals);
    const sd  = stdev(totals);
    return { avg, sd, n: totals.length };
  }, [acuteAll]);

  const chronicTotals = useMemo(() => {
    const totals = chronicAll.map(r => totalScore(r));
    return { avg: mean(totals), n: totals.length };
  }, [chronicAll]);

  // Alerta por descenso ≥20% vs crónica
  const drop20 = chronicTotals.avg ? (acuteTotals.avg / chronicTotals.avg) <= 0.8 : false;

  function toneForTeam(avg: number) {
    const b = bandForTotal(avg);
    return b.color;
  }

  return (
    <div className="p-4 space-y-4">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h1 className="text-lg md:text-xl font-bold">Wellness · Lectura (CT)</h1>
          <p className="text-xs text-gray-500">
            Respuestas cargadas por los jugadores. Total normalizado (0–30). Variaciones grandes activan alerta.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" className="rounded-md border px-2 py-1.5 text-sm" value={ymd} onChange={(e)=>setYmd(e.target.value)} />
          <div className="w-px h-6 bg-gray-200" />
          <label className="text-xs text-gray-500">Semana (Lun base)</label>
          <input type="date" className="rounded-md border px-2 py-1.5 text-sm" value={baseMonday} onChange={(e)=>setBaseMonday(e.target.value)} />
          <a className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs" href="/ct/metrics/rpe">RPE</a>
          <a className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs" href="/ct/dashboard">Dashboard</a>
        </div>
      </header>

      {/* Tabla diaria por jugador (solo lectura) */}
      <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b text-[12px] font-semibold uppercase tracking-wide">
          {ymd} · Respuestas por jugador
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-3 py-2 text-left">Jugador</th>
                <th className="px-3 py-2 text-center">Sueño (1–5)</th>
                <th className="px-3 py-2 text-center">Horas</th>
                <th className="px-3 py-2 text-center">Fatiga</th>
                <th className="px-3 py-2 text-center">Dolor</th>
                <th className="px-3 py-2 text-center">Estrés</th>
                <th className="px-3 py-2 text-center">Humor</th>
                <th className="px-3 py-2 text-center">Total /30</th>
                <th className="px-3 py-2 text-center">Semáforo</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => {
                const r = mapByPlayer.get(p.id);
                const total = totalScore(r);
                const band = bandForTotal(total);
                return (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    <td className="px-3 py-2 text-center">{r?.sleepQuality ?? "—"}</td>
                    <td className="px-3 py-2 text-center">{r?.sleepHours ?? "—"}</td>
                    <td className="px-3 py-2 text-center">{r?.fatigue ?? "—"}</td>
                    <td className="px-3 py-2 text-center">{r?.musclePain ?? "—"}</td>
                    <td className="px-3 py-2 text-center">{r?.stress ?? "—"}</td>
                    <td className="px-3 py-2 text-center">{r?.mood ?? "—"}</td>
                    <td className="px-3 py-2 text-center font-semibold">{total ? total.toFixed(1) : "—"}</td>
                    <td className="px-3 py-2 text-center">
                      <Badge tone={band.color}>{band.band}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* KPIs semanales (agudo) + referencia crónica */}
      <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b text-[12px] font-semibold uppercase tracking-wide">
          Semana {acuteStart} → {acuteEnd} · KPIs
        </div>
        <div className="p-3 grid md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl border p-3">
            <div className="text-[11px] text-gray-500">Promedio diario (plantel)</div>
            <div className="text-lg font-bold">{acuteTotals.n ? acuteTotals.avg.toFixed(1) : "—"}</div>
            <div className="mt-1">
              <Badge tone={toneForTeam(acuteTotals.avg)}>{acuteTotals.avg >= 24 ? "Óptimo" : acuteTotals.avg >= 18 ? "Cuidado" : "Alerta"}</Badge>
            </div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-[11px] text-gray-500">Desvío estándar</div>
            <div className="text-lg font-bold">{acuteTotals.n ? acuteTotals.sd.toFixed(2) : "—"}</div>
            <div className="mt-1 text-[11px] text-gray-500">Dispersión de respuestas</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-[11px] text-gray-500">Comparación crónica (21 días previos)</div>
            <div className="text-lg font-bold">{chronicTotals.n ? chronicTotals.avg.toFixed(1) : "—"}</div>
            <div className="mt-1">
              {chronicTotals.n ? (
                <Badge tone={drop20 ? "red" : "green"}>
                  {drop20 ? "Descenso ≥20% vs crónica (alerta)" : "Dentro de variación esperada"}
                </Badge>
              ) : (
                <Badge tone="gray">Sin historial suficiente</Badge>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
