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
const CONTENT_ROWS = ["PRE ENTREN0", "FÍSICO", "TÉCNICO–TÁCTICO"] as const;
const META_ROWS = ["LUGAR", "HORA", "VIDEO"] as const;

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
function humanDate(ymd: string) {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  });
}

export default function SessionTurnoPage() {
  const { ymd, turn } = useParams<{ ymd: string; turn: TurnKey }>();
  const qs = useSearchParams();
  const focus = qs.get("focus") || "";

  const [loading, setLoading] = useState(false);
  const [daySessions, setDaySessions] = useState<SessionDTO[]>([]);
  const [weekStart, setWeekStart] = useState<string>("");

  const blockRefs = {
    "PRE ENTREN0": useRef<HTMLDivElement | null>(null),
    "FÍSICO": useRef<HTMLDivElement | null>(null),
    "TÉCNICO–TÁCTICO": useRef<HTMLDivElement | null>(null),
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

  const meta = useMemo(() => {
    const get = (row: (typeof META_ROWS)[number]) =>
      (daySessions.find((s) => isCellOf(s, turn, row))?.title || "").trim();
    const lugar = get("LUGAR");
    const hora = get("HORA");
    const videoRaw = get("VIDEO");
    const video = parseVideoValue(videoRaw);
    return { lugar, hora, video };
  }, [daySessions, turn]);

  const blocks = useMemo(() => {
    return CONTENT_ROWS.map((row) => {
      const s = daySessions.find((it) => isCellOf(it, turn, row));
      const text = (s?.title || "").trim();
      return { row, text, id: s?.id || "" };
    });
  }, [daySessions, turn]);

  return (
    <div className="p-4 space-y-4">
      <header className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-bold">
            Sesión — {turn === "morning" ? "Mañana" : "Tarde"} · {humanDate(ymd)}
          </h1>
          <p className="text-xs md:text-sm text-gray-500">
            Semana base: {weekStart || "—"} · Día: {ymd}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/ct/dashboard" className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">
            ← Dashboard
          </a>
          <a href={`/ct/plan-semanal?turn=${turn}`} className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">
            ✏️ Editor
          </a>
        </div>
      </header>

      {/* Meta */}
      <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="bg-emerald-50 text-emerald-900 font-semibold px-3 py-2 border-b uppercase tracking-wide text-[12px]">
          Meta de la sesión
        </div>
        <div className="grid md:grid-cols-3 gap-2 p-3 text-sm">
          <div>
            <div className="text-[11px] text-gray-500">Lugar</div>
            <div className="font-medium">{meta.lugar || <span className="text-gray-400">—</span>}</div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500">Hora</div>
            <div className="font-medium">{meta.hora || <span className="text-gray-400">—</span>}</div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500">Video</div>
            {meta.video.url ? (
              <a href={meta.video.url} target="_blank" rel="noreferrer" className="underline text-emerald-700" title={meta.video.label || "Video"}>
                {meta.video.label || "Video"}
              </a>
            ) : (<span className="text-gray-400">—</span>)}
          </div>
        </div>
      </section>

      {/* Bloques */}
      <section className="space-y-3">
        {blocks.map(({ row, text, id }) => (
          <div key={row} ref={blockRefs[row]} className="rounded-2xl border bg-white shadow-sm p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">{row}</h2>
              {id ? (
                <a
                  href={`/ct/sessions/${id}`}
                  className="text-[11px] rounded-lg border px-2 py-0.5 hover:bg-gray-50"
                  title="Abrir ficha de ejercicio"
                >
                  Abrir ficha
                </a>
              ) : null}
            </div>
            <div className="min-h-[120px] whitespace-pre-wrap leading-6 text-[13px]">
              {text || <span className="text-gray-400 italic">—</span>}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
