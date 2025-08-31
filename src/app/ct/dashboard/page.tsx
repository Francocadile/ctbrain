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

type TurnKey = "morning" | "afternoon";
const ROWS = ["PRE ENTREN0", "FÍSICO", "TÉCNICO–TÁCTICO", "COMPENSATORIO"] as const;
const META_ROWS = ["LUGAR", "HORA", "VIDEO"] as const;

// ===== Flags creados en el editor =====
type DayFlagKind = "NONE" | "PARTIDO" | "LIBRE";
type DayFlag = { kind: DayFlagKind; rival?: string; logoUrl?: string };
const DAYFLAG_TAG = "DAYFLAG";
const dayFlagMarker = (turn: TurnKey) => `[${DAYFLAG_TAG}:${turn}]`;
const isDayFlag = (s: SessionDTO, turn: TurnKey) =>
  typeof s.description === "string" && s.description.startsWith(dayFlagMarker(turn));
function parseDayFlagTitle(title?: string | null): DayFlag {
  const t = (title || "").trim();
  if (!t) return { kind: "NONE" };
  const [kind, rival, logoUrl] = t.split("|").map(x => (x || "").trim());
  if (kind === "PARTIDO") return { kind: "PARTIDO", rival, logoUrl };
  if (kind === "LIBRE")   return { kind: "LIBRE" };
  return { kind: "NONE" };
}

// ===== Utils =====
function addDaysUTC(date: Date, days: number) { const x = new Date(date); x.setUTCDate(x.getUTCDate() + days); return x; }
function humanDayUTC(ymd: string) { const d = new Date(`${ymd}T00:00:00.000Z`); return d.toLocaleDateString(undefined,{weekday:"short",day:"2-digit",month:"2-digit",timeZone:"UTC"}); }
function cellMarker(turn: TurnKey, row: string) { return `[GRID:${turn}:${row}]`; }
function isCellOf(s: SessionDTO, turn: TurnKey, row: string) { return typeof s.description === "string" && s.description.startsWith(cellMarker(turn, row)); }
function parseVideoValue(v?: string | null) { const raw=(v||"").trim(); if(!raw) return {label:"",url:""}; const [l,u]=raw.split("|").map(s=>s.trim()); if(!u && l?.startsWith("http")) return {label:"Video",url:l}; return {label:l||"",url:u||""}; }
const stopEdit = (e: React.SyntheticEvent) => e.preventDefault();

// ===== Layout compacto =====
const COL_LABEL_W = 96;     // etiqueta filas
const DAY_MIN_W   = 120;    // ancho mínimo por día (7 entran en laptop)
const ROW_H       = 70;     // alto por fila
const GAP         = 8;

