// src/app/ct/dashboard/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSessionsWeek, getMonday, toYYYYMMDDUTC, type SessionDTO } from "@/lib/api/sessions";

/* =========================================================
   Layout (pensado para imprimir A4 landscape en una página)
========================================================= */
const COL_LABEL_W = 110;
const DAY_MIN_W = 116;
const ROW_H = 60;
const DAY_HEADER_H = 52;
const CELL_GAP = 6;

/* =========================================================
   Tipos (planner semanal)
========================================================= */
type TurnKey = "morning" | "afternoon";
const ROWS = ["PRE ENTREN0", "FÍSICO", "TÉCNICO–TÁCTICO", "COMPENSATORIO"] as const;

const SESSION_NAME_ROW = "NOMBRE SESIÓN" as const;
const META_ROWS = ["LUGAR", "HORA", "VIDEO", SESSION_NAME_ROW] as const;

/* ===== Día: tipo ===== */
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

/* ===== MICROCICLO ===== */
type MicroKey = "" | "MD+1" | "MD+2" | "MD-4" | "MD-3" | "MD-2" | "MD-1" | "MD" | "DESCANSO";
const MICRO_TAG = "MICRO";
const microMarker = (turn: TurnKey) => `[${MICRO_TAG}:${turn}]`;
const isMicrocycle = (s: SessionDTO, turn: TurnKey) =>
  typeof s.description === "string" && s.description.startsWith(microMarker(turn));
function parseMicroTitle(title?: string | null): MicroKey {
  const t = (title || "").trim();
  const all: MicroKey[] = ["", "MD+1", "MD+2", "MD-4", "MD-3", "MD-2", "MD-1", "MD", "DESCANSO"];
  return (all.includes(t as any) ? (t as MicroKey) : "") as MicroKey;
}
function microColor(v: MicroKey) {
  switch (v) {
    case "MD+1": return "bg-blue-50 text-blue-900 border-blue-200";
    case "MD+2": return "bg-yellow-50 text-yellow-900 border-yellow-200";
    case "MD-4": return "bg-red-50 text-red-900 border-red-200";
    case "MD-3": return "bg-orange-50 text-orange-900 border-orange-200";
    case "MD-2": return "bg-green-50 text-green-900 border-green-200";
    case "MD-1": return "bg-gray-50 text-gray-900 border-gray-200";
    case "MD": return "bg-amber-50 text-amber-900 border-amber-200";
    case "DESCANSO": return "bg-gray-100 text-gray-900 border-gray-200";
    default: return "bg-white text-gray-500 border-gray-200";
  }
}

/* =========================================================
   Utils
========================================================= */
function addDaysUTC(date: Date, days: number) {
  const x = new Date(date);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}
function humanDayUTC(ymd: string) {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  return d.toLocaleDateString(undefined, {
    weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC",
  });
}
function cellMarker(turn: TurnKey, row: string) {
  return `[GRID:${turn}:${row}]`;
}
function isCellOf(s: SessionDTO, turn: TurnKey, row: string) {
  return typeof s.description === "string" && s.description.startsWith(cellMarker(turn, row));
}
function parseVideoValue(v?: string | null) {
  const raw = (v || "").trim();
  if (!raw) return { label: "", url: "" };
  const [l, u] = raw.split("|").map((s) => s.trim());
  if (!u && l?.startsWith("http")) return { label: "Video", url: l };
  return { label: l || "", url: u || "" };
}

