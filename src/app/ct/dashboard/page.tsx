// src/app/ct/dashboard/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  getSessionsWeek,
  getMonday,
  toYYYYMMDDUTC,
  type SessionDTO,
} from "@/lib/api/sessions";
import PlannerMatchLink from "@/components/PlannerMatchLink";
import VideoPlayerModal from "@/components/training/VideoPlayerModal";

/* =========================================================
   Tipos / filas
========================================================= */
type TurnKey = "morning" | "afternoon";

// IDs internos (no cambian). El label visible se resuelve con rowLabels.
const ROWS = ["PRE ENTREN0", "FÍSICO", "TÉCNICO–TÁCTICO", "COMPENSATORIO"] as const;

const SESSION_NAME_ROW = "NOMBRE SESIÓN" as const;
const META_ROWS = [SESSION_NAME_ROW, "LUGAR", "HORA", "VIDEO"] as const;

/* =========================================================
   Flags día
========================================================= */
type DayFlagKind = "NONE" | "PARTIDO" | "LIBRE";
type DayFlag = { kind: DayFlagKind; rival?: string; logoUrl?: string; rivalId?: string };

const DAYFLAG_TAG = "DAYFLAG";
const dayFlagMarker = (turn: TurnKey) => `[${DAYFLAG_TAG}:${turn}]`;
const isDayFlag = (s: SessionDTO, turn: TurnKey) =>
  typeof s.description === "string" && s.description.startsWith(dayFlagMarker(turn));

/** Compatibilidad: NUEVO (PARTIDO|id|name|logo) y VIEJO (PARTIDO|name|logo) */
function parseDayFlagTitle(title?: string | null): DayFlag {
  const raw = (title || "").trim();
  if (!raw) return { kind: "NONE" };

  const parts = raw.split("|").map((x) => (x || "").trim());
  const kind = parts[0];

  if (kind === "PARTIDO") {
    if (parts.length >= 4) { // nuevo
      const [, id, name, logo] = parts;
      return { kind: "PARTIDO", rivalId: id || undefined, rival: name || "", logoUrl: logo || "" };
    }
    if (parts.length >= 3) { // viejo
      const [, name, logo] = parts;
      return { kind: "PARTIDO", rival: name || "", logoUrl: logo || "" };
    }
    return { kind: "PARTIDO" };
  }
  if (kind === "LIBRE") return { kind: "LIBRE" };
  return { kind: "NONE" };
}

/* =========================================================
   Microciclo (MD)
========================================================= */
type MicroKey = "" | "MD+1" | "MD+2" | "MD-4" | "MD-3" | "MD-2" | "MD-1" | "MD" | "DESCANSO";
const MICRO_TAG = "MICRO";
const microMarker = (turn: TurnKey) => `[${MICRO_TAG}:${turn}]`;
const isMicroOf = (s: SessionDTO, turn: TurnKey) =>
  typeof s.description === "string" && s.description.startsWith(microMarker(turn));

