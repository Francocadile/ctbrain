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

// ====== Flags de día ======
type DayFlagKind = "NONE" | "PARTIDO" | "LIBRE";
type DayFlag = { kind: DayFlagKind; rival?: string; logoUrl?: string };
const DAYFLAG_TAG = "DAYFLAG";                  // description: [DAYFLAG:<turn>] | YYYY-MM-DD
function dayFlagMarker(turn: TurnKey) { return `[${DAYFLAG_TAG}:${turn}]`; }
function isDayFlag(s: SessionDTO, turn: TurnKey) {
  return typeof s.description === "string" && s.description.startsWith(dayFlagMarker(turn));
}
function parseDayFlagTitle(title?: string | null): DayFlag {
  const t = (title || "").trim();
  if (!t) return { kind: "NONE" };
  const [kind, rival, logoUrl] = t.split("|").map(x => (x || "").trim());
  if (kind === "PARTIDO") return { kind: "PARTIDO", rival, logoUrl };
  if (kind === "LIBRE")   return { kind: "LIBRE" };
  return { kind: "NONE" };
}

// ====== Utils ======
function addDaysUTC(date: Date, days: number) { const x = new Date(date); x.setUTCDate(x.getUTCDate() + days); return x; }
function humanDayUTC(ymd: string) { const d = new Date(`${ymd}T00:00:00.000Z`); return d.toLocaleDateString(undefined,{weekday:"short",day:"2-digit",month:"2-digit",timeZone:"UTC"}); }
function cellMarker(turn: TurnKey, row: string) { return `[GRID:${turn}:${row}]`; }
function isCellOf(s: SessionDTO, turn: TurnKey, row: string) { return typeof s.description === "string" && s.description.startsWith(cellMarker(turn, row)); }
function parseVideoValue(v?: string | null) {
  const raw = (v || "").trim(); if (!raw) return { label: "", url: "" };
  const [label, url] = raw.split("|").map(s => s.trim());
  if (!url && label?.startsWith("http")) return { label: "Video", url: label };
  return { label: label || "", url: url || "" };
}
function stopEdit(e: React.SyntheticEvent) { e.preventDefault(); }

