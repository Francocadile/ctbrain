// src/app/ct/metrics/wellness/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import HelpTip from "@/components/HelpTip";
import PlayerQuickView from "@/components/PlayerQuickView";

import {
  type WellnessRaw,
  type Baseline,
  toYMD,
  fromYMD,
  addDays,
  mean,
  sdSample,
  computeSDW,
  zToColor,
  applyOverrides,
} from "@/lib/metrics/wellness";

export const dynamic = "force-dynamic";

/** ---------- utils fecha ---------- */
function yesterdayYMD(ymd: string) {
  return toYMD(addDays(fromYMD(ymd), -1));
}

/** ---------- Tipos ---------- */
type DayRow = WellnessRaw & {
  _userName: string;
  _sdw: number;
};

type Alert = {
  kind: "CRITICO" | "AMARILLO";
  reason: string;
  userName: string;
  priority: number;
};

type RPERow = { userName: string; srpe: number };
type InjuryRow = { userId: string; userName: string; status: string };

/** ---------- UI helpers ---------- */
function Badge({
  children,
  tone,
}: {
  children: any;
  tone: "green" | "yellow" | "red" | "lime" | "orange" | "gray";
}) {
  const map: Record<string, string> = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    yellow: "bg-amber-50 text-amber-700 border-amber-200",
    lime: "bg-lime-50 text-lime-700 border-lime-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    red: "bg-red-50 text-red-700 border-red-200",
    gray: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${map[tone]}`}>
      {children}
    </span>
  );
}

function Sparkline({ vals }: { vals: number[] }) {
  if (!vals.length) return <span className="text-gray-400">—</span>;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = Math.max(1e-6, max - min);
  return (
    <div className="flex items-end gap-0.5 h-6">
      {vals.map((v, i) => {
        const h = 6 + Math.round(16 * ((v - min) / range));
        return <div key={i} className="w-1.5 bg-gray-400/60 rounded-sm" style={{ height: `${h}px` }} />;
      })}
    </div>
  );
}

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

/** ---------- nombre consistente ---------- */
function nameOf(r: WellnessRaw): string {
  return r.userName || r.user?.name || r.user?.email || "Jugador";
}

/** ---------- Componente ---------- */
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
  const [last7, setLast7] = useState<Record<string, number[]>>({});
  const [srpeYesterday, setSrpeYesterday] = useState<Record<string, number>>({});
  const [injuriesToday, setInjuriesToday] = useState<Record<string, InjuryRow>>({});

  const [baselineMap, setBaselineMap] = useState<Record<string, Baseline>>({});

  // KPIs de rango
  const [rangeDays, setRangeDays] = useState<7 | 14 | 21>(7);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [dailyAvgSDW, setDailyAvgSDW] = useState<number[]>([]);
  const [dailyParticipationPct, setDailyParticipationPct] = useState<number[]>([]);
  const [sdwHistogram, setSdwHistogram] = useState<number[]>([0, 0, 0, 0]);

  // QuickView
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickPlayer, setQuickPlayer] = useState<string | null>(null);
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickSDW7, setQuickSDW7] = useState<number[]>([]);
  const [quickRPE7, setQuickRPE7] = useState<{ date: string; au: number }[]>([]);
  const PlayerQuickViewAny = PlayerQuickView as unknown as React.ComponentType<any>;

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
        userName: r.userName || r.user?.name || r.user?.email || "Jugador",
        srpe: Number(srpeVal),
      };
    });
  }

  async function fetchInjuries(d: string) {
    const res = await fetch(`/api/injuries?date=${d}`, { cache: "no-store" });
    if (!res.ok) return {};
    const arr = await res.json();
    const map: Record<string, InjuryRow> = {};
    for (const it of Array.isArray(arr) ? arr : []) {
      const nm = it.userName || it.user?.name || it.user?.email || "—";
      map[nm] = { userId: it.userId, userName: nm, status: it.status };
    }
    return map;
  }

  async function loadAll() {
    setLoading(true);

    // Día actual
    const today = await fetchWellnessDay(date);
    const todayFixed: DayRow[] = today.map((it: any) => {
      const nm = nameOf(it);
      return { ...it, _userName: nm, _sdw: computeSDW(it) };
    });

    // Lesionados del día
    const injMap = await fetchInjuries(date);

    // Ventana 21d previos
    const prevDays: string[] = Array.from({ length: 21 }, (_, i) =>
      toYMD(addDays(fromYMD(date), -(i + 1)))
    );
    const prevDataChunks = await Promise.all(prevDays.map((d) => fetchWellnessDay(d)));

    const map: Record<string, number[]> = {};
    const last7map: Record<string, number[]> = {};

    for (let di = 0; di < prevDataChunks.length; di++) {
      const dayArr = prevDataChunks[di];
      for (const it of dayArr) {
        const nm = nameOf(it);
        const sdw = computeSDW(it);
        if (!map[nm]) map[nm] = [];
        map[nm].push(sdw);
        if (di < 7) {
          if (!last7map[nm]) last7map[nm] = [];
          last7map[nm].push(sdw);
        }
      }
    }

    const baselines: Record<string, Baseline> = {};
    for (const [nm, arr] of Object.entries(map)) {
      const arrClean = arr.filter((v) => v > 0);
      baselines[nm] = { mean: mean(arrClean), sd: sdSample(arrClean), n: arrClean.length };
    }

    // sRPE de ayer
    const ysrpe = await fetchRPE(yesterdayYMD(date));
    const srpeMap: Record<string, number> = {};
    for (const r of ysrpe) srpeMap[r.userName] = r.srpe || 0;

    // enriquecer filas
    const withStats = todayFixed.map((r) => {
      const base = baselines[r._userName];
      const z = base && base.n >= 7 && base.sd > 0 ? (r._sdw - base.mean) / base.sd : null;
      const baseColor = zToColor(z);
      const finalColor = applyOverrides(baseColor, r);
      return { ...r, _z: z, _color: finalColor, _base: base || { mean: 0, sd: 0, n: 0 } };
    });

    // alertas
    const alertsList: Alert[] = [];
    for (const r of withStats as any[]) {
      const base = r._base as Baseline;
      const z = r._z as number | null;
      const color = r._color as "green" | "yellow" | "red";

      const overrides: string[] = [];
      if ((r.sleepHours ?? null) !== null && (r.sleepHours as number) < 4) overrides.push("Sueño <4h");
      if (r.muscleSoreness != null && r.muscleSoreness <= 2) overrides.push("Dolor muscular ≤2");
      if (r.stress != null && r.stress <= 2) overrides.push("Estrés ≤2");

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
    setInjuriesToday(injMap);
    setLoading(false);
  }

  // KPIs del día
  const kpis = useMemo(() => {
    const n = rowsToday.length;
    const sdws = rowsToday.map((r: any) => Number(r._sdw || 0)).filter((v) => v > 0);
    const sdwAvg = sdws.length ? mean(sdws) : 0;

    let reds = 0, yellows = 0, greens = 0;
    const zVals: number[] = [];
    for (const r of rowsToday as any[]) {
      const c = r._color as "green" | "yellow" | "red";
      if (c === "red") reds++; else if (c === "yellow") yellows++; else greens++;
      if (r._z != null) zVals.push(Number(r._z));
    }
    const zAvg = zVals.length ? mean(zVals) : null;

    return {
      n, sdwAvg, reds, yellows, greens, zAvg,
      dist: n
        ? {
            red: Math.round((reds / n) * 100),
            yellow: Math.round((yellows / n) * 100),
            green: Math.round((greens / n) * 100),
          }
        : { red: 0, yellow: 0, green: 0 },
    };
  }, [rowsToday]);

  // Filtro
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

  // Export CSV (día)
  function exportCSV() {
    const header = [
      "Jugador","Fecha","Sueño_calidad","Horas_sueño","Fatiga","Dolor_muscular","Estrés","Ánimo","Total_diario","Comentario","Color","Semana_ISO",
    ];
    const lines = [header.join(",")];

    for (const r of filtered) {
      const wk = r.date;
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
    a.href = url; a.download = `wellness_dia_${date}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // ------- KPIs de rango (7/14/21) -------
  function exportRangeKPIsCSV() {
    const start = toYMD(addDays(fromYMD(date), -(rangeDays - 1)));
    const header = ["Fecha","SDW_promedio_día","Participación_%"];
    const lines = [header.join(",")];

    for (let i = 0; i < rangeDays; i++) {
      const d = toYMD(addDays(fromYMD(date), -i));
      const sdw = dailyAvgSDW[i] ?? "";
      const part = dailyParticipationPct[i] ?? "";
      lines.push([d, sdw, part].join(","));
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `wellness_kpis_${start}_a_${date}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (tab !== "kpis") return;
    (async () => {
      setRangeLoading(true);
      try {
        const days = Array.from({ length: rangeDays }, (_, i) =>
          toYMD(addDays(fromYMD(date), -i))
        );
        const data = await Promise.all(days.map((d) => fetchWellnessDay(d)));

        const universe = new Set<string>();
        for (const rows of data) {
          for (const it of rows) {
            universe.add(nameOf(it));
          }
        }
        const universeSize = universe.size || 1;

        const dailyAvg = data.map((rows) => {
          const vals = rows.map((r) => computeSDW(r)).filter((v) => v > 0);
          return vals.length ? Number(mean(vals).toFixed(2)) : 0;
        });
        const dailyPart = data.map((rows) =>
          Math.round(((rows.length || 0) / universeSize) * 100)
        );

        const allSDW = data.flatMap((rows) =>
          rows.map((r) => computeSDW(r)).filter((v) => v > 0)
        );
        const bins = [0, 0, 0, 0];
        for (const v of allSDW) {
          if (v <= 2) bins[0]++; else if (v <= 3) bins[1]++; else if (v <= 4) bins[2]++; else bins[3]++;
        }

        setDailyAvgSDW(dailyAvg);
        setDailyParticipationPct(dailyPart);
        setSdwHistogram(bins);
      } finally {
        setRangeLoading(false);
      }
    })();
  }, [date, rangeDays, tab]);

  // QuickView
  async function openQuickViewFor(playerName: string) {
    setQuickPlayer(playerName);
    setQuickOpen(true);
    setQuickLoading(true);
    try {
      const sdw7 = [
        (rowsToday.find((r) => r._userName === playerName)?._sdw ?? 0) as number,
        ...(last7[playerName] || []),
      ];
      setQuickSDW7(sdw7);

      const days = Array.from({ length: 7 }, (_, i) => toYMD(addDays(fromYMD(date), -i)));
      const rpeData = await Promise.all(days.map((d) => fetchRPE(d)));

      const rpeList: { date: string; au: number }[] = [];
      for (let i = 0; i < days.length; i++) {
        const day = days[i];
        const arr = rpeData[i] || [];
        for (const r of arr) {
          if (r.userName === playerName) {
            rpeList.push({ date: day, au: r.srpe || 0 });
            break;
          }
        }
      }
      setQuickRPE7(rpeList);
    } finally {
      setQuickLoading(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
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
          <input type="date" className="rounded-md border px-2 py-1.5 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
          <button onClick={loadAll} className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50">Recargar</button>
          <button onClick={exportCSV} className="rounded-lg bg-black text-white px-3 py-1.5 text-sm hover:opacity-90">Exportar CSV</button>
        </div>
      </header>

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

      {tab === "respuestas" && (
        <>
          {/* Alertas */}
          <section className="rounded-xl border bg-white p-3">
            <div className="flex items-center justify-between">
              <div className="text-[12px] font-semibold uppercase">
                Alertas <HelpTip text="Ordenadas por severidad. Rojo: atender hoy; Amarillo: monitoreo/ajuste leve." />
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
                  <li key={i} className="flex items-center justify-between rounded-lg border px-2 py-1">
                    <div className="flex items-center gap-2">
                      {a.kind === "CRITICO" ? <Badge tone="red">Rojo</Badge> : <Badge tone="orange">Amarillo</Badge>}
                      <span className="font-medium">{a.userName}</span>
                      <span className="text-sm text-gray-700">— {a.reason}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openQuickViewFor(a.userName)} className="rounded-md border px-2 py-0.5 text-xs hover:bg-gray-50">
                        Ver
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Filtro */}
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
            <div className="bg-gray-50 px-3 py-2 text-[12px] font-semibold uppercase">Entradas (día)</div>
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
                        SDW (1–5) <HelpTip text="Promedio de los 5 ítems (1–5); 5=mejor. Base para Z y color." />
                      </th>
                      <th className="text-left px-3 py-2">
                        Baseline (μ±σ) <HelpTip text="Media y desvío de SDW en 21 días válidos. Requiere ≥7 días para Z." />
                      </th>
                      <th className="text-left px-3 py-2">
                        Z <HelpTip text="(SDW_hoy − μ_baseline)/σ_baseline. Verde ≥ −0.5; Amarillo [−1.0, −0.5); Rojo < −1.0." />
                      </th>
                      <th className="text-left px-3 py-2">
                        Color <HelpTip text="Semáforo por Z con overrides: Sueño <4h ⇒ ≥ amarillo; Dolor ≤2 ⇒ rojo; Estrés ≤2 ⇒ ≥ amarillo." />
                      </th>
                      <th className="text-left px-3 py-2">
                        Sueño (h) <HelpTip text="Horas de sueño reportadas. <4h eleva la severidad al menos a Amarillo." />
                      </th>
                      <th className="text-left px-3 py-2">
                        Peores ítems <HelpTip text="Los dos ítems con menor puntaje del día: guía rápida para intervención." />
                      </th>
                      <th className="text-left px-3 py-2">
                        sRPE ayer <HelpTip text="Carga interna del día previo (RPE×min). >900 AU + SDW rojo ⇒ alerta crítica." />
                      </th>
                      <th className="text-left px-3 py-2">
                        Spark 7d <HelpTip text="Mini-tendencia de SDW (ayer → hace 7 días). Más alto = mejor." />
                      </th>
                      <th className="text-left px-3 py-2">
                        Comentario <HelpTip text="Texto libre del jugador para contexto cualitativo." />
                      </th>
                      <th className="text-right px-3 py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered
                      .slice()
                      .sort((a, b) => {
                        const colorRank = (c: "green" | "yellow" | "red") => (c === "red" ? 0 : c === "yellow" ? 1 : 2);
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
                        ].sort((a, b) => a.v - b.v).slice(0, 2);
                        const spark = (last7[r._userName] || []).slice().reverse();
                        const srpe = srpeYesterday[r._userName] ?? null;
                        const inj = injuriesToday[r._userName] || null;

                        return (
                          <tr key={r.id} className="border-b last:border-0 align-top">
                            <td className="px-3 py-2 font-medium">
                              {r._userName}{" "}
                              {inj && <span className="ml-1"><Badge tone="gray">LESIONADO</Badge></span>}
                            </td>
                            <td className="px-3 py-2">{(r as any)._sdw.toFixed(2)}</td>
                            <td className="px-3 py-2 text-xs text-gray-700">
                              {base.n >= 7 ? `${base.mean.toFixed(2)} ± ${base.sd.toFixed(2)} (n=${base.n})` : <span className="text-gray-400">insuficiente</span>}
                            </td>
                            <td className="px-3 py-2">{z != null ? z.toFixed(2) : "—"}</td>
                            <td className="px-3 py-2"><Badge tone={baseTone}>{baseTone.toUpperCase()}</Badge></td>
                            <td className="px-3 py-2">{r.sleepHours ?? "—"}</td>
                            <td className="px-3 py-2 text-xs">
                              {worst.map((w) => (<div key={w.k}>{w.k}: <b>{w.v}</b></div>))}
                            </td>
                            <td className="px-3 py-2">{srpe != null ? `${Math.round(srpe)} AU` : "—"}</td>
                            <td className="px-3 py-2"><Sparkline vals={spark} /></td>
                            <td className="px-3 py-2"><span className="text-gray-600">{r.comment || "—"}</span></td>
                            <td className="px-3 py-2">
                              <div className="flex justify-end">
                                <button onClick={() => openQuickViewFor(r._userName)} className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50">Ver</button>
                              </div>
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

      {tab === "kpis" && (
        <>
          <section className="rounded-2xl border bg-white px-4 py-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {/* KPIs del día (si querés sumar tarjetas acá) */}
            </div>
          </section>

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
                <HelpTip text="Se calcula en cliente llamando al endpoint por día. 'Participación' usa el universo de jugadores que reportaron al menos una vez en el rango." />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={exportRangeKPIsCSV} className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50">
                  Exportar KPIs (rango)
                </button>
                <div className="text-xs text-gray-500">
                  {rangeLoading ? "Calculando…" : `${dailyAvgSDW.length} día(s)`}
                </div>
              </div>
            </div>

            {/* Colocá tus series/histogramas aquí si los necesitás */}
          </section>
        </>
      )}

      {/* Leyenda + QuickView */}
      <div className="rounded-xl border bg-white p-3 text-xs text-gray-600">
        <b>Semáforo por Z:</b> verde ≥ −0.5, amarillo [−1.0, −0.5), rojo &lt; −1.0. Overrides:
        Sueño &lt;4h ⇒ ≥ amarillo; Dolor ≤2 ⇒ rojo; Estrés ≤2 ⇒ ≥ amarillo.
      </div>

      {quickPlayer && (
        <PlayerQuickViewAny
          open={quickOpen}
          onClose={() => setQuickOpen(false)}
          loading={quickLoading}
          playerName={quickPlayer}
          date={date}
          sdw7={quickSDW7}
          rpeRecent={quickRPE7}
          context={{ injuriesToday }}
        />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-gray-500">Cargando…</div>}>
      <WellnessCT_Day />
    </Suspense>
  );
}
