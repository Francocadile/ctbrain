// src/app/ct/sessions/by-day/[ymd]/[turn]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  getSessionsWeek,
  getMonday,
  toYYYYMMDDUTC,
  type SessionDTO,
} from "@/lib/api/sessions";

type TurnKey = "morning" | "afternoon";

// Bloques principales de contenido
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

function humanDateShort(ymd: string) {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });
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

  const blockRefs = {
    "PRE ENTREN0": useRef<HTMLDivElement | null>(null),
    "FÍSICO": useRef<HTMLDivElement | null>(null),
    "TÉCNICO–TÁCTICO": useRef<HTMLDivElement | null>(null),
    "COMPENSATORIO": useRef<HTMLDivElement | null>(null),
  } as const;

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

  useEffect(() => {
    const key = (focus || "") as typeof CONTENT_ROWS[number];
    const ref = key && (blockRefs as any)[key]?.current;
    if (ref) ref.scrollIntoView({ behavior: "smooth", block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const blocks = useMemo(() => {
    return CONTENT_ROWS.map((row) => {
      const s = daySessions.find((it) => isCellOf(it, turn, row));
      const text = (s?.title || "").trim();
      return { row, text, id: s?.id || "" };
    });
  }, [daySessions, turn]);

  return (
    <div className="p-4 space-y-4 print-root">
      <style jsx global>{printCSS}</style>

      <header className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-sm text-gray-500">
            {humanDateShort(ymd)}, {turn === "morning" ? "Mañana" : "Tarde"}
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded border ${microChipClass(micro)}`}>
            {micro || "—"}
          </span>
          {meta.name ? (
            <span className="text-sm text-gray-700">· <b>{meta.name}</b></span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 no-print">
          <a href="/ct/dashboard" className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">
            ← Dashboard
          </a>
          <a href="/ct/plan-semanal" className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">
            ✏️ Editor
          </a>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-xl border text-xs hover:bg-gray-50"
          >
            🖨 Imprimir
          </button>
        </div>
      </header>

      {/* Meta */}
      <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="bg-emerald-50 text-emerald-900 font-semibold px-3 py-2 border-b uppercase tracking-wide text-[12px]">
          Detalles
        </div>
        <div className="grid md:grid-cols-4 gap-2 p-3 text-sm">
          <div>
            <div className="text-[11px] text-gray-500">Nombre de sesión</div>
            <div className="font-medium">
              {meta.name || <span className="text-gray-400">—</span>}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500">Lugar</div>
            <div className="font-medium">
              {meta.lugar || <span className="text-gray-400">—</span>}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500">Hora</div>
            <div className="font-medium">
              {meta.hora || <span className="text-gray-400">—</span>}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500">Video</div>
            {meta.video.url ? (
              <a
                href={meta.video.url}
                target="_blank"
                rel="noreferrer"
                className="underline text-emerald-700"
                title={meta.video.label || "Video"}
              >
                {meta.video.label || "Video"}
              </a>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>

          {/* Partido (solo si corresponde) */}
          {dayFlag.kind === "PARTIDO" && (
            <>
              <div className="md:col-span-2">
                <div className="text-[11px] text-gray-500">Rival</div>
                <div className="font-medium">
                  {dayFlag.rival || <span className="text-gray-400">—</span>}
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="text-[11px] text-gray-500">Logo</div>
                {dayFlag.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={dayFlag.logoUrl}
                    alt="Logo rival"
                    className="h-10 w-auto object-contain rounded border bg-white"
                  />
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Descanso => no mostrar bloques */}
      {dayFlag.kind === "LIBRE" ? (
        <div className="rounded-2xl border bg-white shadow-sm p-10 text-center text-gray-700 font-semibold">
          DESCANSO
        </div>
      ) : (
        <section className="space-y-3">
          {blocks.map(({ row, text, id }) => (
            <div
              key={row}
              ref={blockRefs[row]}
              className="rounded-2xl border bg-white shadow-sm p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                  {row}
                </h2>
                {id && (
                  <div className="flex gap-2 no-print">
                    <a
                      href={`/ct/sessions/${id}?view=1`}
                      className="px-3 py-1.5 rounded-xl border text-xs hover:bg-gray-50"
                    >
                      Ver ejercicio
                    </a>
                    <a
                      href={`/ct/sessions/${id}`}
                      className="px-3 py-1.5 rounded-xl border text-xs hover:bg-gray-50"
                    >
                      Editar ejercicios
                    </a>
                  </div>
                )}
              </div>
              <div className="min-h-[120px] whitespace-pre-wrap leading-6 text-[13px]">
                {text || <span className="text-gray-400 italic">—</span>}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
