// src/app/ct/dashboard/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getSessionsWeek,
  getMonday,
  toYYYYMMDDUTC,
  type SessionDTO,
} from "@/lib/api/sessions";
import type { DayTypeDef, DayTypeId } from "@/lib/planner-daytype";
import PlannerMatchLink from "@/components/PlannerMatchLink";
import VideoPlayerModal from "@/components/training/VideoPlayerModal";

/* =========================================================
   Tipos / filas
========================================================= */
type TurnKey = "morning" | "afternoon";

// IDs internos por defecto. El label visible se resuelve con rowLabels.
const DEFAULT_CONTENT_ROWS = [
  "PRE ENTREN0",
  "FÍSICO",
  "TÉCNICO–TÁCTICO",
  "COMPENSATORIO",
] as const;

const SESSION_NAME_ROW = "NOMBRE SESIÓN" as const;
const META_ROWS = [
  SESSION_NAME_ROW,
  "TIPO",
  "TIPO TRABAJO",
  "LUGAR",
  "HORA",
  "VIDEO",
  "RIVAL",
] as const;

/* =========================================================
   Flags día
========================================================= */
type DayFlagKind = "NONE" | "PARTIDO" | "LIBRE";
type DayFlag = {
  kind: DayFlagKind;
  rival?: string;
  logoUrl?: string;
  rivalId?: string;
};

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
    if (parts.length >= 4) {
      const [, id, name, logo] = parts;
      return {
        kind: "PARTIDO",
        rivalId: id || undefined,
        rival: name || "",
        logoUrl: logo || "",
      };
    }
    if (parts.length >= 3) {
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
type MicroKey =
  | ""
  | "MD+1"
  | "MD+2"
  | "MD-4"
  | "MD-3"
  | "MD-2"
  | "MD-1"
  | "MD"
  | "DESCANSO";

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
type DashboardSemanaInnerProps = {
  showHeader?: boolean;
};

function DashboardSemanaInner({ showHeader = true }: DashboardSemanaInnerProps) {
  const qs = useSearchParams();
  const hideHeaderParam = qs.get("hideHeader") === "1";
  const hideHeader = hideHeaderParam || !showHeader;
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

  // ===== Prefs (mismos que el Editor) =====
  const [rowLabels, setRowLabels] = useState<Record<string, string>>({});
  const [contentRowIds, setContentRowIds] = useState<string[]>(() => [...DEFAULT_CONTENT_ROWS]);
  const label = (id: string) => rowLabels[id] || id;

  // DayType (igual que editor, pero solo lectura)
  const [dayTypes, setDayTypes] = useState<DayTypeDef[]>([]);
  const [dayTypeAssignments, setDayTypeAssignments] = useState<Record<string, DayTypeId>>({});

  async function loadPrefs() {
    try {
      const r = await fetch("/api/planner/labels", { cache: "no-store" });
      const j = await r.json();
      setRowLabels(j?.rowLabels || {});
      if (Array.isArray(j?.contentRowIds) && j.contentRowIds.length) {
        setContentRowIds(j.contentRowIds as string[]);
      } else {
        setContentRowIds([...DEFAULT_CONTENT_ROWS]);
      }
    } catch {
      setRowLabels({});
      setContentRowIds([...DEFAULT_CONTENT_ROWS]);
    }
  }

  useEffect(() => {
    loadPrefs();
    const onUpd = () => loadPrefs();
    window.addEventListener("planner-row-labels-updated", onUpd as any);
    // mantenemos simetría con el editor (por si disparás refresh desde tools)
    window.addEventListener("planner-places-updated", onUpd as any);
    return () => {
      window.removeEventListener("planner-row-labels-updated", onUpd as any);
      window.removeEventListener("planner-places-updated", onUpd as any);
    };
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

      // DayType assignments para la semana visible
      try {
        const assignRes = await fetch(
          `/api/ct/planner/day-type-assignments?weekStart=${encodeURIComponent(res.weekStart)}`,
          { cache: "no-store" },
        );
        if (assignRes.ok) {
          const json = await assignRes.json();
          const map = (json.assignments || {}) as Record<string, DayTypeId>;
          setDayTypeAssignments(map);
        } else {
          setDayTypeAssignments({});
        }
      } catch (err) {
        console.error(err);
        setDayTypeAssignments({});
      }
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

  // DayTypes desde backend (por equipo)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/ct/planner/day-types", { cache: "no-store" });
        if (!res.ok) throw new Error("No se pudieron cargar los tipos de trabajo");
        const json = await res.json();
        const items = Array.isArray(json.dayTypes) ? (json.dayTypes as any[]) : [];
        const mapped: DayTypeDef[] = items.map((t: any) => ({
          id: String(t.key || ""),
          label: String(t.label || ""),
          color: String(t.color || "#f9fafb"),
        }));
        setDayTypes(mapped);
      } catch (e) {
        console.error(e);
        setDayTypes([]);
      }
    })();
  }, []);

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
    return (
      (["MD+1", "MD+2", "MD-4", "MD-3", "MD-2", "MD-1", "MD", "DESCANSO", ""].includes(val)
        ? val
        : "") as MicroKey
    );
  }

  // DayType helpers (read-only)
  const dayTypeKeyFor = (ymd: string, turn: TurnKey): DayTypeId | "" => {
    const k = `${ymd}::${turn}`;
    return dayTypeAssignments[k] || "";
  };

  const dayTypeDefFor = (ymd: string, turn: TurnKey): DayTypeDef | undefined => {
    const key = dayTypeKeyFor(ymd, turn);
    if (!key) return undefined;
    return dayTypes.find((t) => t.id === key);
  };

  const dayTypeColorFor = (ymd: string, turn: TurnKey): string | undefined => {
    return dayTypeDefFor(ymd, turn)?.color;
  };

  // META (solo lectura)
  function ReadonlyMetaCell({ ymd, row }: { ymd: string; row: (typeof META_ROWS)[number] }) {
    if (row === "TIPO") {
      const flag = getDayFlag(ymd, activeTurn);
      const text = flag.kind === "PARTIDO" ? "Partido" : flag.kind === "LIBRE" ? "Libre" : "—";
      return (
        <div className="h-6 text-[11px] px-1 flex items-center justify-center text-center truncate">
          {text}
        </div>
      );
    }

    if (row === "TIPO TRABAJO") {
      const def = dayTypeDefFor(ymd, activeTurn);
      if (!def) {
        return (
          <div className="h-6 text-[11px] px-1 flex items-center justify-center text-center text-gray-400 italic truncate">
            —
          </div>
        );
      }
      return (
        <div className="h-6 text-[11px] px-1 flex items-center justify-center text-center gap-1 truncate">
          <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: def.color || "#f9fafb" }} />
          <span className="truncate">{def.label}</span>
        </div>
      );
    }

    if (row === "RIVAL") {
      const flag = getDayFlag(ymd, activeTurn);
      const text = flag.kind === "PARTIDO" && flag.rival ? flag.rival : "—";
      return (
        <div className="h-6 text-[11px] px-1 flex items-center justify-center text-center truncate">
          {text}
        </div>
      );
    }

    const s = findCell(ymd, activeTurn, row);
    const text = (s?.title || "").trim();
    if (!text) {
      return (
        <div className="h-6 text-[11px] text-gray-400 italic px-1 flex items-center justify-center text-center">
          —
        </div>
      );
    }

    if (row === "VIDEO") {
      const { label, url } = parseVideoValue(text);
      return (
        <div className="flex items-center justify-center h-full">
          {url ? (
            <button
              type="button"
              className="w-28 h-6 text-[11px] px-2 rounded-md border bg-white text-gray-700 truncate"
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
            <div className="h-6 text-[11px] text-gray-400 italic px-1 flex items-center justify-center text-center">
              —
            </div>
          )}
        </div>
      );
    }

    return <div className="h-6 text-[11px] px-1 flex items-center justify-center text-center truncate">{text}</div>;
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
    const librePill = activeTurn === "morning" ? "Mañana libre" : "Tarde libre";
    const isMatchDay = flag.kind === "PARTIDO";
    const dayTypeColor = dayTypeColorFor(ymd, activeTurn) || "#f9fafb";

    const firstRowId = contentRowIds[0] ?? SESSION_NAME_ROW;
    let focusRow: string = firstRowId;
    let hasGridContent = false;
    for (const row of contentRowIds) {
      const s = findCell(ymd, activeTurn, row);
      const txt = (s?.title || "").trim();
      if (txt && !hasGridContent) {
        hasGridContent = true;
        focusRow = row;
      }
    }

    const sessionNameCell = findCell(ymd, activeTurn, SESSION_NAME_ROW);
    const hasSessionName = ((sessionNameCell?.title || "").trim().length ?? 0) > 0;
    const hasAnyContent = hasGridContent || hasSessionName;

    const len = contentRowIds.length || 1;
    const panelHeight = ROW_H * len + CELL_GAP * (len - 1);

    const NormalBody = () => (
      <div className="grid gap-[6px]" style={{ gridTemplateRows: `repeat(${len}, minmax(${ROW_H}px, auto))` }}>
        {contentRowIds.map((row) => {
          const s = findCell(ymd, activeTurn, row);
          const txt = (s?.title || "").trim();
          return (
            <div
              key={row}
              className="rounded-md border border-black/10 px-2 py-1.5 text-[12px] leading-[18px] whitespace-pre-wrap text-center"
            >
              {txt || <span className="text-gray-400 italic">—</span>}
            </div>
          );
        })}
      </div>
    );

    const SinglePanel = ({ children }: { children: React.ReactNode }) => (
      <div className="rounded-md border flex items-center justify-center" style={{ height: panelHeight }}>
        <div className="p-2 text-center">{children}</div>
      </div>
    );

    return (
      <div className="relative rounded-xl border border-black/10 shadow-sm overflow-hidden" style={{ backgroundColor: dayTypeColor }}>
        <div className="absolute inset-0 bg-white/10 pointer-events-none" />
        <div className="relative">
          <div
            className="px-2 border-b border-black/10 flex flex-col justify-center gap-1 text-gray-900"
            style={{
              height: isMatchDay ? DAY_HEADER_H + 22 : DAY_HEADER_H,
              minHeight: isMatchDay ? DAY_HEADER_H + 22 : DAY_HEADER_H,
            }}
          >
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wide flex-shrink-0 min-w-0 truncate">
                {humanDayUTC(ymd)}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 min-w-0">
                <MicroBadge ymd={ymd} />
              </div>
            </div>

            {isMatchDay && (
              <div className="grid grid-cols-[auto,1fr] items-center gap-2 min-w-0">
                <div className="w-7 h-7 flex items-center justify-center">
                  {flag.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={flag.logoUrl} alt="Escudo rival" className="w-7 h-7 object-contain" />
                  ) : null}
                </div>

                <div className="min-w-0 flex justify-end">
                  <div className="max-w-[110px]">
                    <PlannerMatchLink
                      rivalId={flag.rivalId}
                      rivalName={flag.rival || ""}
                      label={"Plan de\npartido"}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-2">
            {flag.kind === "LIBRE" && (
              <SinglePanel>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-gray-300 bg-white text-[10px] font-medium text-gray-700">
                  {librePill}
                </span>
              </SinglePanel>
            )}

            {(flag.kind === "NONE" || flag.kind === "PARTIDO") && (
              <>
                <NormalBody />
                {hasAnyContent && (
                  <div className="mt-2 flex justify-center">
                    <a
                      href={`/ct/sessions/by-day/${ymd}/${activeTurn}?focus=${encodeURIComponent(focusRow)}`}
                      className="inline-flex items-center px-2 py-0.5 rounded-full border border-emerald-600 text-[10px] font-medium text-emerald-700 hover:bg-emerald-50 bg-white/80"
                    >
                      Ver sesión
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 space-y-3">
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
                className={`px-2.5 py-1.5 rounded-xl border text-xs ${
                  activeTurn === "morning" ? "bg-black text-white" : "hover:bg-gray-50"
                }`}
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
                className={`px-2.5 py-1.5 rounded-xl border text-xs ${
                  activeTurn === "afternoon" ? "bg-black text-white" : "hover:bg-gray-50"
                }`}
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
            <button onClick={() => setBase((d) => addDaysUTC(d, -7))} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">
              ◀ Semana anterior
            </button>
            <button onClick={() => setBase(getMonday(new Date()))} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">
              Hoy
            </button>
            <button onClick={() => setBase((d) => addDaysUTC(d, 7))} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">
              Semana siguiente ▶
            </button>
            <button onClick={() => window.print()} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">
              🖨️ Imprimir
            </button>
          </div>
        </header>
      )}

      {loadingWeek ? (
        <div className="text-gray-500">Cargando…</div>
      ) : (
        <section id="print-root">
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
                    {META_ROWS.filter((labelText) => labelText !== "TIPO" && labelText !== "RIVAL").map((labelText) => (
                      <div key={`meta-${labelText}`} className="contents">
                        <div className="bg-gray-50/60 border rounded-md px-2 py-1 text-[10px] font-medium text-gray-600 text-center">
                          {labelText === "TIPO TRABAJO" ? "TIPO DE TRABAJO" : labelText}
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

                {/* Cuerpo: grid global por semana */}
                <div
                  className="grid gap-[6px]"
                  style={{
                    gridTemplateColumns: `${COL_LABEL_W}px repeat(7, minmax(${DAY_MIN_W}px, 1fr))`,
                    gridTemplateRows: `${DAY_HEADER_H}px repeat(${contentRowIds.length || 1}, minmax(${ROW_H}px, auto))`,
                  }}
                >
                  <div />
                  {orderedDays.map((ymd) => {
                    const flag = getDayFlag(ymd, activeTurn);
                    const librePill = activeTurn === "morning" ? "Mañana libre" : "Tarde libre";
                    const isMatchDay = flag.kind === "PARTIDO";
                    const isLibre = flag.kind === "LIBRE";
                    const dayTypeColor = dayTypeColorFor(ymd, activeTurn) || "#f9fafb";

                    const firstRowId = contentRowIds[0] ?? SESSION_NAME_ROW;
                    let focusRow: string = firstRowId;
                    let hasGridContent = false;
                    for (const row of contentRowIds) {
                      const s = findCell(ymd, activeTurn, row);
                      const txt = (s?.title || "").trim();
                      if (txt && !hasGridContent) {
                        hasGridContent = true;
                        focusRow = row;
                      }
                    }
                    const sessionNameCell = findCell(ymd, activeTurn, SESSION_NAME_ROW);
                    const hasSessionName = ((sessionNameCell?.title || "").trim().length ?? 0) > 0;
                    const hasAnyContent = hasGridContent || hasSessionName;
                    const showVerSesion = hasAnyContent && (flag.kind === "NONE" || flag.kind === "PARTIDO");

                    return (
                      <div
                        key={`header-${ymd}`}
                        className="relative rounded-xl border border-black/10 shadow-sm overflow-hidden"
                        style={{ backgroundColor: dayTypeColor }}
                      >
                        <div className="absolute inset-0 bg-white/10 pointer-events-none" />
                        <div
                          className="relative px-2 flex flex-col justify-center gap-1 text-gray-900"
                          style={{
                            height: isMatchDay ? DAY_HEADER_H + 22 : DAY_HEADER_H,
                            minHeight: isMatchDay ? DAY_HEADER_H + 22 : DAY_HEADER_H,
                          }}
                        >
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <div className="text-[10px] font-semibold uppercase tracking-wide flex-shrink-0 min-w-0 truncate">
                              {humanDayUTC(ymd)}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 min-w-0">
                              {isLibre && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-gray-300 bg-white/80 text-[10px] font-medium text-gray-700">
                                  {librePill}
                                </span>
                              )}
                              <MicroBadge ymd={ymd} />
                            </div>
                          </div>

                          {isMatchDay && (
                            <div className="grid grid-cols-[auto,1fr] items-center gap-2 min-w-0">
                              <div className="w-7 h-7 flex items-center justify-center">
                                {flag.logoUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={flag.logoUrl} alt="Escudo rival" className="w-7 h-7 object-contain" />
                                ) : null}
                              </div>

                              <div className="min-w-0 flex justify-end">
                                <div className="max-w-[110px]">
                                  <PlannerMatchLink
                                    rivalId={flag.rivalId}
                                    rivalName={flag.rival || ""}
                                    label={"Plan de\npartido"}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {showVerSesion && (
                            <div className="mt-1 flex justify-end">
                              <a
                                href={`/ct/sessions/by-day/${ymd}/${activeTurn}?focus=${encodeURIComponent(focusRow)}`}
                                className="inline-flex items-center px-2 py-0.5 rounded-full border border-emerald-600 text-[10px] font-medium text-emerald-700 hover:bg-emerald-50 bg-white/80"
                              >
                                Ver sesión
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {contentRowIds.map((rowId) => (
                    <div key={`row-${rowId}`} className="contents">
                      <div className="bg-gray-50/60 border rounded-md px-2 text-[10px] font-medium text-gray-600 flex items-center justify-center text-center">
                        <span className="leading-[14px] whitespace-pre-line">{label(rowId)}</span>
                      </div>

                      {orderedDays.map((ymd) => {
                        const dayTypeColor = dayTypeColorFor(ymd, activeTurn) || "#f9fafb";
                        const s = findCell(ymd, activeTurn, rowId);
                        const txt = (s?.title || "").trim();
                        return (
                          <div
                            key={`${ymd}-${rowId}`}
                            className="rounded-md border border-black/10 px-2 py-1.5 text-[12px] leading-[18px] whitespace-pre-wrap text-center"
                            style={{ backgroundColor: dayTypeColor }}
                          >
                            {txt || <span className="text-gray-400 italic">—</span>}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
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
export function DashboardPlanGridReadOnly() {
  return <DashboardSemanaInner showHeader={false} />;
}

export default function DashboardSemanaPage() {
  return (
    <Suspense fallback={<div className="p-3 text-gray-500">Cargando…</div>}>
      <DashboardSemanaInner />
    </Suspense>
  );
}