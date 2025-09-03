// src/app/ct/metrics/wellness/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import HelpTip from "@/components/HelpTip";

import {
  type WellnessRaw,
  type Baseline,
  toYMD,
  fromYMD,
  addDays,
  yesterday,
  mean,
  sdSample,
  computeSDW,
  zToColor,
  applyOverrides,
} from "@/lib/metrics/wellness";

export const dynamic = "force-dynamic";

type DayRow = WellnessRaw & {
  _userName: string; // resuelto
  _sdw: number; // 1..5
};

type Alert = {
  kind: "CRITICO" | "AMARILLO";
  reason: string;
  userName: string;
  priority: number; // menor = más urgente
};

type RPERow = {
  userName: string;
  srpe: number; // AU
};

/** CSS de badges */
function Badge({
  children,
  tone,
}: {
  children: any;
  tone: "green" | "yellow" | "red" | "lime" | "orange";
}) {
  const map: Record<string, string> = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    yellow: "bg-amber-50 text-amber-700 border-amber-200",
    lime: "bg-lime-50 text-lime-700 border-lime-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${map[tone]}`}
    >
      {children}
    </span>
  );
}

/** Mini sparkline (7 días) usando bloques */
function Sparkline({ vals }: { vals: number[] }) {
  if (!vals.length) return <span className="text-gray-400">—</span>;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = Math.max(1e-6, max - min);
  return (
    <div className="flex items-end gap-0.5 h-6">
      {vals.map((v, i) => {
        const h = 6 + Math.round(16 * ((v - min) / range)); // 6..22px
        return (
          <div
            key={i}
            className="w-1.5 bg-gray-400/60 rounded-sm"
            style={{ height: `${h}px` }}
          />
        );
      })}
    </div>
  );
}

/** Barras inline (para KPIs de rango) */
function BarsInline({
  values,
  maxHint,
  height = 60,
  barWidth = 12,
  gap = 4,
  titlePrefix = "",
  tone = "gray",
}: {
  values: number[];
  maxHint?: number;
  height?: number;
  barWidth?: number;
  gap?: number;
  titlePrefix?: string;
  tone?: "gray" | "emerald" | "amber" | "red";
}) {
  const max = Math.max(maxHint ?? 0, ...values, 1);
  const toneCls: Record<string, string> = {
    gray: "bg-gray-300",
    emerald: "bg-emerald-400/80",
    amber: "bg-amber-400/80",
    red: "bg-red-400/80",
  };
  return (
    <div className="flex items-end gap-1 overflow-x-auto" style={{ height }}>
      {values.map((v, i) => {
        const h = Math.max(2, Math.round((v / max) * (height - 10)));
        return (
          <div
            key={i}
            title={`${titlePrefix}${v}`}
            className={`rounded-sm ${toneCls[tone]}`}
            style={{ width: barWidth, height: h, marginRight: gap }}
          />
        );
      })}
    </div>
  );
}