// ====== Página ======
export default function DashboardSemanaPage() {
  const qs = useSearchParams();
  const hideHeader = qs.get("hideHeader") === "1";
  const initialTurn = (qs.get("turn") === "afternoon" ? "afternoon" : "morning") as TurnKey;
  const [activeTurn, setActiveTurn] = useState<TurnKey>(initialTurn);

  const [base, setBase] = useState<Date>(() => getMonday(new Date()));
  const [loading, setLoading] = useState(false);
  const [daysMap, setDaysMap] = useState<Record<string, SessionDTO[]>>({});
  const [weekStart, setWeekStart] = useState<string>("");
  const [weekEnd, setWeekEnd]   = useState<string>("");

  async function loadWeek(d: Date) {
    setLoading(true);
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
      setLoading(false);
    }
  }
  useEffect(() => { loadWeek(base); /* eslint-disable-line */ }, [base]);

  const goPrevWeek  = () => setBase((d)=>addDaysUTC(d,-7));
  const goNextWeek  = () => setBase((d)=>addDaysUTC(d, 7));
  const goTodayWeek = () => setBase(getMonday(new Date()));

  const orderedDays = useMemo(() => {
    if (!weekStart) return [];
    const start = new Date(`${weekStart}T00:00:00.000Z`);
    return Array.from({ length: 7 }, (_, i) => toYYYYMMDDUTC(addDaysUTC(start, i)));
  }, [weekStart]);

  function findCell(dayYmd: string, turn: TurnKey, row: string) {
    const list = daysMap[dayYmd] || [];
    return list.find(s => isCellOf(s, turn, row));
  }
  function getDayFlag(dayYmd: string, turn: TurnKey): DayFlag {
    const list = daysMap[dayYmd] || [];
    const f = list.find(s => isDayFlag(s, turn));
    return parseDayFlagTitle(f?.title);
  }

  // ====== Meta (tabla normal) ======
  function ReadonlyMetaCell({ ymd, row }: { ymd: string; row: (typeof META_ROWS)[number] }) {
    const s = findCell(ymd, activeTurn, row);
    const text = (s?.title || "").trim();
    if (!text) return <div className="h-8 text-[12px] text-gray-400 italic px-1.5 flex items-center">—</div>;
    if (row === "VIDEO") {
      const { label, url } = parseVideoValue(text);
      return url
        ? <a href={url} target="_blank" rel="noreferrer" className="h-8 text-[12px] underline text-emerald-700 px-1.5 flex items-center truncate">{label || "Video"}</a>
        : <div className="h-8 text-[12px] px-1.5 flex items-center truncate">{label}</div>;
    }
    return <div className="h-8 text-[12px] px-1.5 flex items-center truncate">{text}</div>;
  }

  // ====== Celdas normales (contenido) ======
  function ContentCell({ ymd, row }: { ymd: string; row: string }) {
    const s = findCell(ymd, activeTurn, row);
    const text = (s?.title || "").trim();
    const href = `/ct/sessions/by-day/${ymd}/${activeTurn}?focus=${encodeURIComponent(row)}`;
    return (
      <div className="space-y-1">
        <div className="flex justify-end">
          <a href={href} className="text-[11px] rounded-lg border px-2 py-0.5 hover:bg-gray-50">Ver sesión</a>
        </div>
        <div className="min-h-[90px] w-full rounded-xl border p-2 text-[13px] leading-5 whitespace-pre-wrap bg-gray-50">
          {text || <span className="text-gray-400 italic">—</span>}
        </div>
      </div>
    );
  }

  // ====== Celda unificada (merge real con row-span) ======
  function MergedDayCell({ ymd, flag }: { ymd: string; flag: DayFlag }) {
    const href = `/ct/sessions/by-day/${ymd}/${activeTurn}?focus=${encodeURIComponent(ROWS[0])}`;
    const rowSpan = flag.kind === "LIBRE" ? 4 : 3; // LIBRE ocupa 4 filas, PARTIDO 3 (sin compensatorio)

    return (
      <div
        className="p-1"
        style={{
          gridColumn: `span 1`,
          gridRow: `1 / span ${rowSpan}`, // arranca en PRE ENTREN0
        }}
      >
        <div className="space-y-1 h-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {flag.kind === "LIBRE" && (
                <span className="text-[10px] bg-gray-100 border px-1.5 py-0.5 rounded">DÍA LIBRE</span>
              )}
              {flag.kind === "PARTIDO" && (
                <span className="text-[10px] bg-amber-100 border px-1.5 py-0.5 rounded">
                  PARTIDO {flag.rival ? `vs ${flag.rival}` : ""}
                </span>
              )}
            </div>
            <a href={href} className="text-[11px] rounded-lg border px-2 py-0.5 hover:bg-gray-50">Ver sesión</a>
          </div>

          <div className="relative h-full w-full rounded-xl border p-2 text-[13px] leading-5 bg-gray-50 flex items-center justify-center">
            {flag.kind === "LIBRE" ? (
              <span className="text-gray-600 font-semibold tracking-wide">LIBRE</span>
            ) : null}
            {flag.kind === "PARTIDO" && flag.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={flag.logoUrl} alt="Logo rival" className="absolute right-2 bottom-2 max-h-16 opacity-90" />
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 space-y-3" onInput={stopEdit} onPaste={stopEdit} onDrop={stopEdit}>
      {/* Print: ocultar menú/aside/header */}
      <style jsx global>{`
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
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          {/* Cabecera días */}
          <div className="grid text-xs" style={{ gridTemplateColumns: `120px repeat(7, minmax(120px, 1fr))` }}>
            <div className="bg-gray-50 border-b px-2 py-1.5 font-semibold text-gray-600" />
            {orderedDays.map((ymd) => (
              <div key={ymd} className="bg-gray-50 border-b px-2 py-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wide">{humanDayUTC(ymd)}</div>
                <div className="text-[10px] text-gray-400">{ymd}</div>
              </div>
            ))}
          </div>

          {/* META del turno activo */}
          <div className="border-t">
            <div className="bg-emerald-50 text-emerald-900 font-semibold px-2 py-1 border-b uppercase tracking-wide text-[12px]">
              {activeTurn === "morning" ? "TURNO MAÑANA · Meta" : "TURNO TARDE · Meta"}
            </div>
            {META_ROWS.map((rowName) => (
              <div key={`${activeTurn}-meta-${rowName}`} className="grid items-center" style={{ gridTemplateColumns: `120px repeat(7, minmax(120px, 1fr))` }}>
                <div className="bg-gray-50/60 border-r px-2 py-1.5 text-[11px] font-medium text-gray-600">{rowName}</div>
                {orderedDays.map((ymd) => (
                  <div key={`${ymd}-${activeTurn}-${rowName}`} className="p-1">
                    <ReadonlyMetaCell ymd={ymd} row={rowName} />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* BLOQUES – una sola grid para permitir row-span */}
          <div className="border-t">
            <div className="bg-emerald-100/70 text-emerald-900 font-semibold px-2 py-1 border-b uppercase tracking-wide text-[12px]">
              {activeTurn === "morning" ? "TURNO MAÑANA" : "TURNO TARDE"}
            </div>

            {/* Grid de contenido: 1 col labels + 7 días, 4 filas de contenido */}
            <div
              className="grid"
              style={{
                gridTemplateColumns: `120px repeat(7, minmax(120px, 1fr))`,
                gridTemplateRows: `repeat(4, auto)`,
              }}
            >
              {/* Labels de filas (col 1) */}
              {ROWS.map((rowName, rIdx) => (
                <div
                  key={`label-${rowName}`}
                  className="bg-gray-50/60 border-r px-2 py-2 text-[11px] font-medium text-gray-600 whitespace-pre-line"
                  style={{ gridColumn: 1, gridRow: rIdx + 1 }}
                >
                  {rowName}
                </div>
              ))}

              {/* Celdas por día */}
              {orderedDays.map((ymd, colIdx) => {
                const flag = getDayFlag(ymd, activeTurn);

                // si hay flag, pintamos bloque unificado en la fila 1 (PRE ENTREN0) y nada en las filas cubiertas
                if (flag.kind === "PARTIDO" || flag.kind === "LIBRE") {
                  return (
                    <div key={`merged-${ymd}`} style={{ gridColumn: colIdx + 2, gridRow: 1 }}>
                      <MergedDayCell ymd={ymd} flag={flag} />
                    </div>
                  );
                }

                // caso normal: 4 celdas independientes
                return (
                  <div key={`col-${ymd}`} style={{ gridColumn: colIdx + 2, gridRow: 1 }}>
                    {/* PRE */}
                    <div className="p-1">
                      <ContentCell ymd={ymd} row={ROWS[0]} />
                    </div>

                    {/* FISICO */}
                    <div className="p-1" style={{ gridRow: 2 }} />

                    {/* TECNICO */}
                    <div className="p-1" style={{ gridRow: 3 }} />

                    {/* COMPENSATORIO */}
                    <div className="p-1" style={{ gridRow: 4 }} />
                  </div>
                );
              })}

              {/* Relleno para filas 2-4 en caso normal */}
              {orderedDays.map((ymd, colIdx) => {
                const flag = getDayFlag(ymd, activeTurn);
                if (flag.kind !== "NONE") return null; // ya se pintó merged

                return (
                  <>
                    <div key={`fis-${ymd}`} className="p-1" style={{ gridColumn: colIdx + 2, gridRow: 2 }}>
                      <ContentCell ymd={ymd} row={ROWS[1]} />
                    </div>
                    <div key={`tec-${ymd}`} className="p-1" style={{ gridColumn: colIdx + 2, gridRow: 3 }}>
                      <ContentCell ymd={ymd} row={ROWS[2]} />
                    </div>
                    <div key={`comp-${ymd}`} className="p-1" style={{ gridColumn: colIdx + 2, gridRow: 4 }}>
                      <ContentCell ymd={ymd} row={ROWS[3]} />
                    </div>
                  </>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