const MICRO_STYLES: Record<MicroKey, { bg: string; text: string; border: string }> = {
  "": { bg: "bg-gray-50", text: "text-gray-500", border: "border-gray-200" },
  "MD+1": { bg: "bg-blue-50", text: "text-blue-900", border: "border-blue-200" },
  "MD+2": { bg: "bg-yellow-50", text: "text-yellow-900", border: "border-yellow-200" },
  "MD-4": { bg: "bg-red-50", text: "text-red-900", border: "border-red-200" },
  "MD-3": { bg: "bg-orange-50", text: "text-orange-900", border: "border-orange-200" },
  "MD-2": { bg: "bg-green-50", text: "text-green-900", border: "border-green-200" },
  "MD-1": { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
  MD: { bg: "bg-amber-50", text: "text-amber-900", border: "border-amber-200" },
  DESCANSO: { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" },
};

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
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
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
   Layout
========================================================= */
const COL_LABEL_W = 102;
const DAY_MIN_W = 112;
const ROW_H = 62;
const DAY_HEADER_H = 54;
const CELL_GAP = 6;

/* =========================================================
   Inner
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
  const [videoPreview, setVideoPreview] = useState<{
    title: string;
    zone?: string | null;
    videoUrl?: string | null;
  } | null>(null);

  // ===== Row labels (mismos que el Editor) =====
  const [rowLabels, setRowLabels] = useState<Record<string, string>>({});
  const label = (id: string) => rowLabels[id] || id;

  async function loadRowLabels() {
    try {
      const r = await fetch("/api/planner/labels", { cache: "no-store" });
      const j = await r.json();
      setRowLabels(j?.rowLabels || {});
    } catch {
      setRowLabels({});
    }
  }

  useEffect(() => {
    loadRowLabels();
    const onUpd = () => loadRowLabels();
    window.addEventListener("planner-row-labels-updated", onUpd as any);
    return () => window.removeEventListener("planner-row-labels-updated", onUpd as any);
  }, []);

  async function loadWeek(d: Date) {
    setLoadingWeek(true);
    try {
      const monday = getMonday(d);
      const startYYYYMMDD = toYYYYMMDDUTC(monday);
      const res = await getSessionsWeek({ start: startYYYYMMDD });
      setDaysMap(res.days);
      setWeekStart(res.weekStart);
      setWeekEnd(res.weekEnd);
    } finally {
      setLoadingWeek(false);
    }
  }
  useEffect(() => {
    loadWeek(base); // eslint-disable-line react-hooks/exhaustive-deps
  }, [base]);

  const orderedDays = useMemo(() => {
    if (!weekStart) return [];
    const start = new Date(`${weekStart}T00:00:00.000Z`);
    return Array.from({ length: 7 }, (_, i) => toYYYYMMDDUTC(addDaysUTC(start, i)));
  }, [weekStart]);

  function sessionsOf(ymd: string) {
    return daysMap[ymd] || [];
  }
  function findCell(ymd: string, turn: TurnKey, row: string) {
    return sessionsOf(ymd).find((s) => isCellOf(s, turn, row));
  }
  function getDayFlag(ymd: string, turn: TurnKey): DayFlag {
    const f = sessionsOf(ymd).find((s) => isDayFlag(s, turn));
    return parseDayFlagTitle(f?.title);
  }
  function getMicro(ymd: string, turn: TurnKey): MicroKey {
    const m = sessionsOf(ymd).find((s) => isMicroOf(s, turn));
    const val = (m?.title || "").trim() as MicroKey;
    return (["MD+1","MD+2","MD-4","MD-3","MD-2","MD-1","MD","DESCANSO",""].includes(val) ? val : "") as MicroKey;
  }

  // META (solo lectura)
  function ReadonlyMetaCell({ ymd, row }: { ymd: string; row: (typeof META_ROWS)[number] }) {
    const s = findCell(ymd, activeTurn, row);
    const text = (s?.title || "").trim();
    if (!text)
      return <div className="h-6 text-[11px] text-gray-400 italic px-1 flex items-center">—</div>;
    if (row === "VIDEO") {
      const { label, url } = parseVideoValue(text);
      return url ? (
        <button
          type="button"
          className="h-6 text-[11px] underline text-emerald-700 px-1 flex items-center truncate"
          onClick={() =>
            setVideoPreview({
              title: label || "Video sesión",
              zone: null,
              videoUrl: url,
            })
          }
        >
          {label || "Video"}
        </button>
      ) : (
        <div className="h-6 text-[11px] px-1 flex items-center truncate">{label}</div>
      );
    }
    return <div className="h-6 text-[11px] px-1 flex items-center truncate">{text}</div>;
  }

  function MicroBadge({ ymd }: { ymd: string }) {
    const v = getMicro(ymd, activeTurn);
    if (!v) return null;
    const s = MICRO_STYLES[v];
    return (
      <span
        className={`inline-flex items-center h-[18px] px-1.5 rounded-md border text-[9px] font-semibold ${s.bg} ${s.text} ${s.border} whitespace-nowrap`}
        title="Intensidad (microciclo)"
      >
        {v}
      </span>
    );
  }

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
            <div
              key={row}
              className="rounded-md border bg-gray-50 px-2 py-1.5 text-[12px] leading-[18px] whitespace-pre-wrap overflow-hidden"
            >
              {txt || <span className="text-gray-400 italic">—</span>}
            </div>
          );
        })}
      </div>
    );

    const SinglePanel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <div
        className="rounded-md border bg-gray-50 flex items-center justify-center"
        style={{ height: ROW_H * 4 + CELL_GAP * 3 }}
      >
        <div className="p-2 text-center">{children}</div>
      </div>
    );

    const LibrePanel = () => (
      <div className="text-gray-700 font-semibold tracking-wide text-[14px]">LIBRE</div>
    );

    return (
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        {/* Header: grid 2x2 con altura fija para todos los días */}
        <div
          className="px-2 border-b bg-gray-50"
          style={{ height: DAY_HEADER_H, minHeight: DAY_HEADER_H }}
        >
          <div className="grid grid-rows-2 grid-cols-[auto,1fr] gap-x-2 gap-y-1 h-full">
            {/* Fila 1, col 1: día/fecha */}
            <div className="row-start-1 col-start-1 text-[10px] font-semibold uppercase tracking-wide flex-shrink-0 min-w-0 truncate">
              {humanDayUTC(ymd)}
            </div>

            {/* Fila 1, col 2: MicroBadge (y cualquier badge adicional de micro) */}
            <div className="row-start-1 col-start-2 flex items-center justify-end gap-2 min-w-0">
              <MicroBadge ymd={ymd} />
            </div>

            {/* Fila 2: a la derecha, escudo + Plan de partido (sólo PARTIDO); en días normales, link sesión */}
            <div className="row-start-2 col-start-2 flex items-center justify-end gap-2 min-w-0">
              {flag.kind === "PARTIDO" && flag.logoUrl ? (
                <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={flag.logoUrl}
                    alt="Escudo rival"
                    className="w-6 h-6 object-contain flex-shrink-0"
                  />
                </div>
              ) : null}

              {flag.kind === "PARTIDO" ? (
                <PlannerMatchLink
                  rivalId={flag.rivalId}
                  rivalName={flag.rival || ""}
                  label="Plan de partido"
                />
              ) : flag.kind === "NONE" ? (
                <a
                  href={headerHref}
                  className="text-[9px] rounded border px-1.5 py-0.5 hover:bg-gray-100 whitespace-nowrap truncate max-w-[120px]"
                >
                  sesión
                </a>
              ) : null}
            </div>
          </div>
        </div>

        <div className="p-2">
          {flag.kind === "LIBRE" && (
            <SinglePanel>
              <div className="text-gray-700 font-semibold tracking-wide text-[14px]">
                {librePill}
              </div>
            </SinglePanel>
          )}
          {/* En PARTIDO y días normales mostramos la misma planificación */}
          {(flag.kind === "NONE" || flag.kind === "PARTIDO") && <NormalBody />}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 space-y-3" id="print-root">
      {/* PRINT tweaks */}
      <style jsx global>{`
        @page { size: A4 landscape; margin: 8mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden !important; }
          #print-root, #print-root * { visibility: visible !important; }
          #print-root {
            position: absolute; inset: 0; margin: 0; padding: 0;
            transform: scale(0.94);
            transform-origin: top left;
            width: 106%;
          }
          nav, aside, header[role="banner"], .sidebar, .app-sidebar, .print\\:hidden, .no-print {
            display: none !important;
          }
          a[href]:after { content: ""; }
        }
      `}</style>

      {!hideHeader && (
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between no-print">
          <div>
            <h2 className="text-lg md:text-xl font-bold">Dashboard — Plan semanal (solo lectura)</h2>
            <p className="text-xs md:text-sm text-gray-500">
              Semana {weekStart || "—"} → {weekEnd || "—"} (Lun→Dom)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 mr-2">
              <button
                className={`px-2.5 py-1.5 rounded-xl border text-xs ${activeTurn === "morning" ? "bg-black text-white" : "hover:bg-gray-50"}`}
                onClick={() => {
                  const p = new URLSearchParams(qs.toString());
                  p.set("turn", "morning");
                  history.replaceState(null, "", `?${p.toString()}`);
                  setActiveTurn("morning");
                }}
              >
                Mañana
              </button>
              <button
                className={`px-2.5 py-1.5 rounded-xl border text-xs ${activeTurn === "afternoon" ? "bg-black text-white" : "hover:bg-gray-50"}`}
                onClick={() => {
                  const p = new URLSearchParams(qs.toString());
                  p.set("turn", "afternoon");
                  history.replaceState(null, "", `?${p.toString()}`);
                  setActiveTurn("afternoon");
                }}
              >
                Tarde
              </button>
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
          <div className="p-3 w-full overflow-x-auto">
            <div className="inline-block min-w-[900px] md:min-w-full">
            {/* DETALLES */}
            <div className="mb-2">
              <div className="bg-emerald-50 text-emerald-900 font-semibold px-2 py-0.5 border rounded-md uppercase tracking-wide text-[11px] inline-block">
                DETALLES
              </div>
              <div
                className="mt-2 grid gap-[6px]"
                style={{ gridTemplateColumns: `${COL_LABEL_W}px repeat(7, minmax(${DAY_MIN_W}px, 1fr))` }}
              >
                {META_ROWS.map((labelText) => (
                  <div key={`meta-${labelText}`} className="contents">
                    <div className="bg-gray-50/60 border rounded-md px-2 py-1 text-[10px] font-medium text-gray-600">
                      {labelText}
                    </div>
                    {orderedDays.map((ymd) => (
                      <div key={`${labelText}-${ymd}`} className="rounded-md border px-1 py-0.5">
                        <ReadonlyMetaCell ymd={ymd} row={labelText} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* TURNO */}
            <div className="bg-emerald-100/70 text-emerald-900 font-semibold px-2 py-0.5 border rounded-md uppercase tracking-wide text-[11px] mb-2">
              {activeTurn === "morning" ? "TURNO MAÑANA" : "TURNO TARDE"}
            </div>

            {/* Cuerpo */}
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: `${COL_LABEL_W}px repeat(7, minmax(${DAY_MIN_W}px, 1fr))` }}
            >
              <div
                className="grid gap-[6px]"
                style={{ gridTemplateRows: `${DAY_HEADER_H}px repeat(4, ${ROW_H}px)` }}
              >
                <div />
                {ROWS.map((rowId) => (
                  <div key={rowId} className="bg-gray-50/60 border rounded-md px-2 text-[10px] font-medium text-gray-600 flex items-center">
                    <span className="leading-[14px] whitespace-pre-line">{label(rowId)}</span>
                  </div>
                ))}
              </div>

              {orderedDays.map((ymd) => (
                <DayCard key={`card-${ymd}`} ymd={ymd} />
              ))}
            </div>
            </div>
          </div>
        </div>
      )}
      <VideoPlayerModal
        open={!!videoPreview}
        onClose={() => setVideoPreview(null)}
        title={videoPreview?.title ?? ""}
        zone={videoPreview?.zone ?? null}
        videoUrl={videoPreview?.videoUrl ?? null}
      />
    </div>
  );
}

/* =========================================================
   Wrapper
========================================================= */
export default function DashboardSemanaPage() {
  return (
    <Suspense fallback={<div className="p-3 text-gray-500">Cargando…</div>}>
      <DashboardSemanaInner />
    </Suspense>
  );
}
