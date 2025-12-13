"use client";

import { useState } from "react";
import Link from "next/link";
import VideoPlayerModal from "@/components/training/VideoPlayerModal";

function PlayerRoutineHeader({ routine }: { routine: any }) {
  const createdAt = routine.createdAt ? new Date(routine.createdAt) : null;
  const isToday = createdAt
    ? createdAt.toDateString() === new Date().toDateString()
    : false;

  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-base md:text-lg font-semibold text-gray-900">
            {routine.title || "Rutina"}
          </h1>
          {routine.goal && (
            <p className="text-xs text-gray-600 whitespace-pre-line">
              {routine.goal}
            </p>
          )}
        </div>
        <div className="text-right text-[11px] text-gray-500">
          <p>Creada: {createdAt ? createdAt.toLocaleDateString() : "—"}</p>
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-100 mt-1">
            {/* TODO: reemplazar por lógica real cuando haya info de calendario */}
            {isToday ? "Rutina de hoy" : "Rutina guardada"}
          </span>
        </div>
      </div>

      {routine.notesForAthlete && (
        <div className="border-t pt-2 mt-2">
          <p className="text-[11px] font-semibold text-gray-600 mb-1">
            Notas del CT
          </p>
          <p className="text-sm text-gray-700 whitespace-pre-line">
            {routine.notesForAthlete}
          </p>
        </div>
      )}
    </section>
  );
}

function PlayerRoutineBlock({
  block,
  items,
  onShowVideo,
}: {
  block: any;
  items: any[];
  onShowVideo: (preview: { title: string; zone?: string | null; videoUrl?: string | null }) => void;
}) {
  const hasItems = items.length > 0;

  return (
    <section className="rounded-xl border bg-gray-50 p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-gray-900">{block.name}</h2>
          {block.description && (
            <p className="text-xs text-gray-600 whitespace-pre-line">
              {block.description}
            </p>
          )}
        </div>
        {hasItems && (
          <span className="mt-0.5 inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-gray-500 border border-gray-200">
            {items.length} ejercicio{items.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {hasItems ? (
        <div className="mt-1 space-y-2">
          {items.map((it) => (
            <PlayerRoutineItemCard key={it.id} item={it} onShowVideo={onShowVideo} />
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-gray-400 mt-1">
          No hay ejercicios en este bloque.
        </p>
      )}
    </section>
  );
}

function PlayerRoutineItemCard({
  item,
  onShowVideo,
}: {
  item: any;
  onShowVideo?: (preview: { title: string; zone?: string | null; videoUrl?: string | null }) => void;
}) {
  const name = item.exerciseName || item.title;
  const noteToShow = item.athleteNotes ?? item.notes;

  return (
    <article className="rounded-lg border bg-white px-3 py-2 text-xs space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{name}</p>
        </div>
        {item.videoUrl && (
          <button
            type="button"
            className="shrink-0 text-[11px] text-blue-600 hover:underline"
            onClick={() =>
              onShowVideo?.({
                title: name,
                zone: item.zone ?? null,
                videoUrl: item.videoUrl,
              })
            }
          >
            Ver video
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
        {item.sets != null && (
          <PlayerRoutineParam label="Series" value={item.sets} />
        )}
        {item.reps != null && (
          <PlayerRoutineParam label="Reps" value={item.reps} />
        )}
        {item.load && <PlayerRoutineParam label="Carga" value={item.load} />}
        {item.tempo && <PlayerRoutineParam label="Tempo" value={item.tempo} />}
        {item.rest && <PlayerRoutineParam label="Descanso" value={item.rest} />}
      </div>

      {noteToShow && (
        <div className="pt-1 border-t mt-2">
          <p className="text-[10px] font-medium text-gray-500 mb-0.5">
            Indicaciones
          </p>
          <p className="text-[11px] text-gray-700 whitespace-pre-line">
            {noteToShow}
          </p>
        </div>
      )}
    </article>
  );
}

function PlayerRoutineParam({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className="text-[11px] text-gray-900">{value}</p>
    </div>
  );
}

export default function PlayerRoutinePageContent({
  routine,
  blocks,
  itemsByBlock,
  unassigned,
}: {
  routine: any;
  blocks: any[];
  itemsByBlock: Record<string, any[]>;
  unassigned: any[];
}) {
  const [videoPreview, setVideoPreview] = useState<{
    title: string;
    zone?: string | null;
    videoUrl?: string | null;
  } | null>(null);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      <div>
        <Link
          href="/jugador"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 hover:underline"
        >
          <span className="mr-1">←</span>
          <span>Volver</span>
        </Link>
      </div>
      <PlayerRoutineHeader routine={routine} />

      <div className="space-y-4">
        {blocks.map((b) => (
          <PlayerRoutineBlock
            key={b.id}
            block={b}
            items={itemsByBlock[b.id] || []}
            onShowVideo={setVideoPreview}
          />
        ))}

        {unassigned.length > 0 && (
          <section className="mt-4 border-t pt-4">
            <p className="text-xs text-gray-500 mb-2">
              Otros ejercicios vinculados a esta rutina que no tienen bloque asignado.
            </p>
            <div className="space-y-2">
              {unassigned.map((it) => (
                <PlayerRoutineItemCard
                  key={it.id}
                  item={it}
                  onShowVideo={setVideoPreview}
                />
              ))}
            </div>
          </section>
        )}
      </div>

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
