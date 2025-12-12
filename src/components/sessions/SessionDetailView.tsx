"use client";

import React from "react";
import { type SessionDTO } from "@/lib/api/sessions";
import type { RoutineSummary } from "@/lib/sessions/routineSummary";
import type { SessionRoutineSnapshot } from "@/lib/sessions/sessionRoutineSnapshot";

export type SessionDetailExercise = {
  title: string;
  kind: string;
  space: string;
  players: string;
  duration: string;
  description: string;
  imageUrl: string;
  routineId?: string;
  routineName?: string;
  isRoutineOnly?: boolean;
};

export type SessionDetailViewProps = {
  session: SessionDTO;
  exercises: SessionDetailExercise[];
  markerRow: string;
  markerTurn: string;
  markerYmd: string;
  isViewMode: boolean;
  mode: "ct" | "player";
  routineSummaries?: Record<string, RoutineSummary>;
  routineSnapshot?: SessionRoutineSnapshot | null;
  onSaveAll?: () => void;
  saving?: boolean;
  editing: boolean;
  setEditing?: (value: boolean) => void;
  roCls: string;
  // CT-only props: opcionales para permitir modo jugador read-only
  updateExercise?: (idx: number, patch: Partial<SessionDetailExercise>) => void;
  addExercise?: () => void;
  removeExercise?: (idx: number) => void;
  isVideoUrl?: (url: string | undefined | null) => boolean;
  openLibraryPicker?: (idxOrEx: any) => void;
  pickerIndex?: number | null;
  loadingPicker?: boolean;
  pickerExercises?: any[];
  visiblePickerExercises?: any[];
  pickerSearch?: string;
  setPickerSearch?: (value: string) => void;
  setPickerIndex?: (value: number | null) => void;
};

