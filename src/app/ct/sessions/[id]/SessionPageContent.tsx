"use client";

import React, { useMemo, useState } from "react";
import type { SessionDTO } from "@/lib/api/sessions";
import VideoPlayerModal from "@/components/training/VideoPlayerModal";

// Types mirrored from page.tsx
export type Exercise = {
  title: string;
  kind: string;
  space: string;
  players: string;
  duration: string;
  description: string;
  imageUrl: string;
  videoUrl?: string;
  routineId?: string;
  routineName?: string;
  isRoutineOnly?: boolean;
};

function isVideoUrl(url: string | undefined | null) {
  if (!url) return false;
  const u = url.toLowerCase();
  return u.includes("youtube.com") || u.includes("youtu.be") || u.includes("vimeo.com");
}

function resolveYoutubeEmbedUrl(url: string): string {
  const shortMatch = /youtu\.be\/([^?&#]+)/i.exec(url);
  if (shortMatch?.[1]) {
    return `https://www.youtube.com/embed/${shortMatch[1]}`;
  }

  const watchMatch = /youtube\.com\/watch\?[^#]*v=([^&]+)/i.exec(url);
  if (watchMatch?.[1]) {
    return `https://www.youtube.com/embed/${watchMatch[1]}`;
  }

  return url;
}

function parseMarker(description?: string) {
  const text = (description || "").trimStart();
  const m = text.match(/^\[GRID:(morning|afternoon):(.+?)\]\s*\|\s*(\d{4}-\d{2}-\d{2})/i);
  return { turn: (m?.[1] || "") as "morning" | "afternoon" | "", row: m?.[2] || "", ymd: m?.[3] || "" };
}

export type SessionPageContentProps = {
  session: SessionDTO;
  exercises: Exercise[];
  isViewMode: boolean;
};

export default function SessionPageContent({
  session,
  exercises,
  isViewMode,
}: SessionPageContentProps) {
  const marker = useMemo(
    () => parseMarker(typeof session?.description === "string" ? session?.description : ""),
    [session?.description]
  );
  const displayRow = (marker.row || "").replace("ENTREN0", "ENTRENO");
  const roCls = "bg-gray-50 text-gray-600 cursor-not-allowed";

  const [videoModal, setVideoModal] = useState<{
    open: boolean;
    url?: string;
    title?: string;
    zone?: string | null;
  }>({ open: false });

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
              {isVideoUrl(ex.videoUrl) && (
                <button
                  type="button"
                  className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 underline-offset-2 hover:underline"
                  onClick={() =>
                    setVideoModal({
                      open: true,
                      url: ex.videoUrl || undefined,
                      title: ex.title || `Ejercicio #${idx + 1}`,
                      zone: ex.space?.trim() || ex.kind?.trim() || null,
                    })
                  }
                >
                  Ver video
                </button>
              )}
            </div>

            <div className="p-3 grid md:grid-cols-2 gap-3">
              {ex.isRoutineOnly ? (
                <div className="space-y-2 md:col-span-2" />
              ) : (
                <>
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
                    {ex.imageUrl ? (
                      <div>
                        <label className="text-[11px] text-gray-500 block mb-1 print:hidden">
                          Imagen del ejercicio
                        </label>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ex.imageUrl}
                          alt="Vista previa"
                          className="max-h-80 rounded-lg border object-contain"
                        />
                      </div>
                    ) : null}

                    {/* El video se muestra vía modal "Ver video" en el encabezado, no inline. */}
                  </div>

                  {/* En el editor moderno ya no mostramos vínculos directos a rutinas desde aquí. */}
                </>
              )}
            </div>
          </section>
        ))}
      </div>

      <VideoPlayerModal
        open={videoModal.open && !!videoModal.url}
        onClose={() => setVideoModal({ open: false })}
        title={videoModal.title || "Ejercicio"}
        zone={videoModal.zone}
        videoUrl={videoModal.url}
      />
    </div>
  );
}
