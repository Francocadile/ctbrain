// src/app/ct/metrics/rpe/semana/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

export const dynamic = "force-dynamic";

/** =============== Tipos =============== */
type RPERaw = {
  id: string;
  user?: { name?: string; email?: string };
  userName?: string | null;
  playerKey?: string | null;
  date: string; // YYYY-MM-DD
  rpe?: number | null; // 0..10
  duration?: number | null; // min
  srpe?: number | null; // AU
  load?: number | null; // AU (compat)
  comment?: string | null;
};

type WeekAgg = {
  userName: string;
  daysAU: number[]; // 7 valores L..D
  totalAU: number; // suma semanal
  acute7: number; // = totalAU (semana seleccionada)
  chronic28: number; // promedio 28d * 7
  acwr: number | null; // acute7 / chronic28 (si chronic28=0 => null)
  mean: number; // media diaria semana
  sd: number; // sd diaria semana
  monotony: number | null; // mean/sd (si sd=0 => null)
  strain: number | null; // totalAU * monotony (si monotony null => null)
};

/** =============== Utilidades fecha =============== */
function toYMD(d: Date) {
  // Local YYYY-MM-DD (evita off-by-one por zona horaria)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
function mondayOf(date: Date) {
  const x = new Date(date);
  const dow = x.getDay(); // 0=Dom, 1=Lun
  const diff = dow === 0 ? -6 : 1 - dow;
  return addDays(x, diff);
}

/** =============== Stats helpers =============== */
function mean(arr: number[]) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
function sdSample(arr: number[]) {
  const n = arr.length;
  if (n < 2) return 0;
  const m = mean(arr);
  const v = arr.reduce((acc, v) => acc + (v - m) * (v - m), 0) / (n - 1);
  return Math.sqrt(v);
}

/** =============== UI helpers =============== */
function badgeToneACWR(v: number | null): "green" | "yellow" | "red" | "gray" {
  if (v == null || !isFinite(v)) return "gray";
  if (v < 0.8 || v > 1.5) return "red";
  if (v <= 1.3) return "green";
  return "yellow";
}
function badgeToneAU(total: number): "green" | "yellow" | "red" {
  if (total < 1500) return "yellow"; // posible subcarga
  if (total > 4500) return "red"; // sobrecarga
  return "green"; // zona razonable
}
function badgeClass(t: "green" | "yellow" | "red" | "gray") {
  const map: Record<string, string> = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    yellow: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
    gray: "bg-gray-100 text-gray-700 border-gray-200",
  };
  return map[t];
}
function Badge({
  children,
  tone,
}: {
  children: any;
  tone: "green" | "yellow" | "red" | "gray";
}) {
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${badgeClass(
        tone
      )}`}
    >
      {children}
    </span>
  );
}

/** =============== Fetch helpers =============== */
async function fetchRpeDay(ymd: string): Promise<RPERaw[]> {
  const res = await fetch(`/api/metrics/rpe?date=${ymd}`, { cache: "no-store" });
  if (!res.ok) return [];
  const arr = await res.json();
  return Array.isArray(arr) ? arr : [];
}
function resolveName(r: RPERaw) {
  return r.userName || r.playerKey || r.user?.name || r.user?.email || "Jugador";
}
function resolveAU(r: RPERaw): number {
  const au =
    r.load ?? r.srpe ?? (Number(r.rpe ?? 0) * Number(r.duration ?? 0)) ?? 0;
  return Math.max(0, Math.round(Number(au))); // AU entero, ≥0
}

/** =============== Componente =============== */
export default function RPESemanaCT() {
  const [monday, setMonday] = useState<Date>(() => mondayOf(new Date()));
  const [loading, setLoading] = useState(false);
  const [weekDays, setWeekDays] = useState<string[]>([]); // 7 fechas L..D
  const [prev28Days, setPrev28Days] = useState<string[]>([]); // 28 días antes de la semana
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<WeekAgg[]>([]);

  // recomputar fechas al mover semana
  useEffect(() => {
    const days7 = Array.from({ length: 7 }, (_, i) => toYMD(addDays(monday, i)));
    setWeekDays(days7);
    const startPrev = addDays(monday, -28);
    const prev28 = Array.from({ length: 28 }, (_, i) => toYMD(addDays(startPrev, i)));
    setPrev28Days(prev28);
  }, [monday]);

  // cargar datos
  useEffect(() => {
    if (weekDays.length === 7 && prev28Days.length === 28) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekDays.join(","), prev28Days.join(",")]);

  async function load() {
    setLoading(true);
    try {
      // 1) Traer 7 días de la semana
      const weekChunks = await Promise.all(weekDays.map((d) => fetchRpeDay(d)));
      // user -> AU por día (7)
      const mapWeek: Record<string, number[]> = {};
      weekChunks.forEach((dayArr, dayIdx) => {
        for (const r of dayArr) {
          const nm = resolveName(r);
          if (!mapWeek[nm]) mapWeek[nm] = Array(7).fill(0);
          mapWeek[nm][dayIdx] += resolveAU(r); // si hay múltiples sesiones mismo día, suma
        }
      });

      // 2) Traer 28 días previos para crónico
      const prevChunks = await Promise.all(prev28Days.map((d) => fetchRpeDay(d)));
      const mapPrev28: Record<string, number[]> = {};
      prevChunks.forEach((dayArr) => {
        // cada día, si hay múltiples sesiones, sumamos por jugador para ese día
        const dailySum: Record<string, number> = {};
        for (const r of dayArr) {
          const nm = resolveName(r);
          dailySum[nm] = (dailySum[nm] ?? 0) + resolveAU(r);
        }
        for (const [nm, au] of Object.entries(dailySum)) {
          if (!mapPrev28[nm]) mapPrev28[nm] = [];
          mapPrev28[nm].push(au);
        }
      });

      // 3) Armar filas
      const allNames = new Set<string>([
        ...Object.keys(mapWeek),
        ...Object.keys(mapPrev28),
      ]);
      const out: WeekAgg[] = [];
      for (const nm of allNames) {
        const daysAU = (mapWeek[nm] ?? Array(7).fill(0)).map((v) =>
          Math.max(0, Math.round(v))
        );
        const totalAU = daysAU.reduce((a, b) => a + b, 0);
        const acute7 = totalAU;

        const prevArr = mapPrev28[nm] ?? [];
        // chronic como (promedio diario 28d) * 7
        const chronic28 = prevArr.length ? mean(prevArr) * 7 : 0;

        const acwr = chronic28 > 0 ? acute7 / chronic28 : null;

        const m = mean(daysAU);
        const s = sdSample(daysAU);
        const monotony = s > 0 ? m / s : null;
        const strain = monotony != null ? totalAU * monotony : null;

        out.push({
          userName: nm,
          daysAU,
          totalAU,
          acute7,
          chronic28,
          acwr,
          mean: m,
          sd: s,
          monotony,
          strain,
        });
      }

      // orden sugerido: riesgo primero (rojo ACWR), luego AU desc
      out.sort((a, b) => {
        const rank = (x: WeekAgg) => {
          const t = badgeToneACWR(x.acwr);
          // rojo:0, amarillo:1, verde:2, gris:3
          return t === "red" ? 0 : t === "yellow" ? 1 : t === "green" ? 2 : 3;
        };
        const rr = rank(a) - rank(b);
        if (rr !== 0) return rr;
        return b.totalAU - a.totalAU;
      });

      setRows(out);
    } finally {
      setLoading(false);
    }
  }

  function shiftWeek(delta: number) {
    setMonday((prev) => addDays(prev, delta * 7));
  }
  function onPickDate(s: string) {
    setMonday(mondayOf(new Date(s)));
  }

  // filtro por nombre
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => r.userName.toLowerCase().includes(t));
  }, [rows, q]);

  // Resumen semana
  const summary = useMemo(() => {
    if (!filtered.length) return { players: 0, totalAU: 0, avgAU: 0 };
    const totalAU = filtered.reduce((a, r) => a + r.totalAU, 0);
    const avgAU = totalAU / filtered.length;
    return { players: filtered.length, totalAU, avgAU };
  }, [filtered]);

  // Export CSV
  function exportCSV() {
    const header = [
      "Jugador",
      "Lunes_AU",
      "Martes_AU",
      "Miercoles_AU",
      "Jueves_AU",
      "Viernes_AU",
      "Sabado_AU",
      "Domingo_AU",
      "AU_total_semana",
      "Agudo_7d",
      "Cronico_28d",
      "ACWR",
      "Monotonia",
      "Strain",
      `Semana (${toYMD(monday)} a ${toYMD(addDays(monday, 6))})`,
    ];
    const lines = [header.join(",")];
    for (const r of filtered) {
      lines.push(
        [
          `"${r.userName.replace(/"/g, '""')}"`,
          ...r.daysAU.map((x) => String(x)),
          r.totalAU,
          r.acute7,
          r.chronic28.toFixed(1),
          r.acwr == null ? "" : r.acwr.toFixed(2),
          r.monotony == null ? "" : r.monotony.toFixed(2),
          r.strain == null ? "" : r.strain.toFixed(0),
          "",
        ].join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rpe_semana_${toYMD(monday)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">RPE — Semana (CT)</h1>
          <p className="text-xs text-gray-500">
            Semana: <b>{toYMD(monday)}</b> a <b>{toYMD(addDays(monday, 6))}</b> • {filtered.length}{" "}
            jugador(es)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftWeek(-1)}
            className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50"
          >
            ← Semana anterior
          </button>
          <input
            type="date"
            className="rounded-md border px-2 py-1.5 text-sm"
            value={toYMD(monday)}
            onChange={(e) => onPickDate(e.target.value)}
          />
          <button
            onClick={() => shiftWeek(+1)}
            className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50"
          >
            Semana siguiente →
          </button>
          <button
            onClick={exportCSV}
            className="rounded-lg bg-black text-white px-3 py-1.5 text-sm hover:opacity-90"
          >
            Exportar CSV
          </button>
        </div>
      </header>

      {/* Resumen */}
      <div className="rounded-xl border bg-white p-3 text-xs text-gray-600 flex flex-wrap gap-3">
        <div>
          <b>AU total (promedio/jugador):</b> {Math.round(summary.totalAU)} AU{" "}
          <span className="text-gray-400">/</span> {Math.round(summary.avgAU)} AU
        </div>
        <div className="ml-auto text-gray-500">
          Jugadores: <b>{summary.players}</b>
        </div>
      </div>

      {/* Filtro */}
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
        <div className="bg-gray-50 px-3 py-2 text-[12px] font-semibold uppercase">
          AU por día y métricas
        </div>
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
                  <th className="text-right px-3 py-2">L</th>
                  <th className="text-right px-3 py-2">M</th>
                  <th className="text-right px-3 py-2">X</th>
                  <th className="text-right px-3 py-2">J</th>
                  <th className="text-right px-3 py-2">V</th>
                  <th className="text-right px-3 py-2">S</th>
                  <th className="text-right px-3 py-2">D</th>
                  <th className="text-right px-3 py-2">AU total</th>
                  <th className="text-right px-3 py-2">Agudo (7d)</th>
                  <th className="text-right px-3 py-2">Crónico (28d)</th>
                  <th className="text-right px-3 py-2">ACWR</th>
                  <th className="text-right px-3 py-2">Monotonía</th>
                  <th className="text-right px-3 py-2">Strain</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const acwrTone = badgeToneACWR(r.acwr);
                  const auTone = badgeToneAU(r.totalAU);
                  return (
                    <tr key={r.userName} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{r.userName}</td>
                      {r.daysAU.map((v, idx) => (
                        <td key={idx} className="px-3 py-2 text-right tabular-nums">
                          {v || "—"}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right">
                        <Badge tone={auTone}>{Math.round(r.totalAU)} AU</Badge>
                      </td>
                      <td className="px-3 py-2 text-right">{Math.round(r.acute7)} AU</td>
                      <td className="px-3 py-2 text-right">{r.chronic28.toFixed(1)} AU</td>
                      <td className="px-3 py-2 text-right">
                        <Badge tone={acwrTone}>{r.acwr == null ? "—" : r.acwr.toFixed(2)}</Badge>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {r.monotony == null ? "—" : r.monotony.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {r.strain == null ? "—" : Math.round(r.strain)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Leyenda */}
      <div className="rounded-xl border bg-white p-3 text-xs text-gray-600">
        <b>ACWR:</b> objetivo 0.8–1.3 <Badge tone="green">OK</Badge>, 1.3–1.5{" "}
        <Badge tone="yellow">Atención</Badge>, &lt;0.8 o &gt;1.5 <Badge tone="red">Riesgo</Badge>.&nbsp;
        <b>AU semanal:</b> &lt;1500 subcarga, &gt;4500 sobrecarga (ajustable).
      </div>
    </div>
  );
}
