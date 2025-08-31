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
const CONTENT_ROWS = ["PRE ENTREN0", "FÍSICO", "TÉCNICO–TÁCTICO", "COMPENSATORIO"] as const;
const META_ROWS = ["LUGAR", "HORA", "VIDEO"] as const;

// ---- Day flags (por día y turno) ----
type DayFlagKind = "NONE" | "PARTIDO" | "LIBRE";
type DayFlag = { kind: DayFlagKind; rival?: string; logoUrl?: string; };
const DAYFLAG_TAG = "DAYFLAG"; // description: [DAYFLAG:<turn>] | YYYY-MM-DD
function dayFlagMarker(turn: TurnKey) { return `[${DAYFLAG_TAG}:${turn}]`; }
function isDayFlag(s: SessionDTO, turn: TurnKey) {
  return typeof s.description === "string" && s.description.startsWith(dayFlagMarker(turn));
}
function parseDayFlagTitle(title: string | null | undefined): DayFlag {
  const t = (title || "").trim();
  if (!t) return { kind: "NONE" };
  const [kind, rival, logoUrl] = t.split("|").map((x)=> (x||"").trim());
  if (kind === "PARTIDO") return { kind: "PARTIDO", rival: rival || "", logoUrl: logoUrl || "" };
  if (kind === "LIBRE") return { kind: "LIBRE" };
  return { kind: "NONE" };
}

function addDaysUTC(date: Date, days: number) { const x = new Date(date); x.setUTCDate(x.getUTCDate() + days); return x; }
function humanDayUTC(ymd: string) { const d = new Date(`${ymd}T00:00:00.000Z`); return d.toLocaleDateString(undefined,{weekday:"short",day:"2-digit",month:"2-digit",timeZone:"UTC"}); }
function cellMarker(turn: TurnKey, row: string) { return `[GRID:${turn}:${row}]`; }
function isCellOf(s: SessionDTO, turn: TurnKey, row: string) { return typeof s.description === "string" && s.description.startsWith(cellMarker(turn, row)); }
function parseVideoValue(v: string | null | undefined): { label: string; url: string } {
  const raw = (v || "").trim(); if (!raw) return { label: "", url: "" };
  const [label, url] = raw.split("|").map((s) => s.trim());
  if (!url && label?.startsWith("http")) return { label: "Video", url: label };
  return { label: label || "", url: url || "" };
}
function stopEdit(e: React.SyntheticEvent) { e.preventDefault(); }

