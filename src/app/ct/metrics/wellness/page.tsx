// src/app/ct/metrics/wellness/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getPlayers,
  upsertWellness,
  getWellnessByDay,
  getWellnessBetween,
  wellnessSum,
  type Player,
  type WellnessResponse,
} from "@/lib/metrics";

function todayYMD() { return new Date().toISOString().slice(0, 10); }
function toYMD(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, k: number) { const x = new Date(d); x.setDate(x.getDate() + k); return x; }

function toneForSum(deltaPct: number): "green"|"yellow"|"red" {
  // delta% negativo: bajó vs baseline (peor).
  if (deltaPct <= -20) return "red";
  if (deltaPct <= -10) return "yellow";
  return "green";
}

export default function WellnessPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [ymd, setYmd] = useState<string>(todayYMD());

  useEffect(() => { setPlayers(getPlayers()); }, []);

  const dayRows = useMemo(() => getWellnessByDay(ymd), [ymd]);
  const mapByPlayer = useMemo(() => {
    const m = new Map<string, WellnessResponse>();
    for (const w of dayRows) m.set(w.playerId, w);
    return m;
  }, [dayRows]);

  // Baseline = promedio móvil de 14 días anteriores
  function baselineFor(p: Player): number {
    const start = toYMD(addDays(new Date(ymd), -14));
    const prevs = getWellnessBetween(start, toYMD(addDays(new Date(ymd), -1)))
      .filter(x => x.playerId === p.id)
      .map(wellnessSum);
    if (!prevs.length) return 0;
    return prevs.reduce((a,b)=>a+b,0) / prevs.length;
  }

  function update(p: Player, patch: Partial<WellnessResponse>) {
    const prev = mapByPlayer.get(p.id) || {
      playerId: p.id, ymd,
      sleepQuality: 0, sleepDurationH: 0, fatigue: 0, muscleSoreness: 0, stress: 0, mood: 0, comment: ""
    };
    const next = { ...prev, ...patch, ymd, playerId: p.id };
    upsertWellness(next);
  }

  return (
    <div className="p-4 space-y-4">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h1 className="text-lg md:text-xl font-bold">Wellness diario (1–5)</h1>
          <p className="text-xs text-gray-500">CT visualiza y puede cargar si hace falta por el jugador (MVP). Baseline = 14 días previos.</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" className="rounded-md border px-2 py-1.5 text-sm" value={ymd} onChange={(e)=>setYmd(e.target.value)} />
          <a className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs" href="/ct/dashboard">Dashboard</a>
        </div>
      </header>

      <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b text-[12px] font-semibold uppercase tracking-wide">
          {ymd} · Resumen por jugador (total 5–25)
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-3 py-2 text-left">Jugador</th>
                <th className="px-3 py-2 text-center">Sueño</th>
                <th className="px-3 py-2 text-center">Fatiga</th>
                <th className="px-3 py-2 text-center">Dolor</th>
                <th className="px-3 py-2 text-center">Estrés</th>
                <th className="px-3 py-2 text-center">Ánimo</th>
                <th className="px-3 py-2 text-center">Horas</th>
                <th className="px-3 py-2 text-center">Total</th>
                <th className="px-3 py-2 text-center">vs Baseline</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => {
                const w = mapByPlayer.get(p.id);
                const total = w ? wellnessSum(w) : 0;
                const baseline = baselineFor(p);
                const delta = baseline ? ((total - baseline) / baseline) * 100 : 0;
                const tone = toneForSum(delta);
                const cellTone =
                  tone === "green" ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                  : tone === "yellow" ? "text-amber-700 bg-amber-50 border-amber-200"
                  : "text-red-700 bg-red-50 border-red-200";

                const N = (k: number, min=0, max=5) => (
                  <input
                    type="number" min={min} max={max} step={1}
                    className="w-16 text-center rounded-md border px-2 py-1"
                    value={k || 0}
                    onChange={()=>{}}
                  />
                );

                return (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{p.name}</td>

                    <td className="px-3 py-2 text-center">
                      <input type="number" min={1} max={5} className="w-14 text-center rounded-md border px-2 py-1"
                             value={w?.sleepQuality || 0}
                             onChange={(e)=>update(p,{ sleepQuality: Number(e.target.value) })}/>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="number" min={1} max={5} className="w-14 text-center rounded-md border px-2 py-1"
                             value={w?.fatigue || 0}
                             onChange={(e)=>update(p,{ fatigue: Number(e.target.value) })}/>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="number" min={1} max={5} className="w-14 text-center rounded-md border px-2 py-1"
                             value={w?.muscleSoreness || 0}
                             onChange={(e)=>update(p,{ muscleSoreness: Number(e.target.value) })}/>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="number" min={1} max={5} className="w-14 text-center rounded-md border px-2 py-1"
                             value={w?.stress || 0}
                             onChange={(e)=>update(p,{ stress: Number(e.target.value) })}/>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="number" min={1} max={5} className="w-14 text-center rounded-md border px-2 py-1"
                             value={w?.mood || 0}
                             onChange={(e)=>update(p,{ mood: Number(e.target.value) })}/>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="number" min={0} max={14} className="w-16 text-center rounded-md border px-2 py-1"
                             value={w?.sleepDurationH || 0}
                             onChange={(e)=>update(p,{ sleepDurationH: Number(e.target.value) })}/>
                    </td>

                    <td className="px-3 py-2 text-center font-semibold">{total || "—"}</td>
                    <td className="px-3 py-2 text-center">
                      {baseline ? (
                        <span className={`inline-block text-[11px] px-2 py-0.5 rounded border ${cellTone}`}>
                          {delta.toFixed(0)}% {delta < 0 ? "↓" : "↑"}
                        </span>
                      ) : <span className="text-[11px] text-gray-500">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