function RoutineInlineView({
  summary,
  snapshotItems,
  mode,
}: {
  summary: RoutineSummary | null;
  snapshotItems?: {
    id: string;
    blockName: string | null;
    blockType: string | null;
    title: string;
    sets: number | null;
    reps: number | null;
    load: string | null;
    tempo: string | null;
    rest: string | null;
    notes: string | null;
    athleteNotes: string | null;
    order: number;
  }[] | null;
  mode: "ct" | "player";
}) {
  const showCtNotes = mode === "ct";

  const itemsByBlock: Array<{
    id: string;
    name: string;
    type: string | null;
    description: string | null;
    items: {
      id: string;
      title: string;
      sets: number | null;
      reps: number | null;
      load: string | null;
      tempo: string | null;
      rest: string | null;
      notes: string | null;
      athleteNotes: string | null;
    }[];
  }> = [];

  if (snapshotItems && snapshotItems.length > 0) {
    const grouped: Record<string, (typeof itemsByBlock)[number]> = {};
    snapshotItems.forEach((it) => {
      const key = `${it.blockName ?? ""}::${it.blockType ?? ""}`;
      if (!grouped[key]) {
        grouped[key] = {
          id: key,
          name: it.blockName ?? "Bloque",
          type: it.blockType ?? null,
          description: null,
          items: [],
        };
      }
      grouped[key].items.push({
        id: it.id,
        title: it.title,
        sets: it.sets,
        reps: it.reps,
        load: it.load,
        tempo: it.tempo,
        rest: it.rest,
        notes: it.notes,
        athleteNotes: it.athleteNotes,
      });
    });
    itemsByBlock.push(...Object.values(grouped));
  } else if (summary) {
    summary.blocks.forEach((b) => {
      itemsByBlock.push({
        id: b.id,
        name: b.name,
        type: b.type ?? null,
        description: b.description ?? null,
        items: b.items.map((it) => ({
          id: it.id,
          title: it.title,
          sets: it.sets,
          reps: it.reps,
          load: it.load,
          tempo: it.tempo,
          rest: it.rest,
          notes: it.notes,
          athleteNotes: it.athleteNotes,
        })),
      });
    });
  }

  return (
    <div className="mt-2 rounded-xl bg-gray-50 border border-dashed border-gray-200 p-3 space-y-2">
      {summary && (
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold text-gray-700">
              Rutina: {summary.title}
            </p>
            {summary.goal && (
              <p className="text-[10px] text-gray-500 line-clamp-2">
                Objetivo: {summary.goal}
              </p>
            )}
          </div>
        </div>
      )}

      {itemsByBlock.map((b) => (
        <div key={b.id} className="mt-2 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-gray-800">
              {b.name}
              {b.type ? ` · ${b.type}` : ""}
            </p>
            {b.description && (
              <p className="text-[10px] text-gray-500 line-clamp-1">
                {b.description}
              </p>
            )}
          </div>

          {b.items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-[10px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-100">
                    <th className="px-2 py-1 text-left font-semibold text-gray-600">
                      Ejercicio
                    </th>
                    <th className="px-2 py-1 text-left font-semibold text-gray-600">
                      Series
                    </th>
                    <th className="px-2 py-1 text-left font-semibold text-gray-600">
                      Reps
                    </th>
                    <th className="px-2 py-1 text-left font-semibold text-gray-600">
                      Carga
                    </th>
                    <th className="px-2 py-1 text-left font-semibold text-gray-600">
                      Tempo
                    </th>
                    <th className="px-2 py-1 text-left font-semibold text-gray-600">
                      Descanso
                    </th>
                    {showCtNotes && (
                      <th className="px-2 py-1 text-left font-semibold text-gray-600">
                        Notas CT
                      </th>
                    )}
                    <th className="px-2 py-1 text-left font-semibold text-gray-600">
                      Notas jugador
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {b.items.map((it) => {
                    const noteToShow =
                      mode === "player"
                        ? it.athleteNotes ?? it.notes
                        : it.notes;
                    const athleteNote = it.athleteNotes ?? null;
                    return (
                      <tr key={it.id} className="border-b border-gray-100">
                        <td className="px-2 py-1 text-gray-800">{it.title}</td>
                        <td className="px-2 py-1 text-gray-700">
                          {it.sets ?? "-"}
                        </td>
                        <td className="px-2 py-1 text-gray-700">
                          {it.reps ?? "-"}
                        </td>
                        <td className="px-2 py-1 text-gray-700">
                          {it.load ?? "-"}
                        </td>
                        <td className="px-2 py-1 text-gray-700">
                          {it.tempo ?? "-"}
                        </td>
                        <td className="px-2 py-1 text-gray-700">
                          {it.rest ?? "-"}
                        </td>
                        {showCtNotes && (
                          <td className="px-2 py-1 text-gray-700 max-w-[160px] whitespace-pre-line">
                            {noteToShow ?? "-"}
                          </td>
                        )}
                        <td className="px-2 py-1 text-gray-700 max-w-[160px] whitespace-pre-line">
                          {athleteNote ?? "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function SessionDetailView({
  session: s,
  exercises,
  markerRow,
  markerTurn,
  markerYmd,
  isViewMode,
  mode,
  routineSummaries,
  routineSnapshot,
  onSaveAll,
  saving = false,
  editing,
  setEditing,
  roCls,
  updateExercise,
  addExercise,
  removeExercise,
  isVideoUrl,
  openLibraryPicker,
  pickerIndex,
  loadingPicker,
  pickerExercises,
  visiblePickerExercises,
  pickerSearch,
  setPickerSearch,
  setPickerIndex,
}: SessionDetailViewProps) {
  const displayRow = (markerRow || "").replace("ENTREN0", "ENTRENO");

  return (
    <div id="print-root" className="p-4 md:p-6 space-y-4 print:!p-2">
      {/* Header */}
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between print:hidden">
        <div>
          <h1 className="text-lg md:text-xl font-bold">
            Sesión: {displayRow || "Bloque"} · {"(" + (markerTurn === "morning" ? "Mañana" : markerTurn === "afternoon" ? "Tarde" : "—") + ")"}
          </h1>
          <p className="text-xs md:text-sm text-gray-500">
            Día: {markerYmd || "—"} · Tipo: {s.type}
          </p>
        </div>

        {mode === "ct" && (
          <div className="flex items-center gap-2">
            {markerYmd && markerTurn && (
              <a
                href={`/ct/sessions/by-day/${markerYmd}/${markerTurn}?focus=${encodeURIComponent(
                  markerRow || ""
                )}`}
                className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs"
              >
                ← Volver a sesión
              </a>
            )}
            <a href="/ct/dashboard" className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">
              Dashboard
            </a>
            {editing ? (
              <button
                onClick={onSaveAll}
                disabled={saving}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-white bg-gray-900 hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            ) : (
              setEditing && (
                <button
                  onClick={() => setEditing(true)}
                  className="px-3 py-1.5 rounded-xl border text-xs hover:bg-gray-50"
                >
                  ✏️ Editar
                </button>
              )
            )}
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl border text-xs hover:bg-gray-50"
              title="Imprimir"
            >
              🖨️ Imprimir
            </button>
          </div>
        )}
      </header>

      {/* Lista de ejercicios de la sesión (campo) */}
      {exercises.length > 0 && (
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
                {mode === "ct" && editing && !isViewMode && removeExercise && (
                  <button
                    type="button"
                    onClick={() => removeExercise(idx)}
                    className="ml-2 text-[11px] rounded-lg border px-2 py-0.5 hover:bg-gray-50"
                  >
                    Eliminar
                  </button>
                )}
              </div>

              <div className="p-3 grid md:grid-cols-2 gap-3">
                {mode === "ct" && editing && !isViewMode && openLibraryPicker && (
                  <div className="md:col-span-2 mb-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <button
                        type="button"
                        className="text-[11px] text-blue-600 hover:underline"
                        onClick={() => openLibraryPicker(idx)}
                      >
                        Usar ejercicio de biblioteca
                      </button>
                    </div>
                  </div>
                )}
                <>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[11px] text-gray-500">Título del ejercicio</label>
                    <input
                      className="w-full rounded-md border px-2 py-1.5 text-sm"
                      value={ex.title || ""}
                      onChange={(e) => {
                        if (!editing || isViewMode || mode !== "ct") return;
                        updateExercise && updateExercise(idx, { title: e.target.value });
                      }}
                      placeholder="Ej: Activación con balón 6v6"
                      disabled={!editing || isViewMode || mode !== "ct"}
                    />
                  </div>

                  {/* Tipo de ejercicio (desplegable persistente) */}
                  <div className="space-y-2">
                    <label className="text-[11px] text-gray-500">Tipo de ejercicio</label>
                    <div className="flex items-center gap-1">
                      <input
                        className={`w-full rounded-md border px-2 py-1.5 text-sm ${roCls}`}
                        value={ex.kind}
                        onChange={(e) => {
                          if (!editing || isViewMode || mode !== "ct") return;
                          updateExercise && updateExercise(idx, { kind: e.target.value });
                        }}
                        placeholder="Ej: Juego reducido MSG"
                        disabled={!editing || isViewMode || mode !== "ct"}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] text-gray-500">Espacio</label>
                    <input
                      className={`w-full rounded-md border px-2 py-1.5 text-sm ${roCls}`}
                      value={ex.space}
                      onChange={(e) => {
                        if (!editing || isViewMode || mode !== "ct") return;
                        updateExercise && updateExercise(idx, { space: e.target.value });
                      }}
                      placeholder="Mitad de cancha"
                      disabled={!editing || isViewMode || mode !== "ct"}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] text-gray-500">N° de jugadores</label>
                    <input
                      className={`w-full rounded-md border px-2 py-1.5 text-sm ${roCls}`}
                      value={ex.players}
                      onChange={(e) => {
                        if (!editing || isViewMode || mode !== "ct") return;
                        updateExercise && updateExercise(idx, { players: e.target.value });
                      }}
                      placeholder="22 jugadores"
                      disabled={!editing || isViewMode || mode !== "ct"}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] text-gray-500">Duración</label>
                    <input
                      className={`w-full rounded-md border px-2 py-1.5 text-sm ${roCls}`}
                      value={ex.duration}
                      onChange={(e) => {
                        if (!editing || isViewMode || mode !== "ct") return;
                        updateExercise && updateExercise(idx, { duration: e.target.value });
                      }}
                      placeholder="10 minutos"
                      disabled={!editing || isViewMode || mode !== "ct"}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[11px] text-gray-500">Descripción</label>
                    <textarea
                      className={`w-full rounded-md border px-2 py-1.5 text-sm min-h-[120px] ${roCls}`}
                      value={ex.description}
                      onChange={(e) => {
                        if (!editing || isViewMode || mode !== "ct") return;
                        updateExercise && updateExercise(idx, { description: e.target.value });
                      }}
                      placeholder="Consignas, series, repeticiones, variantes..."
                      disabled={!editing || isViewMode || mode !== "ct"}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center justify-between print:hidden">
                      <label className="text-[11px] text-gray-500">Imagen / video (URL)</label>
                      {!editing && mode === "ct" && (
                        <span className="text-[10px] text-gray-400">Bloqueado</span>
                      )}
                    </div>
                    {mode === "ct" && (
                      <input
                        className={`w-full rounded-md border px-2 py-1.5 text-sm print:hidden ${roCls}`}
                        value={ex.imageUrl}
                        onChange={(e) => {
                          if (!editing || isViewMode || mode !== "ct") return;
                          updateExercise && updateExercise(idx, { imageUrl: e.target.value });
                        }}
                        placeholder="https://..."
                        disabled={!editing || isViewMode || mode !== "ct"}
                      />
                    )}
                    {ex.imageUrl ? (
                      <div className="mt-2">
                        {isVideoUrl && isVideoUrl(ex.imageUrl) ? (
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
                  {ex.routineId && routineSummaries?.[ex.routineId] && (
                    <div className="md:col-span-2 mt-3 border-t pt-2">
                      <RoutineInlineView
                        summary={routineSummaries[ex.routineId]}
                        snapshotItems={
                          routineSnapshot?.itemsByRoutine?.[ex.routineId]
                            ?.items ?? null
                        }
                        mode={mode}
                      />
                    </div>
                  )}
                </>
              </div>
            </section>
          ))}

          {mode === "ct" && editing && !isViewMode && (
            <div className="print:hidden">
              <button
                type="button"
                onClick={addExercise}
                className="rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50"
              >
                + Agregar ejercicio
              </button>
            </div>
          )}
        </div>
      )}

  {mode === "ct" && pickerIndex !== null && setPickerIndex && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold">Elegir ejercicio de biblioteca</h2>
              <button
                type="button"
                className="text-xs text-gray-500 hover:underline"
                onClick={() => setPickerIndex(null)}
              >
                Cerrar
              </button>
            </div>

            {!loadingPicker && pickerExercises && pickerExercises.length > 0 && (
              <div className="mb-2">
                <input
                  type="text"
                  className="w-full rounded-md border px-2 py-1.5 text-xs"
                  placeholder="Buscar por nombre..."
                  value={pickerSearch || ""}
                  onChange={(e) => setPickerSearch && setPickerSearch(e.target.value)}
                />
              </div>
            )}

            {loadingPicker ? (
              <p className="text-xs text-gray-500">Cargando ejercicios...</p>
            ) : !pickerExercises || pickerExercises.length === 0 ? (
              <p className="text-xs text-gray-500">
                No hay ejercicios en la biblioteca de Sesiones / Campo.
              </p>
            ) : !visiblePickerExercises || visiblePickerExercises.length === 0 ? (
              <p className="text-xs text-gray-500">
                No hay ejercicios que coincidan con la búsqueda.
              </p>
            ) : (
              <ul className="max-h-64 overflow-auto divide-y divide-gray-100">
                {visiblePickerExercises?.map((exLib) => (
                  <li key={exLib.id} className="py-1.5 text-xs">
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => openLibraryPicker && openLibraryPicker(exLib)}
                    >
                      <p className="font-medium text-gray-900">{exLib.name}</p>
                      {exLib.sessionMeta?.type && (
                        <p className="text-[11px] text-gray-500">
                          Tipo: {exLib.sessionMeta.type}
                        </p>
                      )}
                      {exLib.sessionMeta?.description && (
                        <p className="text-[11px] text-gray-500 line-clamp-2">
                          {exLib.sessionMeta.description}
                        </p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
