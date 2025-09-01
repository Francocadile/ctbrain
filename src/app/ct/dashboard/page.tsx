// src/app/ct/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getSessionsWeek,
  getMonday,
  toYYYYMMDDUTC,
  type SessionDTO,
} from "@/lib/api/sessions";

/* =========================================================
   Tipos (KPIs Wellness/RPE)
========================================================= */
type WellnessRaw = {
  id: string;
  user?: { name?: string; email?: string };
  userName?: string | null;
  playerKey?: string | null;
  date: string;                 // YYYY-MM-DD
  sleepQuality: number;         // 1..5
  sleepHours?: number | null;   // 0..14
  fatigue: number;              // 1..5
  muscleSoreness: number;       // 1..5
  stress: number;               // 1..5
  mood: number;                 // 1..5
  comment?: string | null;
};

type DayRow = WellnessRaw & {
  _userName: string;
  _sdw: number;                 // 1..5
  _z: number | null;
  _color: "green" | "yellow" | "red";
};

type Baseline = { mean: number; sd: number; n: number };

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
};

/* =========================================================
   Tipos (tu planner semanal)
========================================================= */
type TurnKey = "morning" | "afternoon";
const ROWS = ["PRE ENTREN0", "FÍSICO", "TÉCNICO–TÁCTICO", "COMPENSATORIO"] as const;
const META_ROWS = ["LUGAR", "HORA", "VIDEO"] as const;

// ===== Flags (creados en el editor semanal) =====
type DayFlagKind = "NONE" | "PARTIDO" | "LIBRE";
type DayFlag = { kind: DayFlagKind; rival?: string; logoUrl?: string };
const DAYFLAG_TAG = "DAYFLAG";
const dayFlagMarker = (turn: TurnKey) => `[${DAYFLAG_TAG}:${turn}]`;
const isDayFlag = (s: SessionDTO, turn: TurnKey) =>
  typeof s.description === "string" && s.description.startsWith(dayFlagMarker(turn));
function parseDayFlagTitle(title?: string | null): DayFlag {
  const t = (title || "").trim();
  if (!t) return { kind: "NONE" };
  const [kind, rival, logoUrl] = t.split("|").map((x) => (x || "").trim());
  if (kind === "PARTIDO") return { kind: "PARTIDO", rival, logoUrl };
  if (kind === "LIBRE") return { kind: "LIBRE" };
  return { kind: "NONE" };
}

/* =========================================================
   Utils fecha / texto
========================================================= */
function addDaysUTC(date: Date, days: number) { const x = new Date(date); x.setUTCDate(x.getUTCDate() + days); return x; }
function humanDayUTC(ymd: string) { const d = new Date(`${ymd}T00:00:00.000Z`); return d.toLocaleDateString(undefined,{weekday:"short",day:"2-digit",month:"2-digit",timeZone:"UTC"}); }
function cellMarker(turn: TurnKey, row: string) { return `[GRID:${turn}:${row}]`; }
function isCellOf(s: SessionDTO, turn: TurnKey, row: string) { return typeof s.description === "string" && s.description.startsWith(cellMarker(turn, row)); }
function parseVideoValue(v?: string | null) { const raw=(v||"").trim(); if(!raw) return {label:"",url:""}; const [l,u]=raw.split("|").map(s=>s.trim()); if(!u && l?.startsWith("http")) return {label:"Video",url:l}; return {label:l||"",url:u||""}; }
function todayYMDLocal() { return new Date().toISOString().slice(0,10); }
function fromYMD(s: string) { const [y,m,dd] = s.split("-").map(Number); return new Date(y, m-1, dd); }
function addDays(d: Date, days: number) { const x = new Date(d); x.setDate(x.getDate() + days); return x; }
function toYYYYMMDDLocal(d: Date) { return d.toISOString().slice(0,10); }
function yesterdayYMD(ymd: string) { return toYYYYMMDDLocal(addDays(fromYMD(ymd), -1)); }

