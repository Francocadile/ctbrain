// src/app/ct/sessions/by-day/[ymd]/[turn]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  getSessionsWeek,
  getMonday,
  toYYYYMMDDUTC,
  type SessionDTO,
} from "@/lib/api/sessions";
import SessionDayView, { SessionDayBlock } from "@/components/sessions/SessionDayView";
import { decodeExercises, type Exercise } from "@/lib/sessions/encodeDecodeExercises";
import type { RowLabels } from "@/lib/planner-prefs";

type TurnKey = "morning" | "afternoon";

// Bloques principales de contenido (fallback por compatibilidad para semanas viejas)
const CONTENT_ROWS = ["PRE ENTREN0", "FÍSICO", "TÉCNICO–TÁCTICO", "COMPENSATORIO"] as const;

// Metadatos (arriba). Agregamos NOMBRE SESIÓN
const META_ROWS = ["LUGAR", "HORA", "VIDEO", "NOMBRE SESIÓN"] as const;

/* ====== Marcadores usados por el editor ====== */
const DAYFLAG_TAG = "DAYFLAG";                  // título: "PARTIDO|rival|logo" | "LIBRE" | ""
const MICRO_TAG   = "MICRO";                    // título: "MD+1" | "MD+2" | ... | "MD" | "DESCANSO" | ""
const dayFlagMarker   = (turn: TurnKey) => `[${DAYFLAG_TAG}:${turn}]`;
const microMarker     = (turn: TurnKey) => `[${MICRO_TAG}:${turn}]`;

/* ====== Helpers generales ====== */
function cellMarker(turn: TurnKey, row: string) {
  return `[GRID:${turn}:${row}]`;
}
function isCellOf(s: SessionDTO, turn: TurnKey, row: string) {
  return typeof s.description === "string" && s.description.startsWith(cellMarker(turn, row));
}
function parseVideoValue(v: string | null | undefined): { label: string; url: string } {
  const raw = (v || "").trim();
  if (!raw) return { label: "", url: "" };
  const [label, url] = raw.split("|").map((s) => s.trim());
  if (!url && label?.startsWith("http")) return { label: "Video", url: label };
  return { label: label || "", url: url || "" };
}

const WEEKDAY_ES = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"] as const;

function formatSessionHeaderDate(ymd: string) {
  const date = new Date(`${ymd}T00:00:00.000Z`);
  const weekday = WEEKDAY_ES[date.getUTCDay()];
  const [year, month, day] = ymd.split("-");
  return `${weekday}, ${day}/${month}`;
}

/* ====== Partido / Descanso ====== */
type DayFlagKind = "NONE" | "PARTIDO" | "LIBRE";
type DayFlag = { kind: DayFlagKind; rival?: string; logoUrl?: string };

function isDayFlag(s: SessionDTO, turn: TurnKey) {
  return typeof s.description === "string" && s.description.startsWith(dayFlagMarker(turn));
}
function parseDayFlagTitle(title?: string | null): DayFlag {
  const t = (title || "").trim();
  if (!t) return { kind: "NONE" };
  const [kind, rival, logoUrl] = t.split("|").map((x) => (x || "").trim());
  if (kind === "PARTIDO") return { kind: "PARTIDO", rival, logoUrl };
  if (kind === "LIBRE") return { kind: "LIBRE" };
  return { kind: "NONE" };
}

/* ====== Intensidad (Microciclo) ====== */
type MicroKey = "" | "MD+1" | "MD+2" | "MD-4" | "MD-3" | "MD-2" | "MD-1" | "MD" | "DESCANSO";
function isMicro(s: SessionDTO, turn: TurnKey) {
  return typeof s.description === "string" && s.description.startsWith(microMarker(turn));
}
function parseMicroTitle(title?: string | null): MicroKey {
  const t = (title || "").trim();
  const allowed = new Set(["", "MD+1", "MD+2", "MD-4", "MD-3", "MD-2", "MD-1", "MD", "DESCANSO"]);
  return (allowed.has(t) ? (t as MicroKey) : "") as MicroKey;
}
function microChipClass(v: MicroKey) {
  // Colores en línea con editor/dashboard
  switch (v) {
    case "MD+1":     return "bg-blue-100 text-blue-900 border-blue-200";
    case "MD+2":     return "bg-yellow-100 text-yellow-900 border-yellow-200";
    case "MD-4":     return "bg-red-100 text-red-900 border-red-200";
    case "MD-3":     return "bg-orange-100 text-orange-900 border-orange-200";
    case "MD-2":     return "bg-green-100 text-green-900 border-green-200";
    case "MD-1":     return "bg-gray-100 text-gray-800 border-gray-200";
    case "MD":       return "bg-amber-100 text-amber-900 border-amber-200";
    case "DESCANSO": return "bg-gray-200 text-gray-800 border-gray-300";
    default:         return "bg-gray-50 text-gray-600 border-gray-200";
  }
}

