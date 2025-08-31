// src/app/ct/metrics/rpe/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getPlayers,
  getRPEByDay,
  getRPEBetween,
  setRPEValue,
  setDurationValue,
  sRPE,
  bandForAU,
  weeklyTotals,
  computeACWR,
  type Player,
} from "@/lib/metrics";

type Turn = "morning" | "afternoon"; // reservado si luego dividimos por turno

function todayYMD() { return new Date().toISOString().slice(0, 10); }
function toYMD(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, k: number) { const x = new Date(d); x.setDate(x.getDate() + k); return x; }

function Badge({ tone, children }: { tone: "green"|"yellow"|"orange"|"red"|"gray"; children: React.ReactNode }) {
  const map: Record<typeof tone, string> = {
    green:  "text-emerald-700 bg-emerald-50 border-emerald-200",
    yellow: "text-amber-700 bg-amber-50 border-amber-200",
    orange: "text-orange-700 bg-orange-50 border-orange-200",
    red:    "text-red-700 bg-red-50 border-red-200",
    gray:   "text-gray-700 bg-gray-50 border-gray-200",
  } as const;
  return <span className={`inline-block text-[11px] px-2 py-0.5 rounded border ${map[tone]}`}>{children}</span>;
}

export default function RPEPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [ymd, setYmd] = useState<string>(todayYMD());
  const [baseMonday, setBaseMonday] = useState<string>(() => {
    const d = new Date(); const day = d.getDay(); // 0 dom .. 6 sab
    const diff = (day + 6) % 7; // a lunes
    return toYMD(addDays(d, -diff));
  });

  useEffect(() => { setPlayers(getPlayers()); }, []);

  const dayRows = useMemo(() => getRPEByDay(ymd), [ymd]);
  const mapByPlayer = useMemo(() => {
    const m = new Map<string, { rpe: number; durationMin: number; au: number }>();
    for (const p of players) m.set(p.id, { rpe: 0, durationMin: 0, au: 0 });
    for (const e of dayRows) m.set(e.playerId, { rpe: e.rpe, durationMin: e.durationMin, au: sRPE(e) });
    return m;
  }, [players, dayRows]);

  // semana aguda = lunes..domingo a partir de baseMonday
  const acuteStart = baseMonday;
  const acuteEnd   = toYMD(addDays(new Date(baseMonday), 6));

  // crónica: 3 semanas previas completas
  const chronicStart = toYMD(addDays(new Date(baseMonday), -21));
  const chronicEnd   = toYMD(addDays(new Date(baseMonday), -1));

  const acuteEntries = useMemo(() => getRPEBetween(acuteStart, acuteEnd), [acuteStart, acuteEnd]);
  const chronicEntries = useMemo(() => getRPEBetween(chronicStart, chronicEnd), [chronicStart, chronicEnd]);

  const acute = weeklyTotals(acuteEntries);
  const chronicWeeks: number[] = [];
  // dividimos 3 semanas previas en bloques
  for (let w = 3; w >= 1; w--) {
    const s = toYMD(addDays(new Date(baseMonday), -7 * w));
    const e = toYMD(addDays(new Date(baseMonday), -7 * w + 6));
    const tot = weeklyTotals(getRPEBetween(s, e)).total;
    if (tot) chronicWeeks.push(tot);
  }
  const chronicMean = chronicWeeks.length ? chronicWeeks.reduce((a, b) => a + b, 0) / chronicWeeks.length : 0;
  const acwr = computeACWR(acute.total, chronicMean);

  function toneForACWR(x: number): "green"|"yellow"|"orange"|"red"|"gray" {
    if (!x) return "gray";
    // referencias prácticas
    if (x >= 0.8 && x <= 1.3) return "green";
    if ((x > 1.3 && x <= 1.5) || (x >= 0.7 && x < 0.8)) return "yellow";
    if ((x > 1.5 && x <= 1.75) || (x >= 0.6 && x < 0.7)) return "orange";
    return "red";
  }
  function toneForMonotony(m: number): "green"|"yellow"|"orange"|"red"|"gray" {
    if (!m) return "gray";
    if (m < 1.0) return "green";
    if (m < 1.5) return "yellow";
    if (m < 2.0) return "orange";
    return "red";
  }
  function toneForTotal(t: number): "green"|"yellow"|"orange"|"red"|"gray" {
    if (!t) return "gray";
    if (t < 1500) return "yellow";
    if (t <= 4000) return "green";
    if (t <= 5000) return "orange";
    return "red";
  }

  return (
    <div className="p-4 space-y-4">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h1 className="text-lg md:text-xl font-bold">RPE · Carga interna (sRPE)</h1>
          <p className="text-xs text-gray-500">El jugador carga RPE (0–10). CT define duración (min). sRPE = RPE × minutos</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" className="rounded-md border px-2 py-1.5 text-sm" value={ymd} onChange={(e)=>setYmd(e.target.value)} />
          <div className="w-px h-6 bg-gray-200" />
          <label className="text-xs text-gray-500">Semana (Lun base)</label>
          <input type="date" className="rounded-md border px-2 py-1.5 text-sm" value={baseMonday} onChange={(e)=>setBaseMonday(e.target.value)} />
          <a className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs" href="/ct/dashboard">Dashboard</a>
        </div>
      </header>

      {/* Carga por jugador (día) */}
      <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b text-[12px] font-semibold uppercase tracking-wide">
          {ymd} · Carga por jugador (semáforo por sesión)
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-3 py-2 text-left">Jugador</th>
                <th className="px-3 py-2 text-center">RPE (0–10)</th>
                <th className="px-3 py-2 text-center">Duración (min)</th>
                <th className="px-3 py-2 text-center">sRPE (AU)</th>
                <th className="px-3 py-2 text-center">Semáforo</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => {
                const row = mapByPlayer.get(p.id)!;
                const au = row?.au || 0;
                const band = bandForAU(au);
                const tone = band?.color ?? "gray";
                return (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number" min={0} max={10} step={1}
                        className="w-20 text-center rounded-md border px-2 py-1"
                        value={row?.rpe ?? 0}
                        onChange={(e)=>setRPEValue(ymd, p.id, Number(e.target.value))}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number" min={0} step={5}
                        className="w-24 text-center rounded-md border px-2 py-1"
                        value={row?.durationMin ?? 0}
                        onChange={(e)=>setDurationValue(ymd, p.id, Number(e.target.value))}
                      />
                    </td>
                    <td className="px-3 py-2 text-center font-semibold">{au || "—"}</td>
                    <td className="px-3 py-2 text-center">
                      <Badge tone={tone as any}>{band ? `${band.band} (${band.label})` : "—"}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Semana (KPIs) */}
      <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b text-[12px] font-semibold uppercase tracking-wide">
          Semana {acuteStart} → {acuteEnd} · KPIs
        </div>
        <div className="p-3 grid md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl border p-3">
            <div className="text-[11px] text-gray-500">Total semanal (AU)</div>
            <div className="text-lg font-bold">{Math.round(acute.total)}</div>
            <div className="mt-1"><Badge tone={toneForTotal(acute.total)}>Referencia: 2.000–4.000 óptimo</Badge></div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-[11px] text-gray-500">Monotonía</div>
            <div className="text-lg font-bold">{acute.monotony ? acute.monotony.toFixed(2) : "—"}</div>
            <div className="mt-1">
              <Badge tone={toneForMonotony(acute.monotony || 0)}>&gt;2 = riesgo por baja variabilidad</Badge>
            </div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-[11px] text-gray-500">Strain</div>
            <div className="text-lg font-bold">{acute.strain ? Math.round(acute.strain) : "—"}</div>
            <div className="mt-1 text-[11px] text-gray-500">Carga × Monotonía</div>
          </div>

          <div className="rounded-xl border p-3 md:col-span-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] text-gray-500">ACWR (Aguda / Crónica ~3 sem previas)</div>
                <div className="text-lg font-bold">{acwr ? acwr.toFixed(2) : "—"}</div>
              </div>
              <Badge tone={toneForACWR(acwr || 0)}>
                Zona segura 0.8–1.3 · &gt;1.5 riesgo
              </Badge>
            </div>
            {chronicWeeks.length ? (
              <div className="mt-2 text-[12px] text-gray-600">
                Crónica (promedio {chronicWeeks.length} sem): <b>{Math.round(chronicMean)}</b> AU · Semanas previas:{" "}
                {chronicWeeks.map((w, i) => <span key={i} className="mr-2">{Math.round(w)} AU</span>)}
              </div>
            ) : (
              <div className="mt-2 text-[12px] text-gray-500">Aún no hay 3 semanas previas completas.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
