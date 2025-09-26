"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import HelpTip from "@/components/HelpTip";
import PlayerQuickView from "@/components/PlayerQuickView";

/* ======= Métricas RPE / Wellness (helpers ya existentes) ======= */
import { mean, srpeOf, type RPERow as RPERowLib } from "@/lib/metrics/rpe";
import {
  type WellnessRaw,
  toYMD as toYMDw,
  fromYMD as fromYMDw,
  addDays as addDaysW,
  computeSDW,
} from "@/lib/metrics/wellness";

/* ======= Config ======= */
export const dynamic = "force-dynamic";

/* ======= Tipos ======= */
type Row = RPERowLib & {
  id: string;
  date: string;
  // Soporte opcional para multi-sesión (si API/schema ya lo provee)
  sessionId?: string | null;
  sessionIndex?: number | null;
  sessionLabel?: string | null;
};

type InjuryRow = { userId: string; userName: string; status: string };

/* ======= Utils fecha ======= */
function toYMD(d: Date) { return d.toISOString().slice(0, 10); }
function fromYMD(s: string) { const [y,m,dd] = s.split("-").map(Number); return new Date(y, m - 1, dd); }
function addDays(d: Date, days: number) { const x = new Date(d); x.setDate(x.getDate() + days); return x; }
function mondayOf(date: Date) {
  const x = new Date(date);
  const dow = x.getDay(); // 0=Dom,1=Lun
  const diff = (dow === 0 ? -6 : 1 - dow);
  return addDays(x, diff);
}

/* ======= Barras mini-KPI ======= */
function BarsInline({
  values, maxHint, height = 60, barWidth = 12, gap = 4, titlePrefix = "", tone = "gray",
}: {
  values: number[]; maxHint?: number; height?: number; barWidth?: number; gap?: number; titlePrefix?: string;
  tone?: "gray" | "emerald" | "amber" | "red";
}) {
  const max = Math.max(maxHint ?? 0, ...values, 1);
  const toneCls: Record<string, string> = {
    gray: "bg-gray-300", emerald: "bg-emerald-400/80", amber: "bg-amber-400/80", red: "bg-red-400/80",
  };
  return (
    <div className="flex items-end gap-1 overflow-x-auto" style={{ height }}>
      {values.map((v, i) => {
        const h = Math.max(2, Math.round((v / max) * (height - 10)));
        return (
          <div key={i} title={`${titlePrefix}${v}`} className={`rounded-sm ${toneCls[tone]}`}
            style={{ width: barWidth, height: h, marginRight: gap }} />
        );
      })}
    </div>
  );
}