export default function SessionTurnoPage() {
  const { ymd, turn } = useParams<{ ymd: string; turn: TurnKey }>();
  const qs = useSearchParams();
  const focus = qs.get("focus") || "";

  const [loading, setLoading] = useState(false);
  const [daySessions, setDaySessions] = useState<SessionDTO[]>([]);
  const [weekStart, setWeekStart] = useState<string>("");
  const [editingBlock, setEditingBlock] = useState<SessionDayBlock | null>(null);
  const [rowLabels, setRowLabels] = useState<RowLabels>({});
  const [contentRowIds, setContentRowIds] = useState<string[]>(() => [...CONTENT_ROWS]);

  const printCSS = `
    @page { size: A4 portrait; margin: 10mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body * { visibility: hidden !important; }
      .print-root, .print-root * { visibility: visible !important; }
      .print-root { position: absolute; inset: 0; margin: 0; }
      .no-print { display: none !important; }
      a[href]:after { content: ""; }
    }
  `;

  useEffect(() => {
    async function load() {
      if (!ymd) return;
      setLoading(true);
      try {
        const date = new Date(`${ymd}T00:00:00.000Z`);
        const monday = getMonday(date);
        const res = await getSessionsWeek({ start: toYYYYMMDDUTC(monday) });
        setWeekStart(res.weekStart);
        setDaySessions(res.days?.[ymd] || []);
      } catch (e) {
        console.error(e);
        alert("No se pudo cargar la sesión.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [ymd]);

  // Preferencias de planner (labels + filas dinámicas de contenido)
  useEffect(() => {
    async function loadPlannerPrefs() {
      try {
        const r = await fetch("/api/planner/labels", { cache: "no-store" });
        if (!r.ok) throw new Error("fetch planner prefs failed");
        const j = await r.json();
        setRowLabels(j.rowLabels || {});
        const ids =
          Array.isArray(j.contentRowIds) && j.contentRowIds.length
            ? (j.contentRowIds as string[])
            : [...CONTENT_ROWS];
        setContentRowIds(ids);
      } catch (e) {
        console.error("No se pudieron cargar prefs de planner para vista by-day", e);
        setRowLabels({});
        setContentRowIds([...CONTENT_ROWS]);
      }
    }
    loadPlannerPrefs();
  }, []);

  useEffect(() => {
    if (!focus) return;
    const el = document.querySelector<HTMLElement>(`[data-row-key="${focus}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [focus]);

  // Meta (incluye nombre de sesión)
  const meta = useMemo(() => {
    const get = (row: (typeof META_ROWS)[number]) =>
      (daySessions.find((s) => isCellOf(s, turn, row))?.title || "").trim();
    const lugar = get("LUGAR");
    const hora = get("HORA");
    const videoRaw = get("VIDEO");
    const name = get("NOMBRE SESIÓN");
    const video = parseVideoValue(videoRaw);
    return { lugar, hora, video, name };
  }, [daySessions, turn]);

  // Flag del día (partido / descanso)
  const dayFlag = useMemo<DayFlag>(() => {
    const f = daySessions.find((s) => isDayFlag(s, turn));
    return parseDayFlagTitle(f?.title);
  }, [daySessions, turn]);

  // Intensidad (MD…)
  const micro = useMemo<MicroKey>(() => {
    const m = daySessions.find((s) => isMicro(s, turn));
    return parseMicroTitle(m?.title);
  }, [daySessions, turn]);

  // Bloques
  const header = useMemo(
    () => ({
      name: meta.name,
      place: meta.lugar,
      time: meta.hora,
      videoUrl: meta.video.url || null,
      microLabel: micro || null,
    }),
    [meta.name, meta.lugar, meta.hora, meta.video.url, micro]
  );

  const viewBlocks: SessionDayBlock[] = useMemo(
    () =>
      contentRowIds.map((rowId) => {
        const cell = daySessions.find((s) => isCellOf(s, turn, rowId));
        const visibleLabel = rowLabels[rowId] || rowId;
        let exercises: Exercise[] = [];
        if (cell?.description) {
          try {
            const decoded = decodeExercises(cell.description);
            exercises = decoded.exercises || [];
          } catch (e) {
            console.error("decodeExercises failed for by-day block", e);
            exercises = [];
          }
        }
        return {
          rowKey: rowId,
          rowLabel: visibleLabel,
          title: (cell?.title || "").trim(),
          sessionId: cell?.id || "",
          exercises,
        };
      }),
    [daySessions, turn, rowLabels, contentRowIds]
  );

  // Si es día libre, mostramos solo el mensaje de descanso en lugar de bloques
  if (dayFlag.kind === "LIBRE") {
    return (
      <div className="p-4 space-y-4 print-root">
        <style jsx global>{printCSS}</style>
        <header className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-sm text-gray-500">
              {formatSessionHeaderDate(ymd)}, {turn === "morning" ? "Mañana" : "Tarde"}
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded border ${microChipClass(micro)}`}>
              {micro || "—"}
            </span>
          </div>
          <div className="flex items-center gap-2 no-print">
            <a
              href="/ct/dashboard"
              className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs"
            >
              Dashboard
            </a>
            <a
              href="/ct/plan-semanal"
              className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs"
            >
              Editor
            </a>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl border text-xs hover:bg-gray-50"
            >
              Imprimir
            </button>
          </div>
        </header>
        <div className="rounded-2xl border bg-white shadow-sm p-10 text-center text-gray-700 font-semibold">
          DESCANSO
        </div>
      </div>
    );
  }

  return (
    <>
      <SessionDayView
        date={ymd}
        turn={turn}
        header={header}
        blocks={viewBlocks}
        mode="ct"
        onEditBlock={(block) => setEditingBlock(block)}
      />

      {editingBlock && editingBlock.sessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative h-[90vh] w-full max-w-5xl rounded-2xl bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between border-b px-4 py-2 text-sm font-medium text-slate-800">
              <span>
                Editar ejercicios · {editingBlock.rowLabel}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-md border px-2 py-1 text-xs hover:bg-slate-50"
                  onClick={async () => {
                    setEditingBlock(null);
                    try {
                      const date = new Date(`${ymd}T00:00:00.000Z`);
                      const monday = getMonday(date);
                      const res = await getSessionsWeek({ start: toYYYYMMDDUTC(monday) });
                      setWeekStart(res.weekStart);
                      setDaySessions(res.days?.[ymd] || []);
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={(() => {
                  const base = `/ct/sessions/${editingBlock.sessionId}`;
                  const sep = base.includes("?") ? "&" : "?";
                  return `${base}${sep}embed=1`;
                })()}
                className="h-full w-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