export default function DashboardSemanaPage() {
  const qs = useSearchParams();
  const hideHeader = qs.get("hideHeader") === "1";
  const initialTurn = (qs.get("turn") === "afternoon" ? "afternoon" : "morning") as TurnKey;
  const [activeTurn, setActiveTurn] = useState<TurnKey>(initialTurn);

  const [base, setBase] = useState<Date>(() => getMonday(new Date()));
  const [loading, setLoading] = useState(false);
  const [daysMap, setDaysMap] = useState<Record<string, SessionDTO[]>>({});
  const [weekStart, setWeekStart] = useState<string>("");
  const [weekEnd, setWeekEnd] = useState<string>("");

  async function loadWeek(d: Date) {
    setLoading(true);
    try {
      const monday = getMonday(d);
      const startYYYYMMDD = toYYYYMMDDUTC(monday);
      const res = await getSessionsWeek({ start: startYYYYMMDD });
      setDaysMap(res.days);
      setWeekStart(res.weekStart);
      setWeekEnd(res.weekEnd);
    } catch (e) { console.error(e); alert("No se pudo cargar la semana."); }
    finally { setLoading(false); }
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

  // ===== Meta (solo lectura) =====
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

  // ===== Tarjeta por día =====
  function DayCard({ ymd }: { ymd: string }) {
    const flag = getDayFlag(ymd, activeTurn);
    const headerHref = `/ct/sessions/by-day/${ymd}/${activeTurn}`;
    const showHeaderBtn = flag.kind !== "LIBRE"; // en Libre no hay sesión

    const NormalBody = () => (
      <div className="grid gap-[6px]" style={{ gridTemplateRows: `repeat(4, ${ROW_H}px)` }}>
        {ROWS.map((row) => {
          const s = findCell(ymd, activeTurn, row);
          const txt = (s?.title || "").trim();
          return (
            <div key={row} className="rounded-md border bg-gray-50 p-2 text-[12px] leading-5 whitespace-pre-wrap overflow-hidden">
              {txt || <span className="text-gray-400 italic">—</span>}
            </div>
          );
        })}
      </div>
    );

    const SinglePanel = (content: React.ReactNode) => (
      <div className="rounded-md border bg-gray-50 p-2 flex items-center justify-center"
           style={{ height: ROW_H * 4 + GAP * 3 }}>
        {content}
      </div>
    );

    const PartidoPanel = () => (
      <div className="flex flex-col items-center justify-center gap-2 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {flag.logoUrl ? (
          <img src={flag.logoUrl} alt="Logo rival"
               className="max-h-[140px] object-contain" />
        ) : null}
        <div className="text-[13px] font-semibold">PARTIDO</div>
        {flag.rival ? <div className="text-[12px]">vs <b>{flag.rival}</b></div> : null}
      </div>
    );

    const LibrePanel = () => (
      <div className="text-gray-700 font-semibold tracking-wide">LIBRE</div>
    );

    return (
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        {/* Header del día: solo día + “Ver sesión” si aplica */}
        <div className="flex items-center justify-between px-2.5 py-1 border-b bg-gray-50">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide">{humanDayUTC(ymd)}</div>
            <div className="text-[10px] text-gray-400">{ymd}</div>
          </div>
          {showHeaderBtn && (
            <a href={headerHref} className="text-[10px] rounded border px-2 py-0.5 hover:bg-gray-100">Ver sesión</a>
          )}
        </div>

        <div className="p-2">
          {flag.kind === "PARTIDO" && SinglePanel(<PartidoPanel />)}
          {flag.kind === "LIBRE"   && SinglePanel(<LibrePanel />)}
          {flag.kind === "NONE"    && <NormalBody />}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 space-y-3" onInput={stopEdit} onPaste={stopEdit} onDrop={stopEdit}>
      {/* Print: ocultar menú/aside/header y conservar colores; horizontal */}
      <style jsx global>{`
        @page { size: A4 landscape; margin: 10mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          nav, aside, header[role="banner"], .print\\:hidden, .sidebar, .app-sidebar { display:none !important; }
          .container, main { padding: 0 !important; }
        }
      `}</style>

      {!hideHeader && (
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between print:hidden">
          <div>
            <h1 className="text-lg md:text-xl font-bold">Dashboard — Plan semanal (solo lectura)</h1>
            <p className="text-xs md:text-sm text-gray-500">Semana {weekStart || "—"} → {weekEnd || "—"} (Lun→Dom)</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 mr-2">
              <button className={`px-2.5 py-1.5 rounded-xl border text-xs ${activeTurn==="morning"?"bg-black text-white":"hover:bg-gray-50"}`} onClick={()=>{
                const p=new URLSearchParams(qs.toString()); p.set("turn","morning"); history.replaceState(null,"",`?${p.toString()}`); setActiveTurn("morning");
              }}>Mañana</button>
              <button className={`px-2.5 py-1.5 rounded-xl border text-xs ${activeTurn==="afternoon"?"bg-black text-white":"hover:bg-gray-50"}`} onClick={()=>{
                const p=new URLSearchParams(qs.toString()); p.set("turn","afternoon"); history.replaceState(null,"",`?${p.toString()}`); setActiveTurn("afternoon");
              }}>Tarde</button>
            </div>
            <button onClick={()=>setBase((d)=>addDaysUTC(d,-7))} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">◀ Semana anterior</button>
            <button onClick={()=>setBase(getMonday(new Date()))} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">Hoy</button>
            <button onClick={()=>setBase((d)=>addDaysUTC(d,7))} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">Semana siguiente ▶</button>
            <button onClick={()=>window.print()} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">🖨️ Imprimir</button>
          </div>
        </header>
      )}

      {loading ? (
        <div className="text-gray-500">Cargando semana…</div>
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
                {/* labels */}
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

            {/* Layout: etiquetas + 7 tarjetas */}
            <div className="grid gap-3"
                 style={{ gridTemplateColumns: `${COL_LABEL_W}px repeat(7, minmax(${DAY_MIN_W}px, 1fr))` }}>
              {/* Columna etiquetas con alturas sincronizadas */}
              <div className="grid gap-[6px]" style={{ gridTemplateRows: `repeat(4, ${ROW_H}px)` }}>
                {ROWS.map((r)=>(
                  <div key={r} className="bg-gray-50/60 border rounded-md px-2 text-[10px] font-medium text-gray-600 flex items-center">
                    <span className="whitespace-pre-line">{r}</span>
                  </div>
                ))}
              </div>

              {/* Tarjetas por día */}
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