/* =========================================================
   Stats helpers
========================================================= */
function mean(arr: number[]) { return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }
function sdSample(arr: number[]) {
  const n = arr.length; if (n < 2) return 0;
  const m = mean(arr);
  const v = arr.reduce((acc,v)=>acc+(v-m)*(v-m),0)/(n-1);
  return Math.sqrt(v);
}

/* =========================================================
   Business (KPIs Wellness/RPE)
========================================================= */
function resolveName(x: {userName?:string|null; playerKey?:string|null; user?:{name?:string; email?:string}}) {
  return x.userName || x.playerKey || x.user?.name || x.user?.email || "Jugador";
}
function computeSDW(r: WellnessRaw) {
  const vals = [
    Number(r.sleepQuality ?? 0),
    Number(r.fatigue ?? 0),
    Number(r.muscleSoreness ?? 0),
    Number(r.stress ?? 0),
    Number(r.mood ?? 0),
  ].filter(v => v > 0);
  return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
}
function zToColor(z: number | null): "green"|"yellow"|"red" {
  if (z === null) return "yellow";
  if (z >= -0.5) return "green";
  if (z >= -1.0) return "yellow";
  return "red";
}
function applyOverrides(base: "green"|"yellow"|"red", r: WellnessRaw) {
  let level = base;
  const sh = r.sleepHours ?? null;
  if (sh !== null && sh < 4) { level = level === "green" ? "yellow" : level; }
  if (r.muscleSoreness <= 2) { level = "red"; }
  if (r.stress <= 2) { level = level === "green" ? "yellow" : level; }
  return level;
}
function resolveAU(r: RPERaw): number {
  const au = (r.load ?? r.srpe ?? (Number(r.rpe ?? 0) * Number(r.duration ?? 0))) ?? 0;
  const n = Number(au);
  return n > 0 && isFinite(n) ? Math.round(n) : 0;
}

/* =========================================================
   Layout (planner semanal)
========================================================= */
const COL_LABEL_W   = 110; // ancho columna izquierda
const DAY_MIN_W     = 116; // ancho mín por día (caben 7 en 1366px)
const ROW_H         = 64;  // alto de cada fila
const DAY_HEADER_H  = 52;  // altura fija encabezado de día
const CELL_GAP      = 6;

