"use client";

import RoleGate from "@/components/auth/RoleGate";
import BackToMedico from "@/components/ui/BackToMedico";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  getSessionsWeek,
  getMonday,
  toYYYYMMDDUTC,
  type SessionDTO,
} from "@/lib/api/sessions";
import SessionDayView, { type SessionDayBlock } from "@/components/sessions/SessionDayView";
import { decodeExercises, type Exercise } from "@/lib/sessions/encodeDecodeExercises";
import type { RowLabels } from "@/lib/planner-prefs";

type TurnKey = "morning" | "afternoon";

// Compat: filas históricas por defecto
const CONTENT_ROWS = ["PRE ENTREN0", "FÍSICO", "TÉCNICO–TÁCTICO", "COMPENSATORIO"] as const;
const META_ROWS = ["LUGAR", "HORA", "VIDEO", "NOMBRE SESIÓN"] as const;

/* ====== Marcadores usados por el editor (paridad con /ct) ====== */
const DAYFLAG_TAG = "DAYFLAG";
const MICRO_TAG = "MICRO";
const dayFlagMarker = (turn: TurnKey) => `[${DAYFLAG_TAG}:${turn}]`;
const microMarker = (turn: TurnKey) => `[${MICRO_TAG}:${turn}]`;

function cellMarker(turn: TurnKey, row: string) {
  return `[GRID:${turn}:${row}]`;
}
function isCellOf(s: SessionDTO, turn: TurnKey, row: string) {
  return typeof s.description === "string" && s.description.startsWith(cellMarker(turn, row));
}

type MicroKey = "" | "MD+1" | "MD+2" | "MD-4" | "MD-3" | "MD-2" | "MD-1" | "MD" | "DESCANSO";
function isMicro(s: SessionDTO, turn: TurnKey) {
  return typeof s.description === "string" && s.description.startsWith(microMarker(turn));
}
function parseMicroTitle(title?: string | null): MicroKey {
  const t = (title || "").trim();
  const allowed = new Set(["", "MD+1", "MD+2", "MD-4", "MD-3", "MD-2", "MD-1", "MD", "DESCANSO"]);
  return (allowed.has(t) ? (t as MicroKey) : "") as MicroKey;
}

function isDayFlag(s: SessionDTO, turn: TurnKey) {
  return typeof s.description === "string" && s.description.startsWith(dayFlagMarker(turn));
}
type DayFlagKind = "NONE" | "PARTIDO" | "LIBRE";
type DayFlag = { kind: DayFlagKind; rival?: string; logoUrl?: string };
function parseDayFlagTitle(title?: string | null): DayFlag {
  const t = (title || "").trim();
  if (!t) return { kind: "NONE" };
  const [kind, rival, logoUrl] = t.split("|").map((x) => (x || "").trim());
  if (kind === "PARTIDO") return { kind: "PARTIDO", rival, logoUrl };
  if (kind === "LIBRE") return { kind: "LIBRE" };
  return { kind: "NONE" };
}

function visibleRowLabel(rowId: string, rowLabels: RowLabels, index1Based: number) {
  const fromPrefs = rowLabels[rowId];
  if (fromPrefs) return fromPrefs;
  if (/^row-\d+$/i.test(rowId)) return `Tarea ${index1Based}`;
  return rowId;
}

function parseVideoValue(v: string | null | undefined): { label: string; url: string } {
  const raw = (v || "").trim();
  if (!raw) return { label: "", url: "" };
  const [label, url] = raw.split("|").map((s) => s.trim());
  if (!url && label?.startsWith("http")) return { label: "Video", url: label };
  return { label: label || "", url: url || "" };
}

export default function MedicoSessionsByDayPage() {
  const { ymd, turn } = useParams<{ ymd: string; turn: TurnKey }>();
  const qs = useSearchParams();
  const focus = qs.get("focus") || "";

  const [daySessions, setDaySessions] = useState<SessionDTO[]>([]);
  const [rowLabels, setRowLabels] = useState<RowLabels>({});
  const [contentRowIds, setContentRowIds] = useState<string[]>(() => [...CONTENT_ROWS]);

  // Semana
  useEffect(() => {
    async function load() {
      if (!ymd) return;
      try {
        const [y, m, d] = ymd.split("-").map(Number);
        // Semana/calendario: usar fecha local para evitar desfasajes por UTC.
        const date = new Date(y, (m || 1) - 1, d || 1);
        const monday = getMonday(date);
        const start = toYYYYMMDDUTC(monday);
        // ⚠️ Importante: el endpoint correcto del helper es GET /api/sessions?start=...
        // No /api/sessions/week (ese endpoint existe pero NO lo usa el helper).
        const res = await getSessionsWeek({ start });

        setDaySessions((res.days as any)?.[ymd] || []);
      } catch (e) {
        console.error(e);
        alert("No se pudo cargar la sesión.");
      }
    }
    load();
  }, [ymd, turn]);

  // Prefs planner (labels + filas dinámicas)
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
        console.error("No se pudieron cargar prefs de planner para vista by-day (médico)", e);
        setRowLabels({});
        setContentRowIds([...CONTENT_ROWS]);
      }
    }
    loadPlannerPrefs();
  }, []);

  useEffect(() => {
    if (!focus) return;
    const el = document.querySelector<HTMLElement>(`[data-row-key="${focus}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focus]);

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

  const dayFlag = useMemo<DayFlag>(() => {
    const f = daySessions.find((s) => isDayFlag(s, turn));
    return parseDayFlagTitle(f?.title);
  }, [daySessions, turn]);

  const micro = useMemo<MicroKey>(() => {
    const m = daySessions.find((s) => isMicro(s, turn));
    return parseMicroTitle(m?.title);
  }, [daySessions, turn]);

  const header = useMemo(
    () => ({
      name: meta.name,
      place: meta.lugar,
      time: meta.hora,
      videoUrl: meta.video.url || null,
      microLabel: micro || null,
    }),
    [meta, micro]
  );

  // Si es día libre, replicamos el comportamiento de CT (vista vacía de bloques).
  if (dayFlag.kind === "LIBRE") {
    return (
      <RoleGate allow={["MEDICO", "ADMIN"]} requireTeam>
        <main className="min-h-[70vh] px-6 py-10 space-y-4">
          <BackToMedico />
          <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            <SessionDayView
              date={ymd}
              turn={turn}
              header={header}
              blocks={[]}
              mode="player"
              onEditBlock={undefined}
            />
          </div>
        </main>
      </RoleGate>
    );
  }

  const blocks: SessionDayBlock[] = useMemo(
    () =>
      contentRowIds.map((rowId, idx) => {
        const cell = daySessions.find((s) => isCellOf(s, turn, rowId));
        const visibleLabel = visibleRowLabel(rowId, rowLabels, idx + 1);
        let exercises: Exercise[] = [];
        if (cell?.description) {
          try {
            const decoded = decodeExercises(cell.description);
            exercises = decoded.exercises || [];
          } catch (e) {
            console.error("decodeExercises failed for medico by-day block", e);
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
    [contentRowIds, daySessions, rowLabels, turn]
  );

  return (
    <RoleGate allow={["MEDICO", "ADMIN"]} requireTeam>
      <main className="min-h-[70vh] px-6 py-10 space-y-4">
        <BackToMedico />
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <SessionDayView
            date={ymd}
            turn={turn}
            header={header}
            blocks={blocks}
            mode="player"
            onEditBlock={undefined}
          />
        </div>
      </main>
    </RoleGate>
  );
}
