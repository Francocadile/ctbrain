"use client";

import React from "react";
import { ExerciseSectionCard } from "./ExerciseSectionCard";
import { type SessionDTO } from "@/lib/api/sessions";
import type { RoutineSummary } from "@/lib/sessions/routineSummary";
import type { SessionRoutineSnapshot } from "@/lib/sessions/sessionRoutineSnapshot";
import type { FieldDiagramState } from "@/lib/sessions/fieldDiagram";

export type SessionDetailExercise = {
  title: string;
  kind: string;
  space: string;
  players: string;
  duration: string;
  description: string;
  imageUrl: string;
  material?: string;
  diagram?: FieldDiagramState;
  routineId?: string;
  routineName?: string;
  isRoutineOnly?: boolean;
};

export type SessionDetailViewProps = {
  session: SessionDTO;
  exercises: SessionDetailExercise[];
  markerRow?: string | null;
  markerTurn?: string | null;
  markerYmd?: string | null;
  isViewMode?: boolean;
  mode: "ct" | "player";
  routineSummaries?: Record<string, RoutineSummary>;
  routineSnapshot?: SessionRoutineSnapshot | null;
  onSaveAll?: () => void;
  saving?: boolean;
  editing?: boolean;
  setEditing?: (value: boolean) => void;
  roCls: string;
  updateExercise?: (
    index: number,
    patch: Partial<SessionDetailExercise>,
  ) => void;
  addExercise?: () => void;
  removeExercise?: (index: number) => void;
  isVideoUrl?: (url?: string | null) => boolean;
  openLibraryPicker?: (...args: any[]) => void;
  pickerIndex?: number | null;
  loadingPicker?: boolean;
  pickerExercises?: any[];
  visiblePickerExercises?: any[];
  pickerSearch?: string;
  setPickerSearch?: (value: string) => void;
  setPickerIndex?: (value: number | null) => void;
};

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
  const ro = isViewMode || !editing || mode !== "ct";

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
          {exercises.map((ex, idx) => {
            const routineSummary = routineSummaries?.[ex.routineId ?? ""];
            const snapshotItems =
              routineSnapshot?.itemsByRoutine?.[ex.routineId ?? ""]?.items ??
              null;

            const routineNode = routineSummary ? (
              <div className="mt-2 border-t pt-2">
                <RoutineInlineView
                  summary={routineSummary}
                  snapshotItems={snapshotItems}
                  mode={mode}
                />
              </div>
            ) : null;

            return (
              <ExerciseSectionCard
                key={idx}
                index={idx}
                sessionId={s.id}
                exerciseIndex={idx}
                exercise={ex}
                readOnly={ro}
                onChange={(patch) => {
                  if (ro || !updateExercise) return;
                  updateExercise(idx, patch);
                }}
                onDelete={
                  ro || !removeExercise
                    ? undefined
                    : () => removeExercise(idx)
                }
                onOpenLibraryPicker={
                  mode === "ct" && !ro && openLibraryPicker
                    ? () => openLibraryPicker(idx)
                    : undefined
                }
                showLibraryPickerButton={mode === "ct" && !ro}
                isVideoUrl={isVideoUrl}
                routineNode={routineNode}
              />
            );
          })}

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

type RoutineInlineViewProps = {
  summary: RoutineSummary;
  snapshotItems: any[] | null;
  mode: "ct" | "player";
};

function RoutineInlineView({
  summary,
  snapshotItems,
  mode,
}: RoutineInlineViewProps) {
  const showCtNotes = mode === "ct";

  if (!snapshotItems || snapshotItems.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
        <div>
          <p className="font-semibold text-slate-800">
            Rutina: {summary.title}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-slate-100 text-slate-600">
              <th className="px-2 py-1 text-left font-medium">Ejercicio</th>
              <th className="px-2 py-1 text-left font-medium">Series</th>
              <th className="px-2 py-1 text-left font-medium">Reps</th>
              <th className="px-2 py-1 text-left font-medium">Carga</th>
              <th className="px-2 py-1 text-left font-medium">Tempo</th>
              <th className="px-2 py-1 text-left font-medium">Pausa</th>
              {showCtNotes && (
                <th className="px-2 py-1 text-left font-medium">Notas CT</th>
              )}
              <th className="px-2 py-1 text-left font-medium">Notas atleta</th>
            </tr>
          </thead>
          <tbody>
            {snapshotItems.map((it: any) => {
              const noteToShow = it.coachNote ?? it.note ?? null;
              const athleteNote = it.athleteNote ?? null;

              return (
                <tr key={it.id ?? it.name} className="border-t">
                  <td className="px-2 py-1 text-slate-800 max-w-[200px] truncate">
                    {it.name ?? "—"}
                  </td>
                  <td className="px-2 py-1 text-slate-700">{it.sets ?? "-"}</td>
                  <td className="px-2 py-1 text-slate-700">{it.reps ?? "-"}</td>
                  <td className="px-2 py-1 text-slate-700">{it.load ?? "-"}</td>
                  <td className="px-2 py-1 text-slate-700">{it.tempo ?? "-"}</td>
                  <td className="px-2 py-1 text-slate-700">{it.rest ?? "-"}</td>
                  {showCtNotes && (
                    <td className="px-2 py-1 text-slate-700 max-w-[160px] whitespace-pre-line">
                      {noteToShow ?? "-"}
                    </td>
                  )}
                  <td className="px-2 py-1 text-slate-700 max-w-[160px] whitespace-pre-line">
                    {athleteNote ?? "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