export default function DashboardSemanaPage() {
  const qs = useSearchParams();
  const hideHeader = qs.get("hideHeader") === "1";
  const initialTurn = (qs.get("turn") === "afternoon" ? "afternoon" : "morning") as TurnKey;
  const [activeTurn, setActiveTurn] = useState<TurnKey>(initialTurn);

  // ====== Estado Planner semanal ======
  const [base, setBase] = useState<Date>(() => getMonday(new Date()));
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [daysMap, setDaysMap] = useState<Record<string, SessionDTO[]>>({});
  const [weekStart, setWeekStart] = useState<string>("");
  const [weekEnd, setWeekEnd] = useState<string>("");

  async function loadWeek(d: Date) {
    setLoadingWeek(true);
    try {
      const monday = getMonday(d);
      const startYYYYMMDD = toYYYYMMDDUTC(monday);
      const res = await getSessionsWeek({ start: startYYYYMMDD });
      setDaysMap(res.days);
      setWeekStart(res.weekStart);
      setWeekEnd(res.weekEnd);
    } catch (e) { console.error(e); alert("No se pudo cargar la semana."); }
    finally { setLoadingWeek(false); }
  }
  useEffect(() => { loadWeek(base); /* eslint-disable-line */ }, [base]);

  const orderedDays = useMemo(() => {
    if (!weekStart) return [];
    const start = new Date(`${weekStart}T00:00:00.000Z`);
    return Array.from({ length: 7 }, (_, i) => toYYYYMMDDUTC(addDaysUTC(start, i)));
  }, [weekStart]);

  function findCell(ymd: string, turn: TurnKey, row: string) {
    const list = daysMap[ymd] || [];
    return list.find(s => isCellOf(s, turn, row));
  }
  function getDayFlag(ymd: string, turn: TurnKey): DayFlag {
    const list = daysMap[ymd] || [];
    const f = list.find(s => isDayFlag(s, turn));
    return parseDayFlagTitle(f?.title);
  }

  // ===== META (solo lectura) =====
  function ReadonlyMetaCell({ ymd, row }: { ymd: string; row: (typeof META_ROWS)[number] }) {
    const s = findCell(ymd, activeTurn, row);
    const text = (s?.title || "").trim();
    if (!text) return <div className="h-6 text-[11px] text-gray-400 italic px-1 flex items-center">—</div>;
    if (row === "VIDEO") {
      const { label, url } = parseVideoValue(text);
      return url
        ? <a href={url} target="_blank" rel="noreferrer" className="h-6 text-[11px] underline text-emerald-700 px-1 flex items-center truncate">{label || "Video"}</a>
        : <div className="h-6 text-[11px] px-1 flex items-center truncate">{label}</div>;
    }
    return <div className="h-6 text-[11px] px-1 flex items-center truncate">{text}</div>;
  }

  // ===== Tarjeta por día (planner) =====
  function DayCard({ ymd }: { ymd: string }) {
    const flag = getDayFlag(ymd, activeTurn);
    const headerHref = `/ct/sessions/by-day/${ymd}/${activeTurn}`;
    const librePill = activeTurn === "morning" ? "Mañana libre" : "Tarde libre";

    const NormalBody = () => (
      <div className="grid gap-[6px]" style={{ gridTemplateRows: `repeat(4, ${ROW_H}px)` }}>
        {ROWS.map((row) => {
          const s = findCell(ymd, activeTurn, row);
          const txt = (s?.title || "").trim();
          return (
            <div key={row}
                 className="rounded-md border bg-gray-50 px-2 py-1.5 text-[12px] leading-[18px] whitespace-pre-wrap overflow-hidden">
              {txt || <span className="text-gray-400 italic">—</span>}
            </div>
          );
        })}
      </div>
    );

    const SinglePanel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <div className="rounded-md border bg-gray-50 flex items-center justify-center"
           style={{ height: ROW_H * 4 + CELL_GAP * 3 }}>
        <div className="p-2 text-center">{children}</div>
      </div>
    );

    const PartidoPanel = () => (
      <div className="flex flex-col items-center justify-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {flag.logoUrl ? (
          <img src={flag.logoUrl} alt="Logo rival" className="max-h-[120px] object-contain" />
        ) : null}
        <div className="text-[13px] font-semibold tracking-wide">PARTIDO</div>
        {flag.rival ? <div className="text-[12px]">vs <b>{flag.rival}</b></div> : null}
      </div>
    );

    const LibrePanel = () => (<div className="text-gray-700 font-semibold tracking-wide text-[14px]">LIBRE</div>);

    return (
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-2 py-1 border-b bg-gray-50"
             style={{ height: DAY_HEADER_H }}>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide">{humanDayUTC(ymd)}</div>
            <div className="text-[9px] leading-3 text-gray-400 whitespace-nowrap">{ymd}</div>
          </div>

          {flag.kind === "LIBRE" ? (
            <span className="text-[10px] rounded border bg-gray-100 px-2 py-0.5">{librePill}</span>
          ) : (
            <a href={headerHref} className="text-[10px] rounded border px-2 py-0.5 hover:bg-gray-100">Ver sesión</a>
          )}
        </div>

        <div className="p-2">
          {flag.kind === "PARTIDO" && <SinglePanel><PartidoPanel /></SinglePanel>}
          {flag.kind === "LIBRE"   && <SinglePanel><LibrePanel /></SinglePanel>}
          {flag.kind === "NONE"    && <NormalBody />}
        </div>
      </div>
    );
  }

  /* =========================================================
     Estado + lógica KPIs (Wellness/RPE)
  ========================================================= */
  const [kpiDate, setKpiDate] = useState<string>(todayYMDLocal());
  const [loadingKpis, setLoadingKpis] = useState<boolean>(true);

  const [rows, setRows] = useState<DayRow[]>([]);
  const [activeRoster, setActiveRoster] = useState<number>(0);
  const [srpeTodayTotal, setSrpeTodayTotal] = useState<number>(0);
  const [srpeYesterdayTotal, setSrpeYesterdayTotal] = useState<number>(0);

  // ===== Fetchers BATCH (rangos) =====
  async function getWellnessRange(start: string, end: string) {
    const res = await fetch(`/api/metrics/wellness/range?start=${start}&end=${end}`, { cache: "no-store" });
    if (!res.ok) return { items: [] as any[] };
    return res.json() as Promise<{ start:string; end:string; count:number; items:any[] }>;
  }
  async function getRPERange(start: string, end: string) {
    const res = await fetch(`/api/metrics/rpe/range?start=${start}&end=${end}`, { cache: "no-store" });
    if (!res.ok) return { items: [] as any[] };
    return res.json() as Promise<{ start:string; end:string; count:number; items:any[] }>;
  }

  async function loadKpis() {
    setLoadingKpis(true);

    const start21 = toYYYYMMDDLocal(addDays(fromYMD(kpiDate), -21));
    const start14 = toYYYYMMDDLocal(addDays(fromYMD(kpiDate), -14));
    const yday = yesterdayYMD(kpiDate);

    // 1) Wellness: 21 días (incluye hoy para separar baseline vs hoy)
    const wRange = await getWellnessRange(start21, kpiDate);
    const wItems = wRange.items || [];

    // split: hoy vs prev (para baseline 21d)
    const todayRows = (wItems as WellnessRaw[])
      .filter((r) => r.date === kpiDate)
      .map((r) => ({ ...r, _userName: resolveName(r), _sdw: computeSDW(r) } as DayRow));

    const prevRows = (wItems as WellnessRaw[]).filter((r) => r.date !== kpiDate);

    // baseline por jugador (21d prev)
    const sdwMap: Record<string, number[]> = {};
    const active14Set = new Set<string>();

    for (const it of prevRows) {
      const nm = resolveName(it);
      const sdw = computeSDW(it);
      if (sdw > 0) {
        if (!sdwMap[nm]) sdwMap[nm] = [];
        sdwMap[nm].push(sdw);
      }
      // activos últimos 14d
      if (it.date >= start14) active14Set.add(nm);
    }
    // incluir a los que respondieron hoy
    for (const it of todayRows) active14Set.add(it._userName);

    const baselines: Record<string, Baseline> = {};
    for (const [nm, arr] of Object.entries(sdwMap)) {
      baselines[nm] = { mean: mean(arr), sd: sdSample(arr), n: arr.length };
    }

    const enriched = todayRows.map((r) => {
      const base = baselines[r._userName];
      const z = base && base.n >= 7 && base.sd > 0 ? (r._sdw - base.mean) / base.sd : null;
      const baseColor = zToColor(z);
      const color = applyOverrides(baseColor, r);
      return { ...r, _z: z, _color: color } as DayRow;
    });

    // 2) RPE: ayer + hoy en una sola llamada
    const rpeRange = await getRPERange(yday, kpiDate);
    const rpeItems = (rpeRange.items || []) as RPERaw[];

    let todayAU = 0, ydayAU = 0;
    for (const r of rpeItems) {
      const au = (r.load ?? r.srpe ?? (Number(r.rpe ?? 0) * Number(r.duration ?? 0))) ?? 0;
      const auInt = Math.max(0, Math.round(Number(au)));
      if (r.date === kpiDate) todayAU += auInt;
      else if (r.date === yday) ydayAU += auInt;
    }

    setRows(enriched);
    setActiveRoster(active14Set.size);
    setSrpeTodayTotal(todayAU);
    setSrpeYesterdayTotal(ydayAU);
    setLoadingKpis(false);
  }

  useEffect(() => { loadKpis(); /* eslint-disable-line */ }, [kpiDate]);

  // KPIs calculados
  const kpis = useMemo(() => {
    const nToday = rows.length;
    const avgSDW = nToday ? mean(rows.map(r=>r._sdw)) : 0;
    const reds = rows.filter(r=>r._color==="red").length;
    const yellows = rows.filter(r=>r._color==="yellow").length;
    const compliance = activeRoster ? (nToday/activeRoster) : 0;
    return { nToday, avgSDW, reds, yellows, compliance };
  }, [rows, activeRoster]);

  /* =========================================================
     Render (KPIs + Planner)
  ========================================================= */

  // estilos de badge
  function badgeClass(t: "green"|"yellow"|"red"|"gray") {
    const map: Record<string,string> = {
      green:  "bg-emerald-50 text-emerald-700 border-emerald-200",
      yellow: "bg-amber-50 text-amber-700 border-amber-200",
      red:    "bg-red-50 text-red-700 border-red-200",
      gray:   "bg-gray-100 text-gray-700 border-gray-200",
    };
    return map[t];
  }
  function Badge({children, tone}:{children:any; tone:"green"|"yellow"|"red"|"gray"}) {
    return <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${badgeClass(tone)}`}>{children}</span>;
  }

  return (
    <div className="p-3 md:p-4 space-y-3" id="print-root">
      {/* PRINT: sólo el contenido del dashboard */}
      <style jsx global>{`
        @page { size: A4 landscape; margin: 10mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden !important; }
          #print-root, #print-root * { visibility: visible !important; }
          #print-root { position: absolute; inset: 0; margin: 0; padding: 0; }
          nav, aside, header[role="banner"], .sidebar, .app-sidebar, .print\\:hidden, .no-print {
            display: none !important;
          }
          a[href]:after { content: ""; }
        }
      `}</style>

      {/* ======== Header superior (KPIs del día) ======== */}
      {!hideHeader && (
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between no-print">
          <div>
            <h1 className="text-lg md:text-xl font-bold">Dashboard CT — KPIs del día</h1>
            <p className="text-xs md:text-sm text-gray-500">Wellness (baseline 21 días) + sRPE hoy/ayer</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="rounded-md border px-2 py-1.5 text-sm"
              value={kpiDate}
              onChange={(e)=> setKpiDate(e.target.value)}
            />
          </div>
        </header>
      )}

      {/* KPIs cards */}
      <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs text-gray-500">Cumplimiento (hoy / activos 14d)</div>
          <div className="text-2xl font-bold mt-1">{Math.round((kpis.compliance*100) || 0)}%</div>
          <div className="text-xs text-gray-500">{kpis.nToday} / {activeRoster}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs text-gray-500">Promedio SDW (1–5)</div>
          <div className="text-2xl font-bold mt-1">{kpis.nToday ? kpis.avgSDW.toFixed(2) : "—"}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs text-gray-500">Alertas hoy</div>
          <div className="text-lg font-semibold mt-1 flex items-center gap-2">
            <Badge tone="red">{kpis.reds}</Badge>
            <Badge tone="yellow">{kpis.yellows}</Badge>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs text-gray-500">sRPE total</div>
          <div className="text-2xl font-bold mt-1">{Math.round(srpeTodayTotal)} AU</div>
          <div className="text-xs text-gray-500">Ayer: {Math.round(srpeYesterdayTotal)} AU</div>
        </div>
      </section>

      {/* ======== Tu Dashboard de Plan Semanal (sin cambios visuales) ======== */}
      {!hideHeader && (
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between no-print">
          <div>
            <h2 className="text-lg md:text-xl font-bold">Dashboard — Plan semanal (solo lectura)</h2>
            <p className="text-xs md:text-sm text-gray-500">Semana {weekStart || "—"} → {weekEnd || "—"} (Lun→Dom)</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 mr-2">
              <button
                className={`px-2.5 py-1.5 rounded-xl border text-xs ${activeTurn==="morning"?"bg-black text-white":"hover:bg-gray-50"}`}
                onClick={()=>{
                  const p=new URLSearchParams(qs.toString()); p.set("turn","morning"); history.replaceState(null,"",`?${p.toString()}`); setActiveTurn("morning");
                }}
              >Mañana</button>
              <button
                className={`px-2.5 py-1.5 rounded-xl border text-xs ${activeTurn==="afternoon"?"bg-black text-white":"hover:bg-gray-50"}`}
                onClick={()=>{
                  const p=new URLSearchParams(qs.toString()); p.set("turn","afternoon"); history.replaceState(null,"",`?${p.toString()}`); setActiveTurn("afternoon");
                }}
              >Tarde</button>
            </div>
            <button onClick={()=>setBase((d)=>addDaysUTC(d,-7))} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">◀ Semana anterior</button>
            <button onClick={()=>setBase(getMonday(new Date()))} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">Hoy</button>
            <button onClick={()=>setBase((d)=>addDaysUTC(d,7))} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">Semana siguiente ▶</button>
            <button onClick={()=>window.print()} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">🖨️ Imprimir</button>
          </div>
        </header>
      )}

      {loadingWeek || loadingKpis ? (
        <div className="text-gray-500">Cargando…</div>
      ) : (
        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="p-3">
            {/* META compacta */}
            <div className="mb-2">
              <div className="bg-emerald-50 text-emerald-900 font-semibold px-2 py-0.5 border rounded-md uppercase tracking-wide text-[11px] inline-block">
                {activeTurn === "morning" ? "TURNO MAÑANA · Meta" : "TURNO TARDE · Meta"}
              </div>
              <div className="mt-2 grid gap-[6px]"
                   style={{ gridTemplateColumns: `${COL_LABEL_W}px repeat(7, minmax(${DAY_MIN_W}px, 1fr))` }}>
                <div className="bg-gray-50/60 border rounded-md px-2 py-1 text-[10px] font-medium text-gray-600">LUGAR</div>
                {orderedDays.map((ymd)=>(
                  <div key={`lugar-${ymd}`} className="rounded-md border px-1 py-0.5"><ReadonlyMetaCell ymd={ymd} row="LUGAR" /></div>
                ))}
                <div className="bg-gray-50/60 border rounded-md px-2 py-1 text-[10px] font-medium text-gray-600">HORA</div>
                {orderedDays.map((ymd)=>(
                  <div key={`hora-${ymd}`} className="rounded-md border px-1 py-0.5"><ReadonlyMetaCell ymd={ymd} row="HORA" /></div>
                ))}
                <div className="bg-gray-50/60 border rounded-md px-2 py-1 text-[10px] font-medium text-gray-600">VIDEO</div>
                {orderedDays.map((ymd)=>(
                  <div key={`video-${ymd}`} className="rounded-md border px-1 py-0.5"><ReadonlyMetaCell ymd={ymd} row="VIDEO" /></div>
                ))}
              </div>
            </div>

            {/* Sección turno */}
            <div className="bg-emerald-100/70 text-emerald-900 font-semibold px-2 py-0.5 border rounded-md uppercase tracking-wide text-[11px] mb-2">
              {activeTurn === "morning" ? "TURNO MAÑANA" : "TURNO TARDE"}
            </div>

            {/* Layout principal: etiquetas + 7 tarjetas */}
            <div className="grid gap-3"
                 style={{ gridTemplateColumns: `${COL_LABEL_W}px repeat(7, minmax(${DAY_MIN_W}px, 1fr))` }}>
              {/* Columna etiquetas: espaciador header + 4 filas */}
              <div className="grid gap-[6px]" style={{ gridTemplateRows: `${DAY_HEADER_H}px repeat(4, ${ROW_H}px)` }}>
                <div />
                {ROWS.map((r)=>(
                  <div key={r} className="bg-gray-50/60 border rounded-md px-2 text-[10px] font-medium text-gray-600 flex items-center">
                    <span className="leading-[14px] whitespace-pre-line">{r}</span>
                  </div>
                ))}
              </div>

              {orderedDays.map((ymd)=>(
                <DayCard key={`card-${ymd}`} ymd={ymd} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
