"use client";

import React from "react";
import type { Exercise } from "@/lib/sessions/encodeDecodeExercises";
import VideoPlayerModal from "@/components/training/VideoPlayerModal";
import { FieldDiagramCanvas } from "./FieldDiagramCanvas";

type ExerciseCardPreviewProps = {
  exercise: Exercise;
  index?: number;
};

function isVideoUrl(url: string | undefined | null) {
  if (!url) return false;
  const u = url.toLowerCase();
  return u.includes("youtube.com") || u.includes("youtu.be") || u.includes("vimeo.com");
}

export function ExerciseCardPreview({ exercise, index }: ExerciseCardPreviewProps) {
  const title = exercise.title?.trim() || "Sin título";
  const diagram = exercise.diagram;
  const description = exercise.description?.trim();
  const imageUrl = (exercise as any).imageUrl as string | undefined;
  const videoUrl = (exercise as any).videoUrl as string | undefined;
  const hasVideo = isVideoUrl(videoUrl);

  const hasDiagram = !!diagram;
  const hasRenderedUrl = !!diagram?.renderedImageUrl;
  const hasRenderedImage = !!diagram?.renderedImage;

  const chips: string[] = [];
  if (exercise.kind?.trim()) chips.push(exercise.kind.trim());
  if (exercise.space?.trim()) chips.push(exercise.space.trim());
  if (exercise.players?.trim()) chips.push(exercise.players.trim());
  if (exercise.duration?.trim()) chips.push(exercise.duration.trim());

  const [isVideoModalOpen, setIsVideoModalOpen] = React.useState(false);

  return (
    <article className="rounded-2xl border bg-white shadow-sm p-3 md:p-4 space-y-3">
      <header className="flex items-center justify-between gap-2">
        {typeof index === "number" ? (
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Tarea #{String(index + 1).padStart(2, "0")}
          </div>
        ) : (
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Tarea
          </div>
        )}
        {hasVideo && (
          <button
            type="button"
            className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 underline-offset-2 hover:underline"
            onClick={() => setIsVideoModalOpen(true)}
          >
            Ver video
          </button>
        )}
      </header>

      {imageUrl && (
        <div className="mt-2">
          <div className="w-[220px] h-[220px] rounded-lg border bg-gray-50 flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={title}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3">
        {hasDiagram && (
          <div className="md:w-1/3 w-full">
            {hasRenderedUrl ? (
              <div className="relative w-full overflow-hidden rounded-xl bg-black/40">
                <img
                  src={diagram!.renderedImageUrl!}
                  alt={title}
                  className="aspect-video w-full object-contain"
                />
              </div>
            ) : hasRenderedImage ? (
              <div className="relative w-full overflow-hidden rounded-xl bg-black/40">
                <img
                  src={diagram!.renderedImage!}
                  alt={title}
                  className="aspect-video w-full object-contain"
                />
              </div>
            ) : (
              <div className="relative w-full overflow-hidden rounded-xl bg-black/40">
                <div className="aspect-video w-full">
                  <FieldDiagramCanvas value={diagram!} readOnly showToolbar={false} />
                </div>
              </div>
            )}
          </div>
        )}

        <div className={hasDiagram ? "md:w-2/3 w-full" : "w-full"}>
          <h3 className="text-sm font-semibold text-gray-900 mb-1 truncate">
            {title}
          </h3>
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {chips.map((chip, i) => (
                <span
                  key={`${chip}-${i}`}
                  className="inline-flex items-center rounded-full border bg-gray-50 px-2 py-0.5 text-[10px] text-gray-700"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}
          {description && (
            <p className="mt-2 text-xs md:text-sm text-gray-600 whitespace-pre-line line-clamp-3">
              {description}
            </p>
          )}
        </div>
      </div>

      <VideoPlayerModal
        open={isVideoModalOpen && hasVideo}
        onClose={() => setIsVideoModalOpen(false)}
        title={title}
        zone={exercise.space?.trim() || exercise.kind?.trim() || null}
        videoUrl={videoUrl}
      />
    </article>
  );
}