/* =========================================================
   Página
========================================================= */
function DashboardSemanaInner() {
  const qs = useSearchParams();
  const hideHeader = qs.get("hideHeader") === "1";
  const initialTurn = (qs.get("turn") === "afternoon" ? "afternoon" : "morning") as TurnKey;
  const [activeTurn, setActiveTurn] = useState<TurnKey>(initialTurn);

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
    } catch (e) {
      console.error(e);
      alert("No se pudo cargar la semana.");
    } finally {
      setLoadingWeek(false);
    }
  }
  useEffect(() => { loadWeek(base); /* eslint-disable-next-line */ }, [base]);

  const orderedDays = useMemo(() => {
    if (!weekStart) return [];
    const start = new Date(`${weekStart}T00:00:00.000Z`);
    return Array.from({ length: 7 }, (_, i) => toYYYYMMDDUTC(addDaysUTC(start, i)));
  }, [weekStart]);

  const listFor = (ymd: string) => daysMap[ymd] || [];
  const findCell = (ymd: string, turn: TurnKey, row: string) => listFor(ymd).find((s) => isCellOf(s, turn, row));
  const getDayFlag = (ymd: string, turn: TurnKey): DayFlag => {
    const f = listFor(ymd).find((s) => isDayFlag(s, turn));
    return parseDayFlagTitle(f?.title);
  };
  const getMicro = (ymd: string, turn: TurnKey): MicroKey => {
    const s = listFor(ymd).find((x) => isMicrocycle(x, turn));
    return parseMicroTitle(s?.title);
  };

  // ===== META (solo lectura) =====
  function ReadonlyMetaCell({ ymd, row }: { ymd: string; row: (typeof META_ROWS)[number] }) {
    const s = findCell(ymd, activeTurn, row);
    const text = (s?.title || "").trim();
    if (!text) return <div className="h-6 text-[11px] text-gray-400 italic px-1 flex items-center">—</div>;
    if (row === "VIDEO") {
      const { label, url } = parseVideoValue(text);
      return url ? (
        <a href={url} target="_blank" rel="noreferrer" className="h-6 text-[11px] underline text-emerald-700 px-1 flex items-center truncate">
          {label || "Video"}
        </a>
      ) : <div className="h-6 text-[11px] px-1 flex items-center truncate">{label}</div>;
    }
    return <div className="h-6 text-[11px] px-1 flex items-center truncate">{text}</div>;
  }

  // ===== Tarjeta por día (planner) =====
  function DayCard({ ymd }: { ymd: string }) {
    const flag = getDayFlag(ymd, activeTurn);
    const micro = getMicro(ymd, activeTurn);
    const headerHref = `/ct/sessions/by-day/${ymd}/${activeTurn}`;
    const librePill = activeTurn === "morning" ? "Mañana libre" : "Tarde libre";

    const microPill = micro ? (
      <span className={`text-[10px] border px-1.5 py-[2px] rounded ${microColor(micro)}`}>{micro}</span>
    ) : null;

    const NormalBody = () => (
      <div className="grid gap-[6px]" style={{ gridTemplateRows: `repeat(4, ${ROW_H}px)` }}>
        {ROWS.map((row) => {
          const s = findCell(ymd, activeTurn, row);
          const txt = (s?.title || "").trim();
          return (
            <div key={row} className="rounded-md border bg-gray-50 px-2 py-1.5 text-[12px] leading-[18px] whitespace-pre-wrap overflow-hidden">
              {txt || <span className="text-gray-400 italic">—</span>}
            </div>
          );
        })}
      </div>
    );

    const SinglePanel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <div className="rounded-md border bg-gray-50 flex items-center justify-center" style={{ height: ROW_H * 4 + CELL_GAP * 3 }}>
        <div className="p-2 text-center">{children}</div>
      </div>
    );

    const PartidoPanel = () => (
      <div className="flex flex-col items-center justify-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {flag.logoUrl ? <img src={flag.logoUrl} alt="Logo rival" className="max-h-[80px] object-contain" /> : null}
        <div className="text-[13px] font-semibold tracking-wide">PARTIDO</div>
        {flag.rival ? <div className="text-[12px]">vs <b>{flag.rival}</b></div> : null}
      </div>
    );

    const LibrePanel = () => (
      <div className="text-gray-700 font-semibold tracking-wide text-[14px]">LIBRE</div>
    );

    return (
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-2 py-1 border-b bg-gray-50" style={{ height: DAY_HEADER_H }}>
          <div className="flex items-center gap-2">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide">{humanDayUTC(ymd)}</div>
              <div className="text-[9px] leading-3 text-gray-400 whitespace-nowrap">{ymd}</div>
            </div>
            {microPill}
          </div>

          {flag.kind === "LIBRE" ? (
            <span className="text-[10px] rounded border bg-gray-100 px-2 py-0.5">{librePill}</span>
          ) : (
            <a href={headerHref} className="text-[10px] rounded border px-2 py-0.5 hover:bg-gray-100">Ver sesión</a>
          )}
        </div>

        <div className="p-2">
          {flag.kind === "PARTIDO" && <SinglePanel><PartidoPanel /></SinglePanel>}
          {flag.kind === "LIBRE" && <SinglePanel><LibrePanel /></SinglePanel>}
          {flag.kind === "NONE" && <NormalBody />}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 space-y-3" id="print-root">
      {/* PRINT: A4 landscape */}
      <style jsx global>{`
        @page { size: A4 landscape; margin: 10mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden !important; }
          #print-root, #print-root * { visibility: visible !important; }
          #print-root { position: absolute; inset: 0; margin: 0; padding: 0; }
          nav, aside, header[role="banner"], .sidebar, .app-sidebar, .print\\:hidden, .no-print { display: none !important; }
          a[href]:after { content: ""; }
        }
      `}</style>

      {!hideHeader && (
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between no-print">
          <div>
            <h2 className="text-lg md:text-xl font-bold">Dashboard — Plan semanal (solo lectura)</h2>
            <p className="text-xs md:text-sm text-gray-500">Semana {weekStart || "—"} → {weekEnd || "—"} (Lun→Dom)</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 mr-2">
              <button className={`px-2.5 py-1.5 rounded-xl border text-xs ${activeTurn === "morning" ? "bg-black text-white" : "hover:bg-gray-50"}`} onClick={() => {
                const p = new URLSearchParams(qs.toString()); p.set("turn", "morning"); history.replaceState(null, "", `?${p.toString()}`); setActiveTurn("morning");
              }}>Mañana</button>
              <button className={`px-2.5 py-1.5 rounded-xl border text-xs ${activeTurn === "afternoon" ? "bg-black text-white" : "hover:bg-gray-50"}`} onClick={() => {
                const p = new URLSearchParams(qs.toString()); p.set("turn", "afternoon"); history.replaceState(null, "", `?${p.toString()}`); setActiveTurn("afternoon");
              }}>Tarde</button>
            </div>
            <button onClick={() => setBase((d) => addDaysUTC(d, -7))} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">◀ Semana anterior</button>
            <button onClick={() => setBase(getMonday(new Date()))} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">Hoy</button>
            <button onClick={() => setBase((d) => addDaysUTC(d, 7))} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">Semana siguiente ▶</button>
            <button onClick={() => window.print()} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">🖨️ Imprimir</button>
          </div>
        </header>
      )}

      {loadingWeek ? (
        <div className="text-gray-500">Cargando…</div>
      ) : (
        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="p-3">
            {/* META compacta */}
            <div className="mb-2">
              <div className="bg-emerald-50 text-emerald-900 font-semibold px-2 py-0.5 border rounded-md uppercase tracking-wide text-[11px] inline-block">
                {activeTurn === "morning" ? "TURNO MAÑANA · Meta" : "TURNO TARDE · Meta"}
              </div>
              <div className="mt-2 grid gap-[6px]" style={{ gridTemplateColumns: `${COL_LABEL_W}px repeat(7, minmax(${DAY_MIN_W}px, 1fr))` }}>
                <div className="bg-gray-50/60 border rounded-md px-2 py-1 text-[10px] font-medium text-gray-600">LUGAR</div>
                {orderedDays.map((ymd) => (<div key={`lugar-${ymd}`} className="rounded-md border px-1 py-0.5"><ReadonlyMetaCell ymd={ymd} row="LUGAR" /></div>))}
                <div className="bg-gray-50/60 border rounded-md px-2 py-1 text-[10px] font-medium text-gray-600">HORA</div>
                {orderedDays.map((ymd) => (<div key={`hora-${ymd}`} className="rounded-md border px-1 py-0.5"><ReadonlyMetaCell ymd={ymd} row="HORA" /></div>))}
                <div className="bg-gray-50/60 border rounded-md px-2 py-1 text-[10px] font-medium text-gray-600">VIDEO</div>
                {orderedDays.map((ymd) => (<div key={`video-${ymd}`} className="rounded-md border px-1 py-0.5"><ReadonlyMetaCell ymd={ymd} row="VIDEO" /></div>))}
                <div className="bg-gray-50/60 border rounded-md px-2 py-1 text-[10px] font-medium text-gray-600">NOMBRE SESIÓN</div>
                {orderedDays.map((ymd) => (<div key={`name-${ymd}`} className="rounded-md border px-1 py-0.5"><ReadonlyMetaCell ymd={ymd} row={SESSION_NAME_ROW} /></div>))}
              </div>
            </div>

            {/* Sección turno */}
            <div className="bg-emerald-100/70 text-emerald-900 font-semibold px-2 py-0.5 border rounded-md uppercase tracking-wide text-[11px] mb-2">
              {activeTurn === "morning" ? "TURNO MAÑANA" : "TURNO TARDE"}
            </div>

            {/* Layout principal: etiquetas + 7 tarjetas */}
            <div className="grid gap-3" style={{ gridTemplateColumns: `${COL_LABEL_W}px repeat(7, minmax(${DAY_MIN_W}px, 1fr))` }}>
              {/* Columna etiquetas: header + 4 filas */}
              <div className="grid gap-[6px]" style={{ gridTemplateRows: `${DAY_HEADER_H}px repeat(4, ${ROW_H}px)` }}>
                <div />
                {ROWS.map((r) => (
                  <div key={r} className="bg-gray-50/60 border rounded-md px-2 text-[10px] font-medium text-gray-600 flex items-center">
                    <span className="leading-[14px] whitespace-pre-line">{r}</span>
                  </div>
                ))}
              </div>

              {orderedDays.map((ymd) => (<DayCard key={`card-${ymd}`} ymd={ymd} />))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardSemanaPage() {
  return (
    <Suspense fallback={<div className="p-3 text-gray-500">Cargando…</div>}>
      <DashboardSemanaInner />
    </Suspense>
  );
}