/** ---------- Componente principal ---------- */
function WellnessCT_Day() {
  type Tab = "respuestas" | "kpis" | "reportes";
  const search = useSearchParams();
  const initialTab = (search.get("tab") as Tab) || "respuestas";
  const [tab, setTab] = useState<Tab>(initialTab);
  function switchTab(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url.toString());
  }

  const [date, setDate] = useState<string>(toYMD(new Date()));
  const [rowsToday, setRowsToday] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [last7, setLast7] = useState<Record<string, number[]>>({}); // userName -> últimos 7 SDW
  const [srpeYesterday, setSrpeYesterday] = useState<Record<string, number>>({}); // userName -> AU

  // Cache 21d previos por jugador para baseline
  const [baselineMap, setBaselineMap] = useState<Record<string, Baseline>>({});

  // ----- KPIs de RANGO (7/14/21d) -----
  const [rangeDays, setRangeDays] = useState<7 | 14 | 21>(7);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [dailyAvgSDW, setDailyAvgSDW] = useState<number[]>([]); // hoy..hace N-1
  const [dailyParticipationPct, setDailyParticipationPct] = useState<number[]>([]);
  const [sdwHistogram, setSdwHistogram] = useState<number[]>([0, 0, 0, 0]); // ≤2 | 2–3 | 3–4 | >4

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function fetchWellnessDay(d: string): Promise<WellnessRaw[]> {
    const res = await fetch(`/api/metrics/wellness?date=${d}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  async function fetchRPE(d: string): Promise<RPERow[]> {
    const res = await fetch(`/api/metrics/rpe?date=${d}`, { cache: "no-store" });
    if (!res.ok) return [];
    const arr = await res.json();
    if (!Array.isArray(arr)) return [];
    return arr.map((r: any) => {
      const srpeVal =
        r.load ?? r.srpe ?? Number(r.rpe ?? 0) * Number(r.duration ?? 0) ?? 0;
      return {
        userName:
          r.userName || r.playerKey || r.user?.name || r.user?.email || "Jugador",
        srpe: Number(srpeVal),
      };
    });
  }

  async function loadAll() {
    setLoading(true);

    // 1) Día actual
    const today = await fetchWellnessDay(date);
    const todayFixed: DayRow[] = today.map((it: any) => {
      const nm = it.userName || it.user?.name || it.user?.email || it.playerKey || "—";
      return { ...it, _userName: nm, _sdw: computeSDW(it) };
    });

    // 2) Ventana 21 días previos (baseline)
    const prevDays: string[] = Array.from({ length: 21 }, (_, i) =>
      toYMD(addDays(fromYMD(date), -(i + 1)))
    );
    const prevDataChunks = await Promise.all(prevDays.map((d) => fetchWellnessDay(d)));

    // por jugador → SDWs
    const map: Record<string, number[]> = {};
    const last7map: Record<string, number[]> = {};

    for (let di = 0; di < prevDataChunks.length; di++) {
      const dayArr = prevDataChunks[di];
      for (const it of dayArr) {
        const nm =
          it.userName || it.user?.name || it.user?.email || it.playerKey || "—";
        const sdw = computeSDW(it);
        if (!map[nm]) map[nm] = [];
        map[nm].push(sdw);
        if (di < 7) {
          // primeros 7 del array son ayer..hace 7 días
          if (!last7map[nm]) last7map[nm] = [];
          last7map[nm].push(sdw);
        }
      }
    }

    const baselines: Record<string, Baseline> = {};
    for (const [nm, arr] of Object.entries(map)) {
      const arrClean = arr.filter((v) => v > 0);
      baselines[nm] = {
        mean: mean(arrClean),
        sd: sdSample(arrClean),
        n: arrClean.length,
      };
    }

    // 3) sRPE de ayer
    const ysrpe = await fetchRPE(yesterday(date));
    const srpeMap: Record<string, number> = {};
    for (const r of ysrpe) srpeMap[r.userName] = r.srpe || 0;

    // 4) Enriquecemos filas de hoy con z-score, color y overrides
    const withStats = todayFixed.map((r) => {
      const base = baselines[r._userName];
      const z =
        base && base.n >= 7 && base.sd > 0 ? (r._sdw - base.mean) / base.sd : null;
      const baseColor = zToColor(z);
      const finalColor = applyOverrides(baseColor, r);
      return { ...r, _z: z, _color: finalColor, _base: base || { mean: 0, sd: 0, n: 0 } };
    });

    // 5) Construimos alertas priorizadas
    const alertsList: Alert[] = [];
    for (const r of withStats) {
      const base = (r as any)._base as Baseline;
      const z = (r as any)._z as number | null;
      const color = (r as any)._color as "green" | "yellow" | "red";

      const overrides: string[] = [];
      if ((r.sleepHours ?? null) !== null && (r.sleepHours as number) < 4)
        overrides.push("Sueño <4h");
      if (r.muscleSoreness <= 2) overrides.push("Dolor muscular ≤2");
      if (r.stress <= 2) overrides.push("Estrés ≤2");

      const srpe = srpeYesterday[r._userName] ?? 0;

      if (color === "red") {
        alertsList.push({
          kind: "CRITICO",
          reason:
            z !== null && z < -1.0 && base.n >= 7
              ? `SDW rojo (Z=${z.toFixed(2)})`
              : overrides[0]
              ? `Override: ${overrides.join(", ")}`
              : "SDW rojo",
          userName: r._userName,
          priority: 1,
        });
      } else if (color === "yellow") {
        alertsList.push({
          kind: "AMARILLO",
          reason:
            z !== null && z < -0.5 && base.n >= 7
              ? `Descenso leve (Z=${z.toFixed(2)})`
              : overrides[0]
              ? `Override leve: ${overrides.join(", ")}`
              : "Atención",
          userName: r._userName,
          priority: 5,
        });
      }

      // Cruce: sRPE alto ayer + SDW rojo hoy → crítica adicional
      if (srpe > 900 && color === "red") {
        alertsList.push({
          kind: "CRITICO",
          reason: `sRPE ayer ${Math.round(srpe)} AU + SDW rojo`,
          userName: r._userName,
          priority: 0,
        });
      }
    }

    alertsList.sort((a, b) => a.priority - b.priority);

    setRowsToday(withStats);
    setBaselineMap(baselines);
    setLast7(last7map);
    setSrpeYesterday(srpeMap);
    setAlerts(alertsList);
    setLoading(false);
  }

  // ------ KPIs del día (resumen) ------
  const kpis = useMemo(() => {
    const n = rowsToday.length;
    const sdws = rowsToday.map((r: any) => Number(r._sdw || 0)).filter((v) => v > 0);
    const sdwAvg = sdws.length ? mean(sdws) : 0;

    let reds = 0,
      yellows = 0,
      greens = 0;
    let zVals: number[] = [];
    for (const r of rowsToday as any[]) {
      const c = r._color as "green" | "yellow" | "red";
      if (c === "red") reds++;
      else if (c === "yellow") yellows++;
      else if (c === "green") greens++;

      if (r._z != null) zVals.push(Number(r._z));
    }
    const zAvg = zVals.length ? mean(zVals) : null;

    return {
      n,
      sdwAvg,
      reds,
      yellows,
      greens,
      zAvg,
      dist: n
        ? {
            red: Math.round((reds / n) * 100),
            yellow: Math.round((yellows / n) * 100),
            green: Math.round((greens / n) * 100),
          }
        : { red: 0, yellow: 0, green: 0 },
    };
  }, [rowsToday]);

  // Filtro por nombre (en Respuestas)
  const [rowsTodayMemo, setRowsTodayMemo] = useState<DayRow[]>([]);
  useEffect(() => setRowsTodayMemo(rowsToday), [rowsToday]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rowsTodayMemo;
    return rowsTodayMemo.filter(
      (r) =>
        r._userName.toLowerCase().includes(t) ||
        (r.comment || "").toLowerCase().includes(t)
    );
  }, [rowsTodayMemo, q]);

  // Export CSV (Respuestas)
  function exportCSV() {
    const header = [
      "Jugador",
      "Fecha",
      "Sueño_calidad",
      "Horas_sueño",
      "Fatiga",
      "Dolor_muscular",
      "Estrés",
      "Ánimo",
      "Total_diario",
      "Comentario",
      "Color",
      "Semana_ISO",
    ];
    const lines = [header.join(",")];

    for (const r of filtered) {
      const wk = r.date; // TODO: week exacta si querés
      const color = (r as any)._color as string;

      lines.push(
        [
          `"${r._userName.replace(/"/g, '""')}"`,
          r.date,
          r.sleepQuality,
          (r.sleepHours ?? "") as any,
          r.fatigue,
          r.muscleSoreness,
          r.stress,
          r.mood,
          (r as any)._sdw.toFixed(2),
          `"${(r.comment || "").replace(/"/g, '""')}"`,
          color.toUpperCase(),
          wk,
        ].join(",")
      );
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wellness_dia_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ------- KPIs de RANGO (fetch por día, sin tocar APIs) -------
  useEffect(() => {
    if (tab !== "kpis") return; // micro-optimización
    (async () => {
      setRangeLoading(true);
      try {
        const days = Array.from({ length: rangeDays }, (_, i) =>
          toYMD(addDays(fromYMD(date), -i))
        );
        const data = await Promise.all(days.map((d) => fetchWellnessDay(d)));

        // Universo de jugadores que reportaron en el rango (proxy de "plantel activo")
        const universe = new Set<string>();
        for (const rows of data) {
          for (const it of rows) {
            const nm =
              it.userName || it.user?.name || it.user?.email || it.playerKey || "—";
            universe.add(nm);
          }
        }
        const universeSize = universe.size || 1;

        // Por día: promedio SDW + participación %
        const dailyAvg = data.map((rows) => {
          const vals = rows.map((r) => computeSDW(r)).filter((v) => v > 0);
          return vals.length ? Number(mean(vals).toFixed(2)) : 0;
        });
        const dailyPart = data.map((rows) =>
          Math.round(((rows.length || 0) / universeSize) * 100)
        );

        // Histograma SDW (rango)
        const allSDW = data.flatMap((rows) =>
          rows.map((r) => computeSDW(r)).filter((v) => v > 0)
        );
        const bins = [0, 0, 0, 0]; // ≤2 | 2–3 | 3–4 | >4
        for (const v of allSDW) {
          if (v <= 2) bins[0]++;
          else if (v <= 3) bins[1]++;
          else if (v <= 4) bins[2]++;
          else bins[3]++;
        }

        setDailyAvgSDW(dailyAvg); // hoy..hace N-1
        setDailyParticipationPct(dailyPart);
        setSdwHistogram(bins);
      } finally {
        setRangeLoading(false);
      }
    })();
  }, [date, rangeDays, tab]);

  /** -------------------- UI -------------------- */
  return (
    <div className="p-4 space-y-4">
      {/* Header común */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">
            Wellness — Día (CT){" "}
            <HelpTip text="Vista operativa del día. Calcula SDW, compara vs baseline (21d) y aplica semáforo con overrides clínicos." />
          </h1>
          <p className="text-xs text-gray-500">
            {rowsToday.length} registros • Baseline: ventana 21 días previos (min 7 días válidos)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="rounded-md border px-2 py-1.5 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button
            onClick={loadAll}
            className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50"
          >
            Recargar
          </button>
          <button
            onClick={exportCSV}
            className="rounded-lg bg-black text-white px-3 py-1.5 text-sm hover:opacity-90"
          >
            Exportar CSV
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="rounded-xl border bg-white p-1 flex gap-1">
        {[
          { key: "respuestas", label: "Respuestas" },
          { key: "kpis", label: "KPIs" },
          { key: "reportes", label: "Reportes" },
        ].map((t) => {
          const active = tab === (t.key as Tab);
          return (
            <button
              key={t.key}
              onClick={() => switchTab(t.key as Tab)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active ? "bg-black text-white" : "hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* ----- Tab: Respuestas (operativa del día) ----- */}
      {tab === "respuestas" && (
        <>
          {/* Alertas priorizadas */}
          <section className="rounded-xl border bg-white p-3">
            <div className="flex items-center justify-between">
              <div className="text-[12px] font-semibold uppercase">
                Alertas{" "}
                <HelpTip text="Ordenadas por severidad. Rojo: atender hoy; Amarillo: monitoreo/ajuste leve." />
              </div>
              <div className="text-xs text-gray-500">{alerts.length} alerta(s)</div>
            </div>

            {loading ? (
              <div className="p-2 text-gray-500">Cargando…</div>
            ) : alerts.length === 0 ? (
              <div className="p-2 text-gray-500 italic">Sin alertas</div>
            ) : (
              <ul className="mt-2 space-y-1">
                {alerts.map((a, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-lg border px-2 py-1"
                  >
                    <div className="flex items-center gap-2">
                      {a.kind === "CRITICO" ? (
                        <Badge tone="red">Rojo</Badge>
                      ) : (
                        <Badge tone="orange">Amarillo</Badge>
                      )}
                      <span className="font-medium">{a.userName}</span>
                      <span className="text-sm text-gray-700">— {a.reason}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Filtros */}
          <div className="flex items-center gap-2">
            <input
              className="w-full md:w-80 rounded-md border px-2 py-1.5 text-sm"
              placeholder="Buscar por jugador o comentario…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <span className="text-[12px] text-gray-500">{filtered.length} resultado(s)</span>
          </div>

          {/* Tabla principal */}
          <section className="rounded-2xl border bg-white overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 text-[12px] font-semibold uppercase">
              Entradas (día)
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
                      <th className="text-left px-3 py-2">
                        SDW (1–5){" "}
                        <HelpTip text="Promedio de los 5 ítems (1–5); 5=mejor. Base para Z y color." />
                      </th>
                      <th className="text-left px-3 py-2">
                        Baseline (μ±σ){" "}
                        <HelpTip text="Media y desvío de SDW en 21 días válidos. Requiere ≥7 días para Z." />
                      </th>
                      <th className="text-left px-3 py-2">
                        Z{" "}
                        <HelpTip text="(SDW_hoy − μ_baseline)/σ_baseline. Verde ≥ −0.5; Amarillo [−1.0, −0.5); Rojo < −1.0." />
                      </th>
                      <th className="text-left px-3 py-2">
                        Color{" "}
                        <HelpTip text="Semáforo por Z con overrides: Sueño <4h ⇒ ≥ amarillo; Dolor ≤2 ⇒ rojo; Estrés ≤2 ⇒ ≥ amarillo." />
                      </th>
                      <th className="text-left px-3 py-2">
                        Sueño (h){" "}
                        <HelpTip text="Horas de sueño reportadas. <4h eleva la severidad al menos a Amarillo." />
                      </th>
                      <th className="text-left px-3 py-2">
                        Peores ítems{" "}
                        <HelpTip text="Los dos ítems con menor puntaje del día: guía rápida para intervención." />
                      </th>
                      <th className="text-left px-3 py-2">
                        sRPE ayer{" "}
                        <HelpTip text="Carga interna del día previo (RPE×min). >900 AU + SDW rojo ⇒ alerta crítica." />
                      </th>
                      <th className="text-left px-3 py-2">
                        Spark 7d{" "}
                        <HelpTip text="Mini-tendencia de SDW (ayer → hace 7 días). Más alto = mejor." />
                      </th>
                      <th className="text-left px-3 py-2">
                        Comentario <HelpTip text="Texto libre del jugador para contexto cualitativo." />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered
                      .slice()
                      .sort((a, b) => {
                        const colorRank = (c: "green" | "yellow" | "red") =>
                          c === "red" ? 0 : c === "yellow" ? 1 : 2;
                        const ac = (a as any)._color as "green" | "yellow" | "red";
                        const bc = (b as any)._color as "green" | "yellow" | "red";
                        if (colorRank(ac) !== colorRank(bc)) return colorRank(ac) - colorRank(bc);
                        const az = (a as any)._z as number | null;
                        const bz = (b as any)._z as number | null;
                        if (az != null && bz != null) return az - bz;
                        return 0;
                      })
                      .map((r) => {
                        const base = (r as any)._base as Baseline;
                        const z = (r as any)._z as number | null;
                        const baseTone = (r as any)._color as "green" | "yellow" | "red";
                        const worst = [
                          { k: "Sueño", v: r.sleepQuality },
                          { k: "Fatiga", v: r.fatigue },
                          { k: "Dolor", v: r.muscleSoreness },
                          { k: "Estrés", v: r.stress },
                          { k: "Ánimo", v: r.mood },
                        ]
                          .sort((a, b) => a.v - b.v)
                          .slice(0, 2);
                        const spark = (last7[r._userName] || []).slice().reverse(); // ayer..hace 7
                        const srpe = srpeYesterday[r._userName] ?? null;

                        return (
                          <tr key={r.id} className="border-b last:border-0 align-top">
                            <td className="px-3 py-2 font-medium">{r._userName}</td>
                            <td className="px-3 py-2">{(r as any)._sdw.toFixed(2)}</td>
                            <td className="px-3 py-2 text-xs text-gray-700">
                              {base.n >= 7 ? (
                                `${base.mean.toFixed(2)} ± ${base.sd.toFixed(2)} (n=${base.n})`
                              ) : (
                                <span className="text-gray-400">insuficiente</span>
                              )}
                            </td>
                            <td className="px-3 py-2">{z != null ? z.toFixed(2) : "—"}</td>
                            <td className="px-3 py-2">
                              <Badge tone={baseTone}>{baseTone.toUpperCase()}</Badge>
                            </td>
                            <td className="px-3 py-2">{r.sleepHours ?? "—"}</td>
                            <td className="px-3 py-2 text-xs">
                              {worst.map((w) => (
                                <div key={w.k}>
                                  {w.k}: <b>{w.v}</b>
                                </div>
                              ))}
                            </td>
                            <td className="px-3 py-2">
                              {srpe != null ? `${Math.round(srpe)} AU` : "—"}
                            </td>
                            <td className="px-3 py-2">
                              <Sparkline vals={spark} />
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
        </>
      )}

      {/* ----- Tab: KPIs (día + rango) ----- */}
      {tab === "kpis" && (
        <>
          {/* KPIs del día */}
          <section className="rounded-2xl border bg-white px-4 py-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="rounded-xl border p-3">
                <div className="text-[11px] uppercase text-gray-500 flex items-center gap-1">
                  Respondieron hoy
                  <HelpTip text="Cantidad de jugadores con wellness cargado en la fecha seleccionada." />
                </div>
                <div className="mt-1 text-2xl font-bold">{kpis.n}</div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-[11px] uppercase text-gray-500 flex items-center gap-1">
                  SDW promedio
                  <HelpTip text="Promedio de SDW (1–5) entre quienes reportaron hoy." />
                </div>
                <div className="mt-1 text-2xl font-bold">
                  {kpis.sdwAvg ? kpis.sdwAvg.toFixed(2) : "—"}
                </div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-[11px] uppercase text-gray-500 flex items-center gap-1">
                  Verdes / Amarillos / Rojos
                  <HelpTip text="Distribución de severidad por jugador en el día." />
                </div>
                <div className="mt-1 text-sm font-semibold">
                  <span className="text-emerald-700">{kpis.greens}</span>{" "}
                  <span className="text-gray-400">/</span>{" "}
                  <span className="text-amber-700">{kpis.yellows}</span>{" "}
                  <span className="text-gray-400">/</span>{" "}
                  <span className="text-red-700">{kpis.reds}</span>
                </div>
                <div className="mt-2 h-2 w-full rounded bg-gray-100 overflow-hidden">
                  <div
                    className="h-2 bg-emerald-400/80 inline-block"
                    style={{ width: `${kpis.dist.green}%` }}
                    title={`Verde ${kpis.dist.green}%`}
                  />
                  <div
                    className="h-2 bg-amber-400/80 inline-block"
                    style={{ width: `${kpis.dist.yellow}%` }}
                    title={`Amarillo ${kpis.dist.yellow}%`}
                  />
                  <div
                    className="h-2 bg-red-400/80 inline-block"
                    style={{ width: `${kpis.dist.red}%` }}
                    title={`Rojo ${kpis.dist.red}%`}
                  />
                </div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-[11px] uppercase text-gray-500 flex items-center gap-1">
                  Z medio (válidos)
                  <HelpTip text="Promedio de Z entre quienes tienen baseline suficiente (≥7 días y σ>0)." />
                </div>
                <div className="mt-1 text-2xl font-bold">
                  {kpis.zAvg !== null ? kpis.zAvg.toFixed(2) : "—"}
                </div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-[11px] uppercase text-gray-500 flex items-center gap-1">
                  Nota del día
                  <HelpTip text="Priorizar rojos, luego amarillos; chequear causas (dolor, sueño, estrés)." />
                </div>
                <div className="mt-1 text-sm text-gray-700">
                  {kpis.reds > 0
                    ? "Atender rojos hoy (intervención)."
                    : kpis.yellows > 0
                    ? "Monitorear amarillos, ajustar carga."
                    : kpis.n > 0
                    ? "Todo en verde. Mantener."
                    : "Sin datos hoy."}
                </div>
              </div>
            </div>
          </section>

          {/* KPIs de RANGO (7/14/21 días) */}
          <section className="rounded-2xl border bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[12px] font-semibold uppercase">
                KPIs últimos{" "}
                <select
                  className="ml-1 border rounded-md px-1 py-0.5 text-xs"
                  value={rangeDays}
                  onChange={(e) => setRangeDays(Number(e.target.value) as 7 | 14 | 21)}
                >
                  <option value={7}>7</option>
                  <option value={14}>14</option>
                  <option value={21}>21</option>
                </select>{" "}
                días
                <HelpTip text="Se calcula en cliente llamando al endpoint por día. 'Participación' usa como denominador el universo de jugadores que reportaron al menos una vez en el rango." />
              </div>
              <div className="text-xs text-gray-500">
                {rangeLoading ? "Calculando…" : `${dailyAvgSDW.length} día(s)`}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              <div className="rounded-xl border p-3">
                <div className="text-[11px] uppercase text-gray-500">SDW promedio (rango)</div>
                <div className="mt-1 text-xl font-bold">
                  {dailyAvgSDW.length ? mean(dailyAvgSDW).toFixed(2) : "—"}
                </div>
                <div className="mt-2">
                  <div className="text-[11px] text-gray-500 mb-1">Serie diaria</div>
                  <BarsInline values={dailyAvgSDW} maxHint={5} titlePrefix="SDW: " tone="emerald" />
                </div>
              </div>

              <div className="rounded-xl border p-3">
                <div className="text-[11px] uppercase text-gray-500">Participación media</div>
                <div className="mt-1 text-xl font-bold">
                  {dailyParticipationPct.length ? `${Math.round(mean(dailyParticipationPct))}%` : "—"}
                </div>
                <div className="mt-2">
                  <div className="text-[11px] text-gray-500 mb-1">% por día</div>
                  <BarsInline
                    values={dailyParticipationPct}
                    maxHint={100}
                    titlePrefix="% "
                    tone="amber"
                  />
                </div>
              </div>

              <div className="rounded-xl border p-3 col-span-2">
                <div className="text-[11px] uppercase text-gray-500">Histograma SDW (rango)</div>
                <div className="mt-1 grid grid-cols-4 gap-3">
                  {[
                    { label: "≤2", v: sdwHistogram[0], tone: "red" as const },
                    { label: "2–3", v: sdwHistogram[1], tone: "amber" as const },
                    { label: "3–4", v: sdwHistogram[2], tone: "emerald" as const },
                    { label: ">4", v: sdwHistogram[3], tone: "emerald" as const },
                  ].map((b, i) => (
                    <div key={i} className="rounded-xl border p-3">
                      <div className="text-xs text-gray-600">{b.label}</div>
                      <div className="mt-1 text-xl font-bold">{b.v}</div>
                      <div className="mt-2">
                        <BarsInline values={[b.v]} height={40} barWidth={20} gap={0} tone={b.tone} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-[11px] text-gray-500">
                  Nota: bins absolutos como proxy; el color por Z exacto se calcula arriba a nivel del
                  día con baseline 21d.
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ----- Tab: Reportes (skeleton) ----- */}
      {tab === "reportes" && (
        <section className="rounded-2xl border bg-white p-3">
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-semibold uppercase">
              Reportes individuales
              <HelpTip text="MVP: listado de jugadores del día. Próximamente, link al Perfil de Jugador unificado (lesiones, RPE, Wellness, etc.)." />
            </div>
            <div className="text-xs text-gray-500">{rowsToday.length} jugador(es)</div>
          </div>

          {loading ? (
            <div className="p-3 text-gray-500">Cargando…</div>
          ) : rowsToday.length === 0 ? (
            <div className="p-3 text-gray-500 italic">Sin datos hoy</div>
          ) : (
            <ul className="mt-2 grid md:grid-cols-2 lg:grid-cols-3 gap-2">
              {rowsToday
                .slice()
                .sort((a, b) => a._userName.localeCompare(b._userName))
                .map((r) => (
                  <li key={r.id} className="rounded-lg border p-3">
                    <div className="font-medium">{r._userName}</div>
                    <div className="text-xs text-gray-500">
                      SDW hoy: {(r as any)._sdw.toFixed(2)} • Color:{" "}
                      <span className="uppercase">{(r as any)._color}</span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        disabled
                        className="rounded-lg border px-2 py-1 text-xs text-gray-400 cursor-not-allowed"
                        title="Próximamente"
                      >
                        Abrir perfil
                      </button>
                      <button
                        onClick={() => {
                          alert(
                            `Resumen rápido — ${r._userName}\nSDW hoy: ${(r as any)._sdw.toFixed(
                              2
                            )}\nColor: ${(r as any)._color.toUpperCase()}`
                          );
                        }}
                        className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                      >
                        Resumen rápido
                      </button>
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </section>
      )}

      {/* Leyenda simple */}
      <div className="rounded-xl border bg-white p-3 text-xs text-gray-600">
        <b>Semáforo por Z:</b> verde ≥ −0.5, amarillo [−1.0, −0.5), rojo &lt; −1.0. Overrides:
        Sueño &lt;4h ⇒ ≥ amarillo; Dolor ≤2 ⇒ rojo; Estrés ≤2 ⇒ ≥ amarillo.
      </div>
    </div>
  );
}

/** Wrapper con Suspense (requerido por useSearchParams) */
export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-gray-500">Cargando…</div>}>
      <WellnessCT_Day />
    </Suspense>
  );
}
