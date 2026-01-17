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

function cellMarker(turn: TurnKey, row: string) {
  return `[GRID:${turn}:${row}]`;
}
function isCellOf(s: SessionDTO, turn: TurnKey, row: string) {
  return typeof s.description === "string" && s.description.startsWith(cellMarker(turn, row));
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
        const date = new Date(`${ymd}T00:00:00.000Z`);
        const monday = getMonday(date);
        const res = await getSessionsWeek({ start: toYYYYMMDDUTC(monday) });
        setDaySessions(res.days?.[ymd] || []);
      } catch (e) {
        console.error(e);
        alert("No se pudo cargar la sesión.");
      }
    }
    load();
  }, [ymd]);

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

  const header = useMemo(
    () => ({
      name: meta.name,
      place: meta.lugar,
      time: meta.hora,
      videoUrl: meta.video.url || null,
      microLabel: null,
    }),
    [meta]
  );

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
