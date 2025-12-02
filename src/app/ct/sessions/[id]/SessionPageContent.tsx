"use client";

import { useMemo, useState } from "react";
import type { SessionDTO } from "@/lib/api/sessions";
import type { ExerciseDTO } from "@/lib/api/exercises";
import { SessionRoutinePanel, type LinkedRoutineDTO } from "./SessionRoutinePanel";

// Types mirrored from page.tsx
export type Exercise = {
  title: string;
  kind: string;
  space: string;
  players: string;
  duration: string;
  description: string;
  imageUrl: string;
  routineId?: string;
  routineName?: string;
};

function isVideoUrl(url: string | undefined | null) {
  if (!url) return false;
  const u = url.toLowerCase();
  return u.includes("youtube.com") || u.includes("youtu.be") || u.includes("vimeo.com");
}

function parseMarker(description?: string) {
  const text = (description || "").trimStart();
  const m = text.match(/^\[GRID:(morning|afternoon):(.+?)\]\s*\|\s*(\d{4}-\d{2}-\d{2})/i);
  return { turn: (m?.[1] || "") as "morning" | "afternoon" | "", row: m?.[2] || "", ymd: m?.[3] || "" };
}

export type SessionPageContentProps = {
  session: SessionDTO;
  exercises: Exercise[];
  linkedRoutines: LinkedRoutineDTO[];
  isViewMode: boolean;
};

export default function SessionPageContent({
  session,
  exercises,
  linkedRoutines,
  isViewMode,
}: SessionPageContentProps) {
  const [editing, setEditing] = useState(!isViewMode);

  const marker = useMemo(
    () => parseMarker(typeof session?.description === "string" ? session?.description : ""),
    [session?.description]
  );
  const displayRow = (marker.row || "").replace("ENTREN0", "ENTRENO");

  const roCls = editing ? "" : "bg-gray-50 text-gray-600 cursor-not-allowed";

  return (
    <div id="print-root" className="p-4 md:p-6 space-y-4 print:!p-2">
      {/* Header */}
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between print:hidden">
        <div>
          <h1 className="text-lg md:text-xl font-bold">
            Sesión: {displayRow || "Bloque"} · {"(" + (marker.turn === "morning" ? "Mañana" : marker.turn === "afternoon" ? "Tarde" : "—") + ")"}
          </h1>
          <p className="text-xs md:text-sm text-gray-500">
            Día: {marker.ymd || "—"} · Tipo: {session.type}
          </p>
        </div>
      </header>

      {/* Rutina de fuerza vinculada a la sesión */}
      <SessionRoutinePanel
        sessionId={session.id}
        routines={linkedRoutines}
        isViewMode={isViewMode}
      />

      {/* Lista de ejercicios */}
      <div className="space-y-4">
        {exercises.map((ex, idx) => (
          <section
            id={`ex-${idx}`}
            key={idx}
            className="rounded-2xl border bg-white shadow-sm overflow-hidden print:page"
          >
            <div className="flex items-center justify-between bg-gray-50 px-3 py-2 border-b">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-700">
                EJERCICIO #{idx + 1}
              </span>
            </div>

            <div className="p-3 grid md:grid-cols-2 gap-3">
              <div className="space-y-2 md:col-span-2">
                <label className="text-[11px] text-gray-500">Título del ejercicio</label>
                <input
                  className={`w-full rounded-md border px-2 py-1.5 text-sm ${roCls}`}
                  value={ex.title || ""}
                  readOnly
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] text-gray-500">Tipo de ejercicio</label>
                <input
                  className={`w-full rounded-md border px-2 py-1.5 text-sm ${roCls}`}
                  value={ex.kind || ""}
                  readOnly
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] text-gray-500">Espacio</label>
                <input
                  className={`w-full rounded-md border px-2 py-1.5 text-sm ${roCls}`}
                  value={ex.space}
                  readOnly
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] text-gray-500">N° de jugadores</label>
                <input
                  className={`w-full rounded-md border px-2 py-1.5 text-sm ${roCls}`}
                  value={ex.players}
                  readOnly
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] text-gray-500">Duración</label>
                <input
                  className={`w-full rounded-md border px-2 py-1.5 text-sm ${roCls}`}
                  value={ex.duration}
                  readOnly
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[11px] text-gray-500">Descripción</label>
                <textarea
                  className={`w-full rounded-md border px-2 py-1.5 text-sm min-h-[120px] ${roCls}`}
                  value={ex.description}
                  readOnly
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between print:hidden">
                  <label className="text-[11px] text-gray-500">Imagen / video (URL)</label>
                </div>
                <input
                  className={`w-full rounded-md border px-2 py-1.5 text-sm print:hidden ${roCls}`}
                  value={ex.imageUrl}
                  readOnly
                />
                {ex.imageUrl ? (
                  <div className="mt-2">
                    {isVideoUrl(ex.imageUrl) ? (
                      <div className="aspect-video w-full rounded-lg border overflow-hidden">
                        <iframe
                          src={ex.imageUrl}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ex.imageUrl}
                        alt="Vista previa"
                        className="max-h-80 rounded-lg border object-contain"
                      />
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