export default function DashboardSemanaPage() {
  const qs = useSearchParams();
  const hideHeader = qs.get("hideHeader") === "1";

  // pestañas de turno
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
    } catch (e) {
      console.error(e);
      alert("No se pudo cargar la semana.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadWeek(base); /* eslint-disable-next-line */ }, [base]);

  const goPrevWeek = () => setBase((d) => addDaysUTC(d, -7));
  const goNextWeek = () => setBase((d) => addDaysUTC(d, 7));
  const goTodayWeek = () => setBase(getMonday(new Date()));

  const orderedDays = useMemo(() => {
    if (!weekStart) return [];
    const start = new Date(`${weekStart}T00:00:00.000Z`);
    return Array.from({ length: 7 }).map((_, i) => toYYYYMMDDUTC(addDaysUTC(start, i)));
  }, [weekStart]);

  function findCell(dayYmd: string, turn: TurnKey, row: string): SessionDTO | undefined {
    const list = daysMap[dayYmd] || [];
    return list.find((s) => isCellOf(s, turn, row));
  }
  function findDayFlagSession(dayYmd: string, turn: TurnKey): SessionDTO | undefined {
    const list = daysMap[dayYmd] || [];
    return list.find((s) => isDayFlag(s, turn));
  }
  function getDayFlag(dayYmd: string, turn: TurnKey): DayFlag {
    const s = findDayFlagSession(dayYmd, turn);
    return parseDayFlagTitle(s?.title ?? "");
  }

  /* ====== Celdas Meta ====== */
  function ReadonlyMetaCell({ dayYmd, turn, row }: { dayYmd: string; turn: TurnKey; row: (typeof META_ROWS)[number]; }) {
    const existing = findCell(dayYmd, turn, row);
    const text = (existing?.title ?? "").trim();
    if (!text) return <div className="h-8 text-[12px] text-gray-400 italic px-1.5 flex items-center" contentEditable={false} data-readonly onInput={stopEdit} onPaste={stopEdit} onDrop={stopEdit}>—</div>;

    if (row === "VIDEO") {
      const { label, url } = parseVideoValue(text);
      if (url) {
        return (
          <a href={url} target="_blank" rel="noreferrer" className="h-8 text-[12px] underline text-emerald-700 px-1.5 flex items-center truncate" title={label || "Video"}>
            {label || "Video"}
          </a>
        );
      }
      return <div className="h-8 text-[12px] px-1.5 flex items-center truncate" contentEditable={false} data-readonly onInput={stopEdit} onPaste={stopEdit} onDrop={stopEdit}>{label}</div>;
    }
    return <div className="h-8 text-[12px] px-1.5 flex items-center truncate" contentEditable={false} data-readonly onInput={stopEdit} onPaste={stopEdit} onDrop={stopEdit}>{text}</div>;
  }

  /* ====== Celdas Contenido (con flag del día) ====== */
  function ReadonlyContentCell({ dayYmd, turn, row }: { dayYmd: string; turn: TurnKey; row: string; }) {
    const existing = findCell(dayYmd, turn, row);
    const text = (existing?.title ?? "").trim();

    const sessionHref = `/ct/sessions/by-day/${dayYmd}/${turn}?focus=${encodeURIComponent(row)}`;

    // Flag del día
    const flag = getDayFlag(dayYmd, turn);
    const isLibre = flag.kind === "LIBRE";
    const isPartido = flag.kind === "PARTIDO";

    return (
      <div className={`space-y-1 ${isLibre ? "opacity-70" : ""}`}>
        <div className="flex items-center justify-between">
          {/* badge de estado */}
          <div className="flex items-center gap-1">
            {isLibre && (
              <span className="text-[10px] bg-gray-100 border px-1.5 py-0.5 rounded">DÍA LIBRE</span>
            )}
            {isPartido && (
              <span className="text-[10px] bg-amber-100 border px-1.5 py-0.5 rounded">
                PARTIDO {flag.rival ? `vs ${flag.rival}` : ""}
              </span>
            )}
          </div>

          <a href={sessionHref} className="text-[11px] rounded-lg border px-2 py-0.5 hover:bg-gray-50" title="Ver sesión">
            Ver sesión
          </a>
        </div>

        <div
          className="relative min-h-[90px] w-full rounded-xl border p-2 text-[13px] leading-5 whitespace-pre-wrap bg-gray-50"
          title={text || ""}
          contentEditable={false}
          data-readonly
          onInput={stopEdit}
          onPaste={stopEdit}
          onDrop={stopEdit}
        >
          {isPartido && flag.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={flag.logoUrl}
              alt="Logo rival"
              className="absolute right-2 bottom-2 max-h-10 opacity-90"
            />
          ) : null}
          {text ? text : <span className="text-gray-400 italic">—</span>}
        </div>
      </div>
    );
  }

  /* ========= Render ========= */
  return (
    <div className="p-3 md:p-4 space-y-3" onInput={stopEdit} onPaste={stopEdit} onDrop={stopEdit}>
      {/* Estilos de impresión: ocultar menú/aside/header y dejar solo el contenido */}
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
            <h1 className="text-lg md:text-xl font-bold" contentEditable={false} data-readonly>Dashboard — Plan semanal (solo lectura)</h1>
            <p className="text-xs md:text-sm text-gray-500" contentEditable={false} data-readonly>Semana {weekStart || "—"} → {weekEnd || "—"} (Lun→Dom)</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 mr-2">
              <button className={`px-2.5 py-1.5 rounded-xl border text-xs ${activeTurn === "morning" ? "bg-black text-white" : "hover:bg-gray-50"}`} onClick={()=>{const p=new URLSearchParams(qs.toString()); p.set("turn","morning"); history.replaceState(null,"",`?${p.toString()}`); setActiveTurn("morning");}}>Mañana</button>
              <button className={`px-2.5 py-1.5 rounded-xl border text-xs ${activeTurn === "afternoon" ? "bg-black text-white" : "hover:bg-gray-50"}`} onClick={()=>{const p=new URLSearchParams(qs.toString()); p.set("turn","afternoon"); history.replaceState(null,"",`?${p.toString()}`); setActiveTurn("afternoon");}}>Tarde</button>
            </div>
            <button onClick={goPrevWeek} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">◀ Semana anterior</button>
            <button onClick={goTodayWeek} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">Hoy</button>
            <button onClick={goNextWeek} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">Semana siguiente ▶</button>
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
            <div className="bg-gray-50 border-b px-2 py-1.5 font-semibold text-gray-600" contentEditable={false} />
            {orderedDays.map((ymd) => (
              <div key={ymd} className="bg-gray-50 border-b px-2 py-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wide" contentEditable={false} data-readonly>{humanDayUTC(ymd)}</div>
                <div className="text-[10px] text-gray-400" contentEditable={false} data-readonly>{ymd}</div>
              </div>
            ))}
          </div>

          {/* META del turno activo */}
          <div className="border-t">
            <div className="bg-emerald-50 text-emerald-900 font-semibold px-2 py-1 border-b uppercase tracking-wide text-[12px]" contentEditable={false} data-readonly>
              {activeTurn === "morning" ? "TURNO MAÑANA · Meta" : "TURNO TARDE · Meta"}
            </div>
            {META_ROWS.map((rowName) => (
              <div key={`${activeTurn}-meta-${rowName}`} className="grid items-center" style={{ gridTemplateColumns: `120px repeat(7, minmax(120px, 1fr))` }}>
                <div className="bg-gray-50/60 border-r px-2 py-1.5 text-[11px] font-medium text-gray-600" contentEditable={false} data-readonly>{rowName}</div>
                {orderedDays.map((ymd) => (
                  <div key={`${ymd}-${activeTurn}-${rowName}`} className="p-1">
                    <ReadonlyMetaCell dayYmd={ymd} turn={activeTurn} row={rowName} />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* BLOQUES del turno activo */}
          <div className="border-t">
            <div className="bg-emerald-100/70 text-emerald-900 font-semibold px-2 py-1 border-b uppercase tracking-wide text-[12px]" contentEditable={false} data-readonly>
              {activeTurn === "morning" ? "TURNO MAÑANA" : "TURNO TARDE"}
            </div>
            {CONTENT_ROWS.map((rowName) => (
              <div key={`${activeTurn}-${rowName}`} className="grid items-stretch" style={{ gridTemplateColumns: `120px repeat(7, minmax(120px, 1fr))` }}>
                <div className="bg-gray-50/60 border-r px-2 py-2 text-[11px] font-medium text-gray-600" contentEditable={false} data-readonly>{rowName}</div>
                {orderedDays.map((ymd) => (
                  <div key={`${ymd}-${activeTurn}-${rowName}`} className="p-1">
                    <ReadonlyContentCell dayYmd={ymd} turn={activeTurn} row={rowName} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

