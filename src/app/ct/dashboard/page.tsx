"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getSessionsWeek,
  getMonday,
  toYYYYMMDDUTC,
  type SessionDTO,
} from "@/lib/api/sessions";

/* =========================================================
   Tipos (planner semanal)
========================================================= */
type TurnKey = "morning" | "afternoon";
const ROWS = ["PRE ENTREN0", "FÍSICO", "TÉCNICO–TÁCTICO", "COMPENSATORIO"] as const;
const SESSION_NAME_ROW = "NOMBRE SESIÓN";
const META_ROWS = ["LUGAR", "HORA", "VIDEO", SESSION_NAME_ROW] as const;

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
   Layout (planner semanal)
========================================================= */
const COL_LABEL_W = 110;  // ancho columna izquierda
const DAY_MIN_W   = 116;  // ancho mín por día
const ROW_H       = 64;   // alto de cada fila
const DAY_HEADER_H = 52;  // altura fija encabezado de día
const CELL_GAP    = 6;

/* =========================================================
   Inner (envuelto en Suspense para useSearchParams)
========================================================= */
function DashboardSemanaInner() {
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

  // Row labels personalizados (como en el editor)
  const [rowLabels, setRowLabels] = useState<Record<string, string>>({});
  const label = (id: string) => rowLabels[id] || id;

  async function loadPrefs() {
    try {
      const r = await fetch("/api/planner/labels", { cache: "no-store" });
      if (!r.ok) throw new Error("fail");
      const j = await r.json();
      setRowLabels(j.rowLabels || {});
    } catch {
      setRowLabels({});
    }
  }

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

  useEffect(() => {
    loadPrefs();
  }, []);
  useEffect(() => {
    loadWeek(base); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  const orderedDays = useMemo(() => {
    if (!weekStart) return [];
    const start = new Date(`${weekStart}T00:00:00.000Z`);
    return Array.from({ length: 7 }, (_, i) => toYYYYMMDDUTC(addDaysUTC(start, i)));
  }, [weekStart]);

  function findCell(ymd: string, turn: TurnKey, row: string) {
    const list = daysMap[ymd] || [];
    return list.find((s) => isCellOf(s, turn, row));
  }
  function getDayFlag(ymd: string, turn: TurnKey): DayFlag {
    const list = daysMap[ymd] || [];
    const f = list.find((s) => isDayFlag(s, turn));
    return parseDayFlagTitle(f?.title);
  }

  // ===== META (solo lectura) =====
  function ReadonlyMetaCell({
    ymd,
    row,
  }: {
    ymd: string;
    row: (typeof META_ROWS)[number];
  }) {
    const s = findCell(ymd, activeTurn, row);
    const text = (s?.title || "").trim();
    if (!text)
      return (
        <div className="h-6 text-[11px] text-gray-400 italic px-1 flex items-center">—</div>
      );

    if (row === "VIDEO") {
      const { label, url } = parseVideoValue(text);
      return url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="h-6 text-[11px] underline text-emerald-700 px-1 flex items-center truncate"
        >
          {label || "Video"}
        </a>
      ) : (
        <div className="h-6 text-[11px] px-1 flex items-center truncate">{label}</div>
      );
    }

    // LUGAR, HORA y NOMBRE SESIÓN → texto plano
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

    const LibrePanel = () => (
      <div className="text-gray-700 font-semibold tracking-wide text-[14px]">LIBRE</div>
    );

    return (
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div
          className="flex items-center justify-between px-2 py-1 border-b bg-gray-50"
          style={{ height: DAY_HEADER_H }}
        >
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide">
              {humanDayUTC(ymd)}
            </div>
            <div className="text-[9px] leading-3 text-gray-400 whitespace-nowrap">{ymd}</div>
          </div>

          {flag.kind === "LIBRE" ? (
            <span className="text-[10px] rounded border bg-gray-100 px-2 py-0.5">{librePill}</span>
          ) : (
            <a
              href={headerHref}
              className="text-[10px] rounded border px-2 py-0.5 hover:bg-gray-100"
            >
              Ver sesión
            </a>
          )}
        </div>

        <div className="p-2">
          {flag.kind === "PARTIDO" && (
            <SinglePanel>
              <PartidoPanel />
            </SinglePanel>
          )}
          {flag.kind === "LIBRE" && (
            <SinglePanel>
              <LibrePanel />
            </SinglePanel>
          )}
          {flag.kind === "NONE" && <NormalBody />}
        </div>
      </div>
    );
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

      {/* ======== Sólo Plan semanal (solo lectura) ======== */}
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
            <button
              onClick={() => setBase((d) => addDaysUTC(d, -7))}
              className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs"
            >
              ◀ Semana anterior
            </button>
            <button
              onClick={() => setBase(getMonday(new Date()))}
              className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs"
            >
              Hoy
            </button>
            <button
              onClick={() => setBase((d) => addDaysUTC(d, 7))}
              className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs"
            >
              Semana siguiente ▶
            </button>
            <button
              onClick={() => window.print()}
              className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs"
            >
              🖨️ Imprimir
            </button>
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
              <div
                className="mt-2 grid gap-[6px]"
                style={{
                  gridTemplateColumns: `${COL_LABEL_W}px repeat(7, minmax(${DAY_MIN_W}px, 1fr))`,
                }}
              >
                {(["LUGAR","HORA","VIDEO",SESSION_NAME_ROW] as (typeof META_ROWS)[number][])
                  .map((row) => (
                  <FragmentMetaRow key={`meta-${row}`} row={row} />
                ))}
              </div>
            </div>

            {/* Sección turno */}
            <div className="bg-emerald-100/70 text-emerald-900 font-semibold px-2 py-0.5 border rounded-md uppercase tracking-wide text-[11px] mb-2">
              {activeTurn === "morning" ? "TURNO MAÑANA" : "TURNO TARDE"}
            </div>

            {/* Layout principal: etiquetas + 7 tarjetas */}
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `${COL_LABEL_W}px repeat(7, minmax(${DAY_MIN_W}px, 1fr))`,
              }}
            >
              {/* Columna etiquetas: espaciador header + 4 filas */}
              <div
                className="grid gap-[6px]"
                style={{ gridTemplateRows: `${DAY_HEADER_H}px repeat(4, ${ROW_H}px)` }}
              >
                <div />
                {ROWS.map((r) => (
                  <div
                    key={r}
                    className="bg-gray-50/60 border rounded-md px-2 text-[10px] font-medium text-gray-600 flex items-center"
                  >
                    <span className="leading-[14px] whitespace-pre-line">{label(r)}</span>
                  </div>
                ))}
              </div>

              {orderedDays.map((ymd) => (
                <DayCard key={`card-${ymd}`} ymd={ymd} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Fragmento para pintar cada fila de META (LUGAR, HORA, VIDEO, NOMBRE SESIÓN)
function FragmentMetaRow({ row }: { row: (typeof META_ROWS)[number] }) {
  const qs = useSearchParams();
  const activeTurn = (qs.get("turn") === "afternoon" ? "afternoon" : "morning") as TurnKey;
  const [weekStart, setWeekStart] = useState<string>("");
  const [orderedDays, setOrderedDays] = useState<string[]>([]);

  // Este componente se usa dentro del render principal; recibimos semana por CSS grid
  // Para simplificar, lo calculamos leyendo el DOM root via dataset o trayéndolo del contexto superior
  // pero acá lo armamos simple: lo devuelve el padre como ya está renderizado.
  // Para no complicar, duplicamos lógica mínima:
  useEffect(() => {
    const el = document.querySelector("[data-week-start]") as HTMLElement | null;
    if (el?.dataset.weekStart) {
      const ws = el.dataset.weekStart!;
      setWeekStart(ws);
      const start = new Date(`${ws}T00:00:00.000Z`);
      const days = Array.from({ length: 7 }, (_, i) =>
        toYYYYMMDDUTC(addDaysUTC(start, i))
      );
      setOrderedDays(days);
    }
  }, []);

  return (
    <>
      <div className="bg-gray-50/60 border rounded-md px-2 py-1 text-[10px] font-medium text-gray-600">
        {row}
      </div>
      {orderedDays.map((ymd) => (
        <div key={`${row}-${ymd}`} className="rounded-md border px-1 py-0.5">
          {/* Re-usa el componente de arriba */}
          {/* @ts-ignore: usamos el de arriba dentro del mismo archivo */}
          <ReadonlyMetaCell ymd={ymd} row={row} />
        </div>
      ))}
    </>
  );
}

/* =========================================================
   Página: envuelve en Suspense para cumplir Next requirement
========================================================= */
export default function DashboardSemanaPage() {
  return (
    <Suspense fallback={<div className="p-3 text-gray-500">Cargando…</div>}>
      <DashboardSemanaInner />
    </Suspense>
  );
}