/* ======= Badges simples ======= */
function Badge({children, tone}:{children:any; tone:"green"|"yellow"|"red"|"gray"}) {
  const map: Record<string,string> = {
    green:  "bg-emerald-50 text-emerald-700 border-emerald-200",
    yellow: "bg-amber-50 text-amber-700 border-amber-200",
    red:    "bg-red-50 text-red-700 border-red-200",
    gray:   "bg-gray-100 text-gray-700 border-gray-200",
  };
  return <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${map[tone]}`}>{children}</span>;
}
function toneACWR(v: number | null): "green"|"yellow"|"red"|"gray" {
  if (v == null || !isFinite(v)) return "gray";
  if (v < 0.8 || v > 1.5) return "red";
  if (v <= 1.3) return "green";
  return "yellow";
}
function toneAU(total: number): "green"|"yellow"|"red" {
  if (total < 1500) return "yellow";
  if (total > 4500) return "red";
  return "green";
}

/* ======= Componente principal ======= */
function RPECTUnified() {
  type Tab = "dia" | "semana" | "reportes";
  const search = useSearchParams();
  const initialTab = (search.get("tab") as Tab) || "dia";
  const [tab, setTab] = useState<Tab>(initialTab);
  function switchTab(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url.toString());
  }

  /* ======= Estado Día ======= */
  const [date, setDate] = useState<string>(toYMD(new Date()));
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [bulkMin, setBulkMin] = useState<string>("90");
  const [saving, setSaving] = useState(false);
  const [injuriesToday, setInjuriesToday] = useState<Record<string, InjuryRow>>({});

  // KPIs de rango (día → tarjetas en tab KPIs semanales ya no existe, lo mantenemos acotado a “semana” abajo)
  const [rangeDays, setRangeDays] = useState<7 | 14 | 21>(7);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [dailyTeamSRPE, setDailyTeamSRPE] = useState<number[]>([]);
  const [srpeHistBins, setSrpeHistBins] = useState<number[]>([0, 0, 0, 0, 0]);

  // QuickView
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickPlayer, setQuickPlayer] = useState<string | null>(null);
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickSDW7, setQuickSDW7] = useState<number[]>([]);
  const [quickRPE7, setQuickRPE7] = useState<{ date: string; au: number }[]>([]);
  const PlayerQuickViewAny = PlayerQuickView as unknown as React.ComponentType<any>;

  async function loadDay() {
    setLoading(true);
    try {
      const res = await fetch(`/api/metrics/rpe?date=${date}`, { cache: "no-store" });
      const data = res.ok ? await res.json() : [];
      const fixed = (Array.isArray(data) ? data : []).map((r: any) => ({
        ...r,
        userName: r.userName || r.playerKey || r.user?.name || r.user?.email || "Jugador",
      })) as Row[];
      setRows(fixed);

      // lesionados del día
      const injRes = await fetch(`/api/injuries?date=${date}`, { cache: "no-store" });
      if (injRes.ok) {
        const inj = await injRes.json();
        const map: Record<string, InjuryRow> = {};
        for (const it of Array.isArray(inj) ? inj : []) {
          const nm = it.userName || it.user?.name || it.user?.email || "—";
          map[nm] = { userId: it.userId, userName: nm, status: it.status };
        }
        setInjuriesToday(map);
      } else {
        setInjuriesToday({});
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadDay(); /* eslint-disable-next-line */ }, [date]);

  const filteredDay = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(
      (r) =>
        (r.userName || "").toLowerCase().includes(t) ||
        (r.playerKey || "").toLowerCase().includes(t)
    );
  }, [rows, q]);

  const filteredSortedDay = useMemo(
    () => filteredDay.slice().sort((a, b) => srpeOf(b) - srpeOf(a)),
    [filteredDay]
  );

  async function applyDefaultDuration() {
    const minutes = Math.max(0, Number(bulkMin || 0));
    if (!minutes) return alert("Ingresá minutos > 0");
    setSaving(true);
    try {
      const res = await fetch("/api/metrics/rpe/default-duration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, duration: minutes }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadDay();
    } catch (e: any) {
      alert(e?.message || "Error aplicando duración");
    } finally {
      setSaving(false);
    }
  }

  async function clearDurations() {
    if (!confirm(`¿Poner en blanco la duración del ${date}?`)) return;
    setSaving(true);
    try {
      const res = await fetch("/api/metrics/rpe/clear-duration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadDay();
    } catch (e: any) {
      alert(e?.message || "Error limpiando duraciones");
    } finally {
      setSaving(false);
    }
  }

  async function saveOne(row: Row, newMinStr: string) {
    const minutes = newMinStr === "" ? null : Math.max(0, Number(newMinStr));
    setSaving(true);
    try {
      const res = await fetch(`/api/metrics/rpe/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration: minutes }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadDay();
    } catch (e: any) {
      alert(e?.message || "Error guardando fila");
    } finally {
      setSaving(false);
    }
  }

  // KPIs del día (widgets rápidos)
  const kpisDay = useMemo(() => {
    const n = rows.length;
    const withRpe = rows.filter((r) => r.rpe != null && Number(r.rpe) >= 0).length;
    const withDur = rows.filter((r) => r.duration != null && Number(r.duration) > 0).length;
    const rpeAvg = n ? mean(rows.map((r) => Number(r.rpe || 0))) : 0;
    const totalSRPE = rows
      .map((r) => srpeOf(r))
      .filter((v) => !Number.isNaN(v))
      .reduce((a, b) => a + b, 0);

    let b1 = 0, b2 = 0, b3 = 0;
    for (const r of rows) {
      const v = Number(r.rpe || 0);
      if (v <= 3) b1++;
      else if (v <= 6) b2++;
      else b3++;
    }

    return {
      n,
      withRpe,
      withDur,
      withRpePct: n ? Math.round((withRpe / n) * 100) : 0,
      withDurPct: n ? Math.round((withDur / n) * 100) : 0,
      rpeAvg,
      totalSRPE,
      distRPE: { low: b1, mid: b2, high: b3 },
    };
  }, [rows]);

  // Export CSV (día) — incluye Sesión (si existe) + banderas faltantes
  function exportCSVDia() {
    const header = ["Jugador", "Fecha", "Sesión", "RPE", "Minutos", "sRPE_AU", "Falta_RPE", "Faltan_Minutos"];
    const lines = [header.join(",")];

    for (const r of filteredSortedDay) {
      const jug = (r.userName || r.playerKey || "Jugador").replace(/"/g, '""');
      const au = srpeOf(r);
      const sesion =
        r.sessionLabel ??
        (r.sessionIndex != null ? `Sesión ${r.sessionIndex}` : r.sessionId ?? "");
      const faltaRpe = r.rpe == null || Number.isNaN(Number(r.rpe));
      const faltaMin = r.duration == null || Number(r.duration) <= 0;

      lines.push([
        `"${jug}"`,
        r.date,
        `"${(sesion ?? "").toString().replace(/"/g,'""')}"`,
        r.rpe ?? "",
        r.duration ?? "",
        au ? Math.round(au) : "",
        faltaRpe ? "1" : "0",
        faltaMin ? "1" : "0",
      ].join(","));
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `rpe_dia_${date}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // QuickView (SDW + AU 7 días)
  async function fetchWellnessDay(d: string): Promise<WellnessRaw[]> {
    const res = await fetch(`/api/metrics/wellness?date=${d}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }
  async function openQuickViewFor(playerName: string) {
    setQuickPlayer(playerName);
    setQuickOpen(true);
    setQuickLoading(true);
    try {
      const daysW = Array.from({ length: 8 }, (_, i) =>
        toYMDw(addDaysW(fromYMDw(date), -(i === 0 ? 0 : i)))
      );
      const wData = await Promise.all(daysW.map((d) => fetchWellnessDay(d)));
      const sdwSeries: number[] = [];
      for (let i = 0; i < daysW.length; i++) {
        const arr = wData[i] || [];
        const row = arr.find(
          (it) =>
            (it.userName ||
              it.user?.name ||
              it.user?.email ||
              it.playerKey ||
              "—") === playerName
        );
        sdwSeries.push(row ? Number(computeSDW(row).toFixed(2)) : 0);
      }
      setQuickSDW7(sdwSeries);

      const daysR = Array.from({ length: 7 }, (_, i) => toYMD(addDays(fromYMD(date), -i)));
      const rpeData = await Promise.all(
        daysR.map((d) => fetch(`/api/metrics/rpe?date=${d}`, { cache: "no-store" }))
      );
      const rpeJson = await Promise.all(rpeData.map((r) => (r.ok ? r.json() : [])));
      const auList: { date: string; au: number }[] = [];
      for (let i = 0; i < daysR.length; i++) {
        const arr = Array.isArray(rpeJson[i]) ? rpeJson[i] : [];
        for (const r of arr) {
          const nm = r.userName || r.playerKey || r.user?.name || r.user?.email || "Jugador";
          if (nm === playerName) {
            const au = r.load ?? r.srpe ?? Number(r.rpe ?? 0) * Number(r.duration ?? 0) ?? 0;
            auList.push({ date: daysR[i], au: Number(au) });
            break;
          }
        }
      }
      setQuickRPE7(auList);
    } finally {
      setQuickLoading(false);
    }
  }

  /* ======= Estado Semana (agrego aquí la lógica de la antigua /semana) ======= */
  type RPERaw = {
    id: string;
    user?: { name?: string; email?: string };
    userName?: string | null;
    playerKey?: string | null;
    date: string;        // YYYY-MM-DD
    rpe?: number | null; // 0..10
    duration?: number | null; // min
    srpe?: number | null;     // AU
    load?: number | null;     // AU (compat)
    comment?: string | null;
  };
  type WeekAgg = {
    userName: string;
    daysAU: number[];     // 7 valores L..D
    totalAU: number;      // suma semanal
    acute7: number;       // = totalAU (semana seleccionada)
    chronic28: number;    // promedio 28d * 7
    acwr: number | null;  // acute7 / chronic28
    mean: number;         // media diaria semana
    sd: number;           // sd diaria semana
    monotony: number | null; // mean/sd
    strain: number | null;   // totalAU * monotony
  };

  const [monday, setMonday] = useState<Date>(() => mondayOf(new Date()));
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [weekDays, setWeekDays] = useState<string[]>([]);
  const [prev28Days, setPrev28Days] = useState<string[]>([]);
  const [qWeek, setQWeek] = useState("");
  const [rowsWeek, setRowsWeek] = useState<WeekAgg[]>([]);

  useEffect(() => {
    const days7 = Array.from({length:7}, (_,i)=> toYMD(addDays(monday, i)));
    setWeekDays(days7);
    const startPrev = addDays(monday, -28);
    const prev28 = Array.from({length:28}, (_,i)=> toYMD(addDays(startPrev, i)));
    setPrev28Days(prev28);
  }, [monday]);

  useEffect(() => { if (tab==="semana" && weekDays.length===7 && prev28Days.length===28) loadWeek(); /* eslint-disable-next-line */ }, [tab, weekDays.join(","), prev28Days.join(",")]);

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
    const au = (r.load ?? r.srpe ?? (Number(r.rpe ?? 0) * Number(r.duration ?? 0))) ?? 0;
    return Math.max(0, Math.round(Number(au)));
  }

  async function loadWeek() {
    setLoadingWeek(true);
    try {
      // 7 días de la semana
      const weekChunks = await Promise.all(weekDays.map(d => fetchRpeDay(d)));
      const mapWeek: Record<string, number[]> = {};
      weekChunks.forEach((dayArr, dayIdx) => {
        for (const r of dayArr) {
          const nm = resolveName(r);
          if (!mapWeek[nm]) mapWeek[nm] = Array(7).fill(0);
          mapWeek[nm][dayIdx] += resolveAU(r); // suma múltiples sesiones del mismo día
        }
      });

      // 28 días previos para crónico
      const prevChunks = await Promise.all(prev28Days.map(d => fetchRpeDay(d)));
      const mapPrev28: Record<string, number[]> = {};
      prevChunks.forEach((dayArr) => {
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

      const allNames = new Set<string>([
        ...Object.keys(mapWeek),
        ...Object.keys(mapPrev28),
      ]);
      const out: WeekAgg[] = [];
      for (const nm of allNames) {
        const daysAU = (mapWeek[nm] ?? Array(7).fill(0)).map(v => Math.max(0, Math.round(v)));
        const totalAU = daysAU.reduce((a,b)=>a+b,0);
        const acute7 = totalAU;
        const prevArr = (mapPrev28[nm] ?? []);
        const chronic28 = prevArr.length ? mean(prevArr) * 7 : 0;
        const acwr = chronic28 > 0 ? (acute7 / chronic28) : null;
        const m = mean(daysAU);
        const s = (function sdSample(arr: number[]) {
          const n = arr.length; if (n < 2) return 0;
          const mm = mean(arr);
          const v = arr.reduce((acc,v)=>acc+(v-mm)*(v-mm),0)/(n-1);
          return Math.sqrt(v);
        })(daysAU);
        const monotony = s > 0 ? (m / s) : null;
        const strain = monotony != null ? (totalAU * monotony) : null;
        out.push({ userName: nm, daysAU, totalAU, acute7, chronic28, acwr, mean: m, sd: s, monotony, strain });
      }

      out.sort((a,b) => {
        const rank = (x: WeekAgg) => {
          const t = toneACWR(x.acwr);
          return t==="red"?0:t==="yellow"?1:t==="green"?2:3;
        };
        const rr = rank(a) - rank(b);
        if (rr !== 0) return rr;
        return b.totalAU - a.totalAU;
      });

      setRowsWeek(out);
    } finally {
      setLoadingWeek(false);
    }
  }

  function shiftWeek(delta: number) { setMonday(prev => addDays(prev, delta * 7)); }
  function onPickDate(s: string) { setMonday(mondayOf(new Date(s))); }

  const filteredWeek = useMemo(() => {
    const t = qWeek.trim().toLowerCase();
    if (!t) return rowsWeek;
    return rowsWeek.filter(r => r.userName.toLowerCase().includes(t));
  }, [rowsWeek, qWeek]);

  const summaryWeek = useMemo(() => {
    if (!filteredWeek.length) return { players: 0, totalAU: 0, avgAU: 0 };
    const totalAU = filteredWeek.reduce((a,r)=>a+r.totalAU,0);
    const avgAU = totalAU / filteredWeek.length;
    return { players: filteredWeek.length, totalAU, avgAU };
  }, [filteredWeek]);

  function exportCSVWeek() {
    const header = [
      "Jugador", "Lunes_AU","Martes_AU","Miercoles_AU","Jueves_AU","Viernes_AU","Sabado_AU","Domingo_AU",
      "AU_total_semana","Agudo_7d","Cronico_28d","ACWR","Monotonia","Strain",
      `Semana (${toYMD(monday)} a ${toYMD(addDays(monday,6))})`
    ];
    const lines = [header.join(",")];
    for (const r of filteredWeek) {
      lines.push([
        `"${r.userName.replace(/"/g,'""')}"`,
        ...r.daysAU.map(x=>String(x)),
        r.totalAU,
        r.acute7,
        r.chronic28.toFixed(1),
        r.acwr==null ? "" : r.acwr.toFixed(2),
        r.monotony==null ? "" : r.monotony.toFixed(2),
        r.strain==null ? "" : Math.round(r.strain),
        ""
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `rpe_semana_${toYMD(monday)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  /* ======= UI ======= */
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">
            RPE (CT){" "}
            <HelpTip text="RPE 0–10 respondido 30' post-sesión. El CT define la duración; sRPE = RPE×min. Semana calcula ACWR, Monotonía y Strain." />
          </h1>
          <p className="text-xs text-gray-500">
            Vista unificada Día/Semana/Reportes • sRPE = RPE × minutos
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Controles del Día (cuando corresponde) */}
          {tab === "dia" && (
            <>
              <input type="date" className="rounded-md border px-2 py-1.5 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
              <button onClick={loadDay} className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50">Recargar</button>
              <button onClick={exportCSVDia} className="rounded-lg bg-black text-white px-3 py-1.5 text-sm hover:opacity-90">Exportar CSV</button>
            </>
          )}
          {/* Controles de Semana */}
          {tab === "semana" && (
            <>
              <button onClick={()=>shiftWeek(-1)} className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50">← Semana anterior</button>
              <input type="date" className="rounded-md border px-2 py-1.5 text-sm" value={toYMD(monday)} onChange={e=>onPickDate(e.target.value)} />
              <button onClick={()=>shiftWeek(+1)} className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50">Semana siguiente →</button>
              <button onClick={exportCSVWeek} className="rounded-lg bg-black text-white px-3 py-1.5 text-sm hover:opacity-90">
                Exportar CSV
              </button>
            </>
          )}
        </div>
      </header>

      {/* Tabs */}
      <nav className="rounded-xl border bg-white p-1 flex gap-1">
        {[
          { key: "dia", label: "Día" },
          { key: "semana", label: "Semana" },
          { key: "reportes", label: "Reportes" },
        ].map((t) => {
          const active = tab === (t.key as Tab);
          return (
            <button
              key={t.key}
              onClick={() => switchTab(t.key as Tab)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${active ? "bg-black text-white" : "hover:bg-gray-50"}`}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* ======= TAB: DÍA ======= */}
      {tab === "dia" && (
        <>
          {/* Acciones masivas */}
          <section className="rounded-xl border bg-white p-3 flex flex-wrap items-center gap-2">
            <div className="text-sm font-medium mr-2">
              Acciones:{" "}
              <HelpTip text="“Aplicar a vacíos” asigna X minutos a filas sin duración. “Limpiar” borra las duraciones del día." />
            </div>
            <div className="flex items-center gap-2">
              <input className="w-20 rounded-md border px-2 py-1 text-sm" placeholder="min" value={bulkMin} onChange={(e) => setBulkMin(e.target.value)} inputMode="numeric" />
              <button onClick={applyDefaultDuration} disabled={saving} className={`rounded-lg px-3 py-1.5 text-xs ${saving ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"}`}>
                Aplicar a vacíos
              </button>
            </div>
            <div className="h-5 w-px bg-gray-300 mx-1" />
            <button onClick={clearDurations} disabled={saving} className="rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50">
              Limpiar minutos del día
            </button>
            <div className="ml-auto text-xs text-gray-500">
              sRPE = RPE × minutos{" "}
              <HelpTip text="La AU se recalcula al guardar. Si la duración está vacía, no hay AU." />
            </div>
          </section>

          {/* KPIs rápidos del día */}
          <section className="rounded-2xl border bg-white px-4 py-3">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="rounded-xl border p-3">
                <div className="text-[11px] uppercase text-gray-500">Respondieron hoy</div>
                <div className="mt-1 text-2xl font-bold">{kpisDay.n}</div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-[11px] uppercase text-gray-500">Con RPE</div>
                <div className="mt-1 text-2xl font-bold">
                  {kpisDay.withRpe}{" "}
                  <span className="text-sm font-semibold text-gray-500">({kpisDay.withRpePct}%)</span>
                </div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-[11px] uppercase text-gray-500">Con minutos</div>
                <div className="mt-1 text-2xl font-bold">
                  {kpisDay.withDur}{" "}
                  <span className="text-sm font-semibold text-gray-500">({kpisDay.withDurPct}%)</span>
                </div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-[11px] uppercase text-gray-500">RPE promedio</div>
                <div className="mt-1 text-2xl font-bold">{kpisDay.rpeAvg ? kpisDay.rpeAvg.toFixed(2) : "—"}</div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-[11px] uppercase text-gray-500">sRPE total (AU)</div>
                <div className="mt-1 text-2xl font-bold">{kpisDay.totalSRPE ? Math.round(kpisDay.totalSRPE) : "—"}</div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-[11px] uppercase text-gray-500">Distribución RPE (0–3 / 4–6 / 7–10)</div>
                <div className="mt-1 text-sm font-semibold">
                  {kpisDay.distRPE.low} / {kpisDay.distRPE.mid} / {kpisDay.distRPE.high}
                </div>
              </div>
            </div>
          </section>

          {/* Filtro */}
          <div className="flex items-center gap-2">
            <input className="w-full md:w-80 rounded-md border px-2 py-1.5 text-sm" placeholder="Buscar jugador…" value={q} onChange={(e) => setQ(e.target.value)} />
            <span className="text-[12px] text-gray-500">{filteredSortedDay.length} resultado(s)</span>
          </div>

          {/* Tabla Día (con faltantes y sesión) */}
          <section className="rounded-2xl border bg-white overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 text-[12px] font-semibold uppercase">Entradas</div>
            {loading ? (
              <div className="p-4 text-gray-500">Cargando…</div>
            ) : filteredSortedDay.length === 0 ? (
              <div className="p-4 text-gray-500 italic">Sin datos</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-3 py-2">Jugador</th>
                      <th className="text-left px-3 py-2">Sesión</th>
                      <th className="text-left px-3 py-2">
                        RPE <HelpTip text="Esfuerzo percibido (0–10). 0=descanso, 10=máximo." />
                      </th>
                      <th className="text-left px-3 py-2">
                        Duración (min) <HelpTip text="Minutos definidos por el CT. Editables por fila." />
                      </th>
                      <th className="text-left px-3 py-2">
                        sRPE (AU) <HelpTip text="RPE × minutos. Se actualiza al guardar cambios." />
                      </th>
                      <th className="text-right px-3 py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSortedDay.map((r) => {
                      const nm = r.userName || r.playerKey || "Jugador";
                      const inj = injuriesToday[nm] || null;
                      const faltaRpe = r.rpe == null || Number.isNaN(Number(r.rpe));
                      const faltaMin = r.duration == null || Number(r.duration) <= 0;
                      const sesion =
                        r.sessionLabel ??
                        (r.sessionIndex != null ? `Sesión ${r.sessionIndex}` : r.sessionId ?? "");
                      return (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="px-3 py-2 font-medium">
                            {nm}{" "}
                            {inj && (
                              <span className="ml-1 inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold bg-gray-100 text-gray-600 border-gray-200">
                                LESIONADO
                              </span>
                            )}
                            {(faltaRpe || faltaMin) && (
                              <span className="ml-2">
                                {faltaRpe && <Badge tone="red">Falta RPE</Badge>}{" "}
                                {faltaMin && <Badge tone="yellow">Faltan minutos</Badge>}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600">{sesion || "—"}</td>
                          <td className="px-3 py-2">{r.rpe ?? "—"}</td>
                          <td className="px-3 py-2">
                            <input
                              className="w-24 rounded-md border px-2 py-1 text-sm"
                              defaultValue={r.duration ?? ""}
                              onBlur={(e) => saveOne(r, e.currentTarget.value)}
                              placeholder="min"
                              inputMode="numeric"
                            />
                          </td>
                          <td className="px-3 py-2">
                            {(r.load ?? null) !== null ? Math.round(Number(r.load)) : "—"}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => openQuickViewFor(nm)}
                                className="rounded-lg border px-2 py-1 text-[11px] hover:bg-gray-50"
                              >
                                Ver
                              </button>
                              <button
                                onClick={() => saveOne(r, "")}
                                className="rounded-lg border px-2 py-1 text-[11px] hover:bg-gray-50"
                              >
                                Vaciar
                              </button>
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

      {/* ======= TAB: SEMANA ======= */}
      {tab === "semana" && (
        <>
          {/* Resumen semana */}
          <div className="rounded-xl border bg-white p-3 text-xs text-gray-600 flex flex-wrap gap-3">
            <div>
              <b>AU total (promedio/jugador)</b>{" "}
              <HelpTip text="Suma de AU de todos los jugadores en la semana / jugadores listados." />:{" "}
              {Math.round(summaryWeek.totalAU)} AU <span className="text-gray-400">/</span>{" "}
              {Math.round(summaryWeek.avgAU)} AU
            </div>
            <div className="ml-auto text-gray-500">
              Jugadores: <b>{summaryWeek.players}</b>
            </div>
          </div>

          {/* Filtro */}
          <div className="flex items-center gap-2">
            <input
              className="w-full md:w-80 rounded-md border px-2 py-1.5 text-sm"
              placeholder="Buscar jugador…"
              value={qWeek}
              onChange={(e)=>setQWeek(e.target.value)}
            />
            <span className="text-[12px] text-gray-500">{filteredWeek.length} resultado(s)</span>
          </div>

          {/* Tabla semana */}
          <section className="rounded-2xl border bg-white overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 text-[12px] font-semibold uppercase">
              AU por día y métricas{" "}
              <HelpTip text="AU diario por jugador (L..D) y métricas semanales de carga y riesgo." />
            </div>
            {loadingWeek ? (
              <div className="p-4 text-gray-500">Cargando…</div>
            ) : filteredWeek.length === 0 ? (
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
                    {filteredWeek.map((r) => {
                      const acwrTone = toneACWR(r.acwr);
                      const auTone = toneAU(r.totalAU);
                      return (
                        <tr key={r.userName} className="border-b last:border-0">
                          <td className="px-3 py-2 font-medium">{r.userName}</td>
                          {r.daysAU.map((v,idx)=>(
                            <td key={idx} className="px-3 py-2 text-right tabular-nums">{v || "—"}</td>
                          ))}
                          <td className="px-3 py-2 text-right"><Badge tone={auTone}>{Math.round(r.totalAU)} AU</Badge></td>
                          <td className="px-3 py-2 text-right">{Math.round(r.acute7)} AU</td>
                          <td className="px-3 py-2 text-right">{r.chronic28.toFixed(1)} AU</td>
                          <td className="px-3 py-2 text-right"><Badge tone={acwrTone}>{r.acwr==null ? "—" : r.acwr.toFixed(2)}</Badge></td>
                          <td className="px-3 py-2 text-right">{r.monotony==null ? "—" : r.monotony.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right">{r.strain==null ? "—" : Math.round(r.strain)}</td>
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
            <b>ACWR:</b> objetivo 0.8–1.3 <Badge tone="green">OK</Badge>, 1.3–1.5 <Badge tone="yellow">Atención</Badge>, &lt;0.8 o &gt;1.5 <Badge tone="red">Riesgo</Badge>.{" "}
            <HelpTip text="Usá ACWR para ajustar carga: valores extremos sugieren subir o bajar volumen/intensidad." />
            <br />
            <b>AU semanal:</b> &lt;1500 subcarga, &gt;4500 sobrecarga (ajustable).{" "}
            <HelpTip text="Umbrales de referencia para detectar semanas muy livianas o pesadas." />
          </div>
        </>
      )}

      {/* ======= TAB: REPORTES ======= */}
      {tab === "reportes" && (
        <section className="rounded-2xl border bg-white p-3">
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-semibold uppercase">
              Reportes individuales
              <HelpTip text="MVP: listado por jugador con sRPE del día. Luego link al Perfil de Jugador." />
            </div>
            <div className="text-xs text-gray-500">{rows.length} jugador(es)</div>
          </div>

          {loading ? (
            <div className="p-3 text-gray-500">Cargando…</div>
          ) : rows.length === 0 ? (
            <div className="p-3 text-gray-500 italic">Sin datos hoy</div>
          ) : (
            <ul className="mt-2 grid md:grid-cols-2 lg:grid-cols-3 gap-2">
              {rows
                .slice()
                .sort((a, b) => (a.userName || "").localeCompare(b.userName || "") || srpeOf(b) - srpeOf(a))
                .map((r) => {
                  const au = srpeOf(r);
                  const nm = r.userName || r.playerKey || "Jugador";
                  return (
                    <li key={r.id} className="rounded-lg border p-3">
                      <div className="font-medium">{nm}</div>
                      <div className="text-xs text-gray-500">
                        RPE: <b>{r.rpe ?? "—"}</b> • Min: <b>{r.duration ?? "—"}</b> • sRPE: <b>{au ? Math.round(au) : "—"} AU</b>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => openQuickViewFor(nm)} className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50">Ver</button>
                        <button disabled className="rounded-lg border px-2 py-1 text-xs text-gray-400 cursor-not-allowed" title="Próximamente">Abrir perfil</button>
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </section>
      )}

      {/* Quick View */}
      {quickPlayer && (
        <PlayerQuickViewAny
          open={quickOpen}
          onClose={() => setQuickOpen(false)}
          loading={quickLoading}
          playerName={quickPlayer}
          date={date}
          sdw7={quickSDW7}
          rpeRecent={quickRPE7}
        />
      )}
    </div>
  );
}

/* ======= Export page ======= */
export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-gray-500">Cargando…</div>}>
      <RPECTUnified />
    </Suspense>
  );
}
