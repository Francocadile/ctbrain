// src/app/ct/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getSessionsWeek,
  getMonday,
  toYYYYMMDDUTC,
  type SessionDTO,
} from "@/lib/api/sessions";

type TurnKey = "morning" | "afternoon";
const CONTENT_ROWS = ["PRE ENTREN0", "FÍSICO", "TÉCNICO–TÁCTICO", "COMPENSATORIO"] as const;
const META_ROWS = ["LUGAR", "HORA", "VIDEO"] as const;

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
  const router = useRouter();
  const hideHeader = qs.get("hideHeader") === "1";
  const initialTurn = (qs.get("turn") === "afternoon" ? "afternoon" : "morning") as TurnKey;
  const [activeTurn, setActiveTurn] = useState<TurnKey>(initialTurn);

  const [base, setBase] = useState<Date>(() => getMonday(new Date()));
  const [loading, setLoading] = useState(false);
  const [daysMap, setDaysMap] = useState<Record<string, SessionDTO[]>>({});
  const [weekStart, setWeekStart] = useState<string>("");
  const [weekEnd, setWeekEnd] = useState<string>("");

  // Imprimir solo la grilla, en horizontal
  const printCSS = `
    @media print {
      @page { size: A4 landscape; margin: 8mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body * { visibility: hidden !important; }
      .print-root, .print-root * { visibility: visible !important; }
      .print-root { position: absolute; inset: 0; margin: 0; box-shadow: none !important; border: 0 !important; border-radius: 0 !important; }
      .no-print { display: none !important; }
    }
  `;

  useEffect(() => {
    const p = new URLSearchParams(qs.toString());
    p.set("turn", activeTurn);
    router.replace(`?${p.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTurn]);

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

  function ReadonlyContentCell({ dayYmd, turn, row }: { dayYmd: string; turn: TurnKey; row: string; }) {
    const existing = findCell(dayYmd, turn, row);
    const text = (existing?.title ?? "").trim();

    return (
      <div className="min-h[90px] min-h-[90px] w-full rounded-xl border p-2 text-[13px] leading-5 whitespace-pre-wrap bg-gray-50" title={text || ""} contentEditable={false} data-readonly onInput={stopEdit} onPaste={stopEdit} onDrop={stopEdit}>
        {text ? text : <span className="text-gray-400 italic">—</span>}
      </div>
    );
  }

  function TurnSection({ turn }: { turn: TurnKey }) {
    const turnLabel = turn === "morning" ? "MAÑANA" : "TARDE";
    return (
      <>
        {/* Acceso rápido */}
        <div className="border-t">
          <div className="bg-emerald-50 text-emerald-900 font-semibold px-2 py-1 border-b uppercase tracking-wide text-[12px]">
            ACCESO RÁPIDO A SESIÓN — {turnLabel}
          </div>
          <div className="grid items-center" style={{ gridTemplateColumns: `100px repeat(7, minmax(120px, 1fr))` }}>
            <div className="bg-gray-50/60 border-r px-2 py-1.5 text-[11px] font-medium text-gray-600">Sesión</div>
            {orderedDays.map((ymd) => (
              <div key={`quick-${turn}-${ymd}`} className="p-1">
                <a
                  href={`/ct/sessions/by-day/${ymd}/${turn}`}
                  className="h-8 inline-flex items-center justify-center w-full rounded-lg border text-[11px] hover:bg-gray-50"
                >
                  Ver sesión
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Meta */}
        <div className="border-t">
          <div className="bg-emerald-50 text-emerald-900 font-semibold px-2 py-1 border-b uppercase tracking-wide text-[12px]">
            TURNO {turnLabel} · Meta
          </div>
          {META_ROWS.map((rowName) => (
            <div key={`${turn}-meta-${rowName}`} className="grid items-center" style={{ gridTemplateColumns: `100px repeat(7, minmax(120px, 1fr))` }}>
              <div className="bg-gray-50/60 border-r px-2 py-1.5 text-[10px] font-medium text-gray-600 truncate" title={rowName} contentEditable={false} data-readonly>{rowName}</div>
              {orderedDays.map((ymd) => (
                <div key={`${ymd}-${turn}-${rowName}`} className="p-1">
                  <ReadonlyMetaCell dayYmd={ymd} turn={turn} row={rowName} />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Bloques (incluye COMPENSATORIO) */}
        <div className="border-t">
          <div className="bg-emerald-100/70 text-emerald-900 font-semibold px-2 py-1 border-b uppercase tracking-wide text-[12px]">
            TURNO {turnLabel}
          </div>
          {CONTENT_ROWS.map((rowName) => (
            <div
              key={`${turn}-${rowName}`}
              className="grid items-stretch"
              style={{ gridTemplateColumns: `100px repeat(7, minmax(120px, 1fr))` }}
            >
              {/* ⬇️ label compacto, no se mete en la celda */}
              <div
                className="bg-gray-50/60 border-r px-2 py-2 text-[10px] font-medium text-gray-600 truncate"
                title={rowName}
                contentEditable={false}
                data-readonly
              >
                {rowName}
              </div>
              {orderedDays.map((ymd) => (
                <div key={`${ymd}-${turn}-${rowName}`} className="p-1">
                  <ReadonlyContentCell dayYmd={ymd} turn={turn} row={rowName} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="p-3 md:p-4 space-y-3" onInput={stopEdit} onPaste={stopEdit} onDrop={stopEdit}>
      <style jsx global>{printCSS}</style>

      {!hideHeader && (
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between no-print">
          <div>
            <h1 className="text-lg md:text-xl font-bold" contentEditable={false} data-readonly>Dashboard — Plan semanal (solo lectura)</h1>
            <p className="text-xs md:text-sm text-gray-500" contentEditable={false} data-readonly>
              Semana {weekStart || "—"} → {weekEnd || "—"} (Lun→Dom)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={goPrevWeek} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">◀ Semana anterior</button>
            <button onClick={goTodayWeek} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">Hoy</button>
            <button onClick={goNextWeek} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">Semana siguiente ▶</button>
            <button onClick={() => window.print()} className="px-3 py-1.5 rounded-xl border text-xs hover:bg-gray-50">🖨 Imprimir</button>
          </div>
        </header>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 no-print">
        <button className={`px-3 py-1.5 rounded-xl border text-xs ${activeTurn === "morning" ? "bg-black text-white" : "hover:bg-gray-50"}`} onClick={() => setActiveTurn("morning")}>Mañana</button>
        <button className={`px-3 py-1.5 rounded-xl border text-xs ${activeTurn === "afternoon" ? "bg-black text-white" : "hover:bg-gray-50"}`} onClick={() => setActiveTurn("afternoon")}>Tarde</button>
      </div>

      {loading ? (
        <div className="text-gray-500">Cargando semana…</div>
      ) : (
        // ⬇️ Solo esta caja se imprime
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm print-root">
          {/* Cabecera días */}
          <div className="grid text-xs" style={{ gridTemplateColumns: `100px repeat(7, minmax(120px, 1fr))` }}>
            <div className="bg-gray-50 border-b px-2 py-1.5 font-semibold text-gray-600" />
            {orderedDays.map((ymd) => (
              <div key={ymd} className="bg-gray-50 border-b px-2 py-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wide">{humanDayUTC(ymd)}</div>
                <div className="text-[10px] text-gray-400">{ymd}</div>
              </div>
            ))}
          </div>

          {/* Turno activo */}
          <TurnSection turn={activeTurn} />
        </div>
      )}
    </div>
  );
}
