"use client";

import type { FocusEvent } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import VideoPlayerModal from "@/components/training/VideoPlayerModal";

type RoutineHeaderDTO = {
  id: string;
  title: string;
  description: string | null;
  goal: string | null;
  visibility: "STAFF_ONLY" | "PLAYER_VISIBLE" | null;
  notesForAthlete: string | null;
  shareMode: "STAFF_ONLY" | "ALL_PLAYERS" | "SELECTED_PLAYERS";
  createdAt: string;
  updatedAt: string;
};

type RoutineBlockDTO = {
  id: string;
  name: string;
  order: number;
  description: string | null;
  type?: "WARMUP" | "MAIN" | "COOLDOWN" | "ACCESSORY" | null;
};

type RoutineItemDTO = {
  id: string;
  routineId: string;
  blockId: string | null;
  title: string;
  description: string | null;
  order: number;
  exerciseName: string | null;
  exerciseId: string | null;
  sets: number | null;
  reps: number | null;
  load: string | null;
  tempo: string | null;
  rest: string | null;
  notes: string | null;
  athleteNotes: string | null;
  videoUrl: string | null;
};

type SessionListDTO = {
  id: string;
  title: string;
  date: string | Date;
  type?: string | null;
  description?: string | null;
};

type ExerciseDTO = {
  id: string;
  name: string;
  zone: string | null;
  videoUrl: string | null;
  usage?: "ROUTINE" | "SESSION" | null;
};

type PlayerDTO = {
  id: string;
  name: string | null;
  email: string | null;
};

function getItemDisplayName(item: RoutineItemDTO): string {
  return item.exerciseName || item.title || "Ejercicio sin nombre";
}

async function patchJSON(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
}

async function postJSON(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
}

async function deleteJSON(url: string) {
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

type Props = {
  routine: RoutineHeaderDTO;
  blocks: RoutineBlockDTO[];
  items: RoutineItemDTO[];
  sharedPlayerIds: string[];
};

export function RoutineDetailClient({ routine, blocks, items, sharedPlayerIds }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isViewMode = searchParams?.get("view") === "1";
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [header, setHeader] = useState<RoutineHeaderDTO>(routine);
  const [localBlocks, setLocalBlocks] = useState<RoutineBlockDTO[]>(blocks);
  const [localItems, setLocalItems] = useState<RoutineItemDTO[]>(items);

  const [sessions, setSessions] = useState<SessionListDTO[]>([]);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);

  const [exercises, setExercises] = useState<ExerciseDTO[]>([]);
  const [players, setPlayers] = useState<PlayerDTO[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(sharedPlayerIds || []);

  // NUEVO ESTADO: selección y preview
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [quickPreviewExercise, setQuickPreviewExercise] = useState<ExerciseDTO | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    setLocalBlocks(blocks);
  }, [blocks]);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  // cargar asignaciones de sesiones iniciales + ejercicios + jugadores
  useEffect(() => {
    (async () => {
      try {
        const sessionsResp = await getJSON<{ data: SessionListDTO[] }>("/api/sessions");
        setSessions(sessionsResp.data || []);

        const linkResp = await getJSON<{ sessionIds: string[] }>(
          `/api/ct/routines/${routine.id}/sessions`,
        );
        setSelectedSessionIds(linkResp.sessionIds || []);

        const exercisesResp = await getJSON<{ data: ExerciseDTO[] }>(
          "/api/ct/exercises?usage=ROUTINE",
        );
        setExercises(exercisesResp.data || []);

        const playersResp = await getJSON<{ data: PlayerDTO[] }>("/api/ct/team/players");
        setPlayers(playersResp.data || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [routine.id]);

  function handleFieldChange<K extends keyof RoutineHeaderDTO>(key: K, value: RoutineHeaderDTO[K]) {
    setHeader((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveHeader() {
    setError(null);
    try {
      await patchJSON(`/api/ct/routines/${header.id}`, {
        title: header.title,
        description: header.description,
        goal: header.goal,
        visibility: header.visibility,
        notesForAthlete: header.notesForAthlete,
      });
      startTransition(() => {
        router.refresh();
      });
    } catch (e: any) {
      setError(e?.message || "No se pudo actualizar la cabecera");
    }
  }

  async function handleDeleteRoutine() {
    setError(null);
    const confirmed = window.confirm(
      "Esta acción eliminará la rutina y todos sus ejercicios. ¿Continuar?",
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/ct/routines/${header.id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error(await res.text());
      }

      startTransition(() => {
        router.push("/ct/rutinas");
        router.refresh();
      });
    } catch (e) {
      console.error(e);
      setError("No se pudo eliminar la rutina");
    }
  }

  async function handleAddBlock() {
    setError(null);
    try {
      const blockIndex = localBlocks.length;
      const letter = String.fromCharCode(65 + blockIndex);
      const defaultName = `Bloque ${letter}`;

      await postJSON(`/api/ct/routines/${header.id}/blocks`, { name: defaultName });
    } catch (e) {
      console.error(e);
      setError("No se pudo crear el bloque");
    } finally {
      startTransition(() => router.refresh());
    }
  }

  function handleAddItem(blockId: string) {
    setSelectedBlockId(blockId);
    setSelectedItemId(null);
  }

  const { byBlock, unassigned } = useMemo(() => {
    const grouped: Record<string, RoutineItemDTO[]> = {};
    const unassignedItems: RoutineItemDTO[] = [];
    for (const it of localItems) {
      if (it.blockId) {
        if (!grouped[it.blockId]) grouped[it.blockId] = [];
        grouped[it.blockId].push(it);
      } else {
        unassignedItems.push(it);
      }
    }
    return { byBlock: grouped, unassigned: unassignedItems };
  }, [localItems]);

  function toggleSession(id: string) {
    setSelectedSessionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSaveSessions() {
    setError(null);
    try {
      await fetch(`/api/ct/routines/${header.id}/sessions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionIds: selectedSessionIds }),
      });
    } catch (e: any) {
      setError(e?.message || "No se pudo actualizar la asignación de sesiones");
    }
  }

  const handleShareModeChange = async (
    value: "STAFF_ONLY" | "ALL_PLAYERS" | "SELECTED_PLAYERS",
  ) => {
    setHeader((prev) => ({ ...prev, shareMode: value }));
    try {
      await patchJSON(`/api/ct/routines/${header.id}`, {
        shareMode: value,
        playerIds: value === "SELECTED_PLAYERS" ? selectedPlayerIds : [],
      });
      startTransition(() => router.refresh());
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "No se pudo actualizar la visibilidad");
    }
  };

  const togglePlayer = async (playerId: string) => {
    const checked = selectedPlayerIds.includes(playerId);
    const next = checked
      ? selectedPlayerIds.filter((id) => id !== playerId)
      : [...selectedPlayerIds, playerId];
    setSelectedPlayerIds(next);
    try {
      await patchJSON(`/api/ct/routines/${header.id}`, {
        shareMode: "SELECTED_PLAYERS",
        playerIds: next,
      });
      startTransition(() => router.refresh());
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "No se pudo actualizar los jugadores compartidos");
    }
  };

  async function handleRenameBlock(b: RoutineBlockDTO, name: string) {
    const trimmed = name.trim();

    if (!trimmed) {
      setLocalBlocks((prev) =>
        prev.map((blk) => (blk.id === b.id ? { ...blk, name: b.name } : blk)),
      );
      return;
    }

    try {
      await patchJSON(`/api/ct/routines/blocks/${b.id}`, { name: trimmed });
      startTransition(() => router.refresh());
    } catch (err) {
      console.error(err);
      setError("No se pudo renombrar el bloque");
      setLocalBlocks((prev) =>
        prev.map((blk) => (blk.id === b.id ? { ...blk, name: b.name } : blk)),
      );
    }
  }

  function handleRenameBlockLocal(blockId: string, name: string) {
    setLocalBlocks((prev) =>
      prev.map((blk) => (blk.id === blockId ? { ...blk, name } : blk)),
    );
  }

  async function handleChangeBlockType(
    blockId: string,
    type: "WARMUP" | "MAIN" | "COOLDOWN" | "ACCESSORY" | null,
  ) {
    setError(null);

    const payload: { type: string | null } = {
      type: type ?? null,
    };

    // Actualizamos optimistamente en local
    setLocalBlocks((prev) =>
      prev.map((blk) => (blk.id === blockId ? { ...blk, type } : blk)),
    );

    try {
      await patchJSON(`/api/ct/routines/blocks/${blockId}`, payload);
      startTransition(() => router.refresh());
    } catch (err) {
      console.error(err);
      setError("No se pudo actualizar el tipo de bloque");
    }
  }

  // Item seleccionado derivado del estado
  const selectedItem: RoutineItemDTO | null =
    selectedItemId ? localItems.find((it) => it.id === selectedItemId) ?? null : null;

  // Helpers para actualizar localItems sin tocar inmediatamente backend
  function updateLocalItem(itemId: string, partial: Partial<RoutineItemDTO>) {
    setLocalItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, ...partial } : it)));
  }

  async function saveItemField(
    itemId: string,
    field: keyof RoutineItemDTO,
    value: unknown,
  ): Promise<void> {
    setError(null);
    try {
      await patchJSON(`/api/ct/routines/items/${itemId}`, { [field]: value });
      startTransition(() => router.refresh());
    } catch (err) {
      console.error(err);
      setError("No se pudo actualizar el ejercicio");
    }
  }

  async function deleteItem(itemId: string): Promise<void> {
    setError(null);
    try {
      await deleteJSON(`/api/ct/routines/items/${itemId}`);
      startTransition(() => router.refresh());
    } catch (err) {
      console.error(err);
      setError("No se pudo borrar el ejercicio");
    }
  }

  async function duplicateItem(itemId: string): Promise<void> {
    const base = localItems.find((it) => it.id === itemId);
    if (!base) return;
    setError(null);
    try {
      const itemsInBlock = localItems.filter((it) => it.blockId === base.blockId);
      const nextOrder =
        itemsInBlock.length > 0 ? Math.max(...itemsInBlock.map((it) => it.order)) + 1 : 1;

      await postJSON(`/api/ct/routines/${header.id}/items`, {
        title: base.title,
        description: base.description,
        blockId: base.blockId,
        exerciseId: base.exerciseId,
        exerciseName: base.exerciseName,
        order: nextOrder,
        sets: base.sets,
        reps: base.reps,
        load: base.load,
        tempo: base.tempo,
        rest: base.rest,
        notes: base.notes,
        athleteNotes: base.athleteNotes,
        videoUrl: base.videoUrl,
      });
    } catch (err) {
      console.error(err);
      setError("No se pudo duplicar el ejercicio");
    } finally {
      startTransition(() => router.refresh());
    }
  }

  async function moveItemToBlock(itemId: string, blockId: string): Promise<void> {
    setError(null);
    try {
      await patchJSON(`/api/ct/routines/items/${itemId}`, { blockId });
      startTransition(() => router.refresh());
    } catch (err) {
      console.error(err);
      setError("No se pudo mover el ejercicio de bloque");
    }
  }

  async function selectExerciseForItem(exercise: ExerciseDTO) {
    if (!selectedItemId) return;
    const item = localItems.find((it) => it.id === selectedItemId);
    if (!item) return;

    try {
      await patchJSON(`/api/ct/routines/items/${item.id}`, {
        exerciseId: exercise.id,
        exerciseName: exercise.name ?? item.exerciseName ?? null,
        videoUrl: exercise.videoUrl ?? item.videoUrl ?? null,
      });
      startTransition(() => router.refresh());
    } catch (err) {
      console.error(err);
      setError("No se pudo actualizar el ejercicio");
    }
  }

  async function addExerciseToRoutine(exercise: ExerciseDTO) {
    if (!selectedBlockId) {
      setError("Seleccioná primero un bloque en la columna izquierda");
      return;
    }
    setError(null);
    try {
      const itemsInBlock = localItems.filter((it) => it.blockId === selectedBlockId);
      const nextOrder =
        itemsInBlock.length > 0 ? Math.max(...itemsInBlock.map((it) => it.order)) + 1 : 1;

      await postJSON(`/api/ct/routines/${header.id}/items`, {
        title: exercise.name,
        description: "",
        blockId: selectedBlockId,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        order: nextOrder,
        videoUrl: exercise.videoUrl ?? null,
      });
    } catch (err) {
      console.error(err);
      setError("No se pudo agregar el ejercicio a la rutina");
    } finally {
      startTransition(() => router.refresh());
    }
  }

  async function addPreviewExerciseToRoutine() {
    if (!quickPreviewExercise || !selectedBlockId) return;
    await addExerciseToRoutine(quickPreviewExercise);
    setIsPreviewOpen(false);
  }

  function handleSelectItem(blockId: string | null, itemId: string | null) {
    setSelectedBlockId(blockId);
    setSelectedItemId(itemId);
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Flecha volver */}
      {!isViewMode && (
        <div className="mb-1">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
            onClick={() => router.push("/ct/rutinas")}
          >
            <span className="text-lg">←</span>
            <span>Volver a rutinas</span>
          </button>
        </div>
      )}

      {/* Cabecera simplificada */}
      <section className="mb-4 rounded-2xl border bg-white p-4 shadow-sm space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Nombre de la rutina</label>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={header.title}
              onChange={(e) => handleFieldChange("title", e.target.value)}
              placeholder="Ej: Fuerza general, Activación, Gimnasio..."
              disabled={isViewMode}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Objetivo</label>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={header.goal ?? ""}
              onChange={(e) => handleFieldChange("goal", e.target.value || null)}
              placeholder="Ej: Activación + fuerza general"
              disabled={isViewMode}
            />
          </div>
        </div>
      </section>

      {/* Visibilidad para jugadores */}
  <section className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Visibilidad para jugadores</h2>
        </div>

        <div className="space-y-2">
          <select
            className="w-full rounded-md border px-3 py-1.5 text-sm bg-white"
            value={header.shareMode}
            onChange={(e) =>
              handleShareModeChange(
                e.target.value as "STAFF_ONLY" | "ALL_PLAYERS" | "SELECTED_PLAYERS",
              )
            }
            disabled={isViewMode}
          >
            <option value="STAFF_ONLY">Solo staff</option>
            <option value="ALL_PLAYERS">Todos los jugadores del equipo</option>
            <option value="SELECTED_PLAYERS">Jugadores específicos</option>
          </select>
        </div>

        {header.shareMode === "SELECTED_PLAYERS" && !isViewMode && (
          <div className="space-y-2">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-600">Visibilidad:</span>
              <button
                type="button"
                className="rounded-full border px-2.5 py-1 text-[11px] hover:bg-gray-50"
                onClick={async () => {
                  const allIds = players.map((p) => p.id);
                  setSelectedPlayerIds(allIds);
                  try {
                    await patchJSON(`/api/ct/routines/${header.id}`, {
                      shareMode: "SELECTED_PLAYERS",
                      playerIds: allIds,
                    });
                    startTransition(() => router.refresh());
                  } catch (err: any) {
                    console.error(err);
                    setError(err?.message || "No se pudo actualizar los jugadores compartidos");
                  }
                }}
              >
                Visible para todos
              </button>
              <button
                type="button"
                className="rounded-full border px-2.5 py-1 text-[11px] hover:bg-gray-50"
                onClick={async () => {
                  setSelectedPlayerIds([]);
                  try {
                    await patchJSON(`/api/ct/routines/${header.id}`, {
                      shareMode: "SELECTED_PLAYERS",
                      playerIds: [],
                    });
                    startTransition(() => router.refresh());
                  } catch (err: any) {
                    console.error(err);
                    setError(err?.message || "No se pudo actualizar los jugadores compartidos");
                  }
                }}
              >
                Elegir jugadores
              </button>
            </div>

            <p className="text-[11px] text-gray-500">Elegí los jugadores que verán esta rutina:</p>
            <div className="max-h-52 overflow-auto border rounded-md p-2 space-y-1 text-xs">
              {players.length === 0 ? (
                <p className="text-[11px] text-gray-400">No hay jugadores en este equipo.</p>
              ) : (
                players.map((p) => {
                  const checked = selectedPlayerIds.includes(p.id);
                  const label = p.name || p.email || "(Sin nombre)";
                  return (
                    <label key={p.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-3 w-3 rounded border-gray-300"
                        checked={checked}
                        onChange={() => togglePlayer(p.id)}
                        disabled={isViewMode}
                      />
                      <span className="truncate">{label}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}
      </section>

      {/* Bloques e items – nuevo layout 3 columnas */}
      <section className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Bloques y ejercicios</h2>
          {!isViewMode && (
            <button
              type="button"
              className="text-xs rounded-md border px-3 py-1 hover:bg-gray-50"
              onClick={handleAddBlock}
              disabled={isPending}
            >
              Agregar bloque
            </button>
          )}
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1.3fr)]">
          <RoutineStructurePanel
            header={header}
            blocks={localBlocks}
            byBlock={byBlock}
            selectedBlockId={selectedBlockId}
            selectedItemId={selectedItemId}
            onSelectItem={handleSelectItem}
            onAddBlock={handleAddBlock}
            onAddItem={handleAddItem}
            onBlockNameChangeLocal={handleRenameBlockLocal}
            onRenameBlock={handleRenameBlock}
            onChangeBlockType={handleChangeBlockType}
            readOnly={isViewMode}
          />

          {!isViewMode && (
            <ExerciseSelectorPanel
              exercises={exercises}
              selectedBlockId={selectedBlockId}
              selectedItemId={selectedItemId}
              onSelectForItem={selectExerciseForItem}
              onAddToRoutine={addExerciseToRoutine}
              onQuickPreview={(ex) => {
                setQuickPreviewExercise(ex);
                setIsPreviewOpen(true);
              }}
            />
          )}

          <RoutineItemEditor
            key={selectedItem?.id || "no-item"}
            item={selectedItem}
            blocks={localBlocks}
            onLocalChange={updateLocalItem}
            onSaveField={saveItemField}
            onDelete={deleteItem}
            onDuplicate={duplicateItem}
            onMoveToBlock={moveItemToBlock}
            onShowVideo={({ id, name, videoUrl }) => {
              if (!videoUrl) return;
              setQuickPreviewExercise({
                id,
                name,
                zone: null,
                videoUrl,
              });
              setIsPreviewOpen(true);
            }}
            readOnly={isViewMode}
          />
        </div>

        {/* Ejercicios sin bloque (unassigned) */}
        {unassigned.length > 0 && (
          <div className="border rounded-lg p-3 space-y-2 bg-white mt-4">
            <div className="text-sm font-semibold">Otros ejercicios (sin bloque)</div>
            <ul className="space-y-1">
              {unassigned.map((it) => (
                <li
                  key={it.id}
                  className="rounded-md border px-2 py-1 text-xs cursor-pointer hover:bg-gray-50"
                  onClick={() => {
                    setSelectedBlockId(null);
                    setSelectedItemId(it.id);
                  }}
                >
                  #{it.order} · {it.title}
                </li>
              ))}
            </ul>
          </div>
        )}

        <VideoPlayerModal
          open={!!quickPreviewExercise}
          onClose={() => setQuickPreviewExercise(null)}
          title={quickPreviewExercise?.name ?? ""}
          zone={quickPreviewExercise?.zone ?? null}
          videoUrl={quickPreviewExercise?.videoUrl ?? null}
        />
      </section>

      {/* Botón de guardado principal al final de la página */}
      {!isViewMode && (
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => startTransition(() => void handleSaveHeader())}
            disabled={isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isPending ? "Guardando..." : "Guardar rutina"}
          </button>
        </div>
      )}

      {/* Asignación a sesiones (oculta por ahora) */}
      {false && (
        <section className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
          <header className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Asignar a sesiones</h2>
            <button
              type="button"
              className="text-xs rounded-md border px-3 py-1 hover:bg-gray-50"
              onClick={handleSaveSessions}
              disabled={isPending}
            >
              Guardar asignación
            </button>
          </header>
          {sessions.length === 0 ? (
            <p className="text-sm text-gray-500">No hay sesiones recientes para mostrar.</p>
          ) : (
            <ul className="max-h-64 overflow-auto space-y-1 text-xs">
              {sessions.map((s) => {
                const d = new Date(s.date);
                const label = `${d.toLocaleDateString()} — ${s.title || "(Sin nombre)"}`;
                const checked = selectedSessionIds.includes(s.id);
                return (
                  <li key={s.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-3 w-3 rounded border-gray-300"
                      checked={checked}
                      onChange={() => toggleSession(s.id)}
                    />
                    <span className="truncate">{label}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

/* ---------------------------
 * Sub-componentes internos
 * --------------------------*/

type RoutineStructurePanelProps = {
  header: RoutineHeaderDTO;
  blocks: RoutineBlockDTO[];
  byBlock: Record<string, RoutineItemDTO[]>;
  selectedBlockId: string | null;
  selectedItemId: string | null;
  onSelectItem: (blockId: string | null, itemId: string | null) => void;
  onAddBlock: () => void;
  onAddItem: (blockId: string) => void;
  onBlockNameChangeLocal: (blockId: string, name: string) => void;
  onRenameBlock: (b: RoutineBlockDTO, name: string) => Promise<void> | void;
  onChangeBlockType: (
    blockId: string,
    type: "WARMUP" | "MAIN" | "COOLDOWN" | "ACCESSORY" | null,
  ) => Promise<void> | void;
  readOnly?: boolean;
};

function RoutineStructurePanel({
  header,
  blocks,
  byBlock,
  selectedBlockId,
  selectedItemId,
  onSelectItem,
  onAddBlock,
  onAddItem,
  onBlockNameChangeLocal,
  onRenameBlock,
  onChangeBlockType,
  readOnly,
}: RoutineStructurePanelProps) {
  const BLOCK_COLORS = [
    "bg-emerald-700",
    "bg-sky-700",
    "bg-violet-700",
    "bg-amber-700",
    "bg-rose-700",
    "bg-slate-700",
  ];

  return (
    <section className="flex-1 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Estructura de la rutina
          </h3>
          <p className="text-sm font-medium text-gray-900">{header.title}</p>
          {header.goal && <p className="text-xs text-gray-500">{header.goal}</p>}
        </div>
        {!readOnly && (
          <button
            type="button"
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
            onClick={onAddBlock}
          >
            + Bloque
          </button>
        )}
      </div>

      <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
        {blocks.length === 0 && (
          <p className="text-[11px] text-gray-400">
            Todavía no hay bloques. Creá el primero.
          </p>
        )}

        {blocks.map((block) => {
          const blockIndex = blocks.findIndex((b) => b.id === block.id);
          const letter = String.fromCharCode(65 + blockIndex);
          const colorClass = BLOCK_COLORS[blockIndex % BLOCK_COLORS.length];
          const isBlockSelected = selectedBlockId === block.id;
          const items = byBlock[block.id] || [];
          const derivedName =
            !block.name || block.name === "Bloque nuevo"
              ? `Bloque ${letter}`
              : block.name;

          const typeLabel: string =
            block.type === "WARMUP"
              ? "Warmup"
              : block.type === "MAIN"
              ? "Main"
              : block.type === "COOLDOWN"
              ? "Cooldown"
              : block.type === "ACCESSORY"
              ? "Accessory"
              : "Sin tipo";

          return (
            <article
              key={block.id}
              className={`rounded-2xl border bg-white shadow-sm overflow-hidden ${
                isBlockSelected ? "ring-1 ring-emerald-500 border-emerald-400" : ""
              }`}
            >
              {/* Header del bloque */}
              <header className={`flex items-center justify-between px-3 py-2 text-xs text-white ${colorClass}`}>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-[11px] font-semibold">
                    {letter}
                  </span>
                  <div className="flex flex-col min-w-0 gap-0.5">
                    <input
                      className="w-full rounded-md border border-white/20 bg-white/5 px-2 py-1 text-[11px] font-semibold placeholder:text-white/60 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                      value={derivedName}
                      placeholder={`Bloque ${letter}`}
                      onChange={(e) => onBlockNameChangeLocal(block.id, e.target.value)}
                      onBlur={(e) => void onRenameBlock(block, e.target.value)}
                      disabled={readOnly}
                    />
                    {header.goal && (
                      <span className="text-[10px] text-emerald-200 truncate">
                        {header.goal}
                      </span>
                    )}
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] text-emerald-100">Tipo:</span>
                      <select
                        className="rounded border border-white/30 bg-white/10 px-1.5 py-0.5 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-emerald-200"
                        value={block.type ?? ""}
                        onChange={(e) => {
                          const value = e.target.value as
                            | "WARMUP"
                            | "MAIN"
                            | "COOLDOWN"
                            | "ACCESSORY"
                            | "";
                          const nextType =
                            value === ""
                              ? null
                              : (value as
                                  | "WARMUP"
                                  | "MAIN"
                                  | "COOLDOWN"
                                  | "ACCESSORY");
                          void onChangeBlockType(block.id, nextType);
                        }}
                        disabled={readOnly}
                      >
                        <option value="">Sin tipo</option>
                        <option value="WARMUP">Warmup</option>
                        <option value="MAIN">Main</option>
                        <option value="COOLDOWN">Cooldown</option>
                        <option value="ACCESSORY">Accessory</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="text-emerald-50">
                    {typeLabel} · {items.length} ejercicios
                  </span>
                  {!readOnly && (
                    <button
                      type="button"
                      className="rounded border border-white/30 px-2 py-0.5 text-[10px] hover:bg-white/10"
                      onClick={() => onAddItem(block.id)}
                    >
                      + Ejercicio
                    </button>
                  )}
                </div>
              </header>

              {/* Lista de ejercicios */}
              <div className="px-3 py-2 space-y-1.5">
                {items.length === 0 ? (
                  <p className="text-[11px] text-gray-400">
                    No hay ejercicios aún en este bloque.
                  </p>
                ) : (
                  items.map((it, index) => {
                    const isSelected = selectedItemId === it.id;
                    const name = it.exerciseName || it.title || "Ejercicio sin nombre";

                    return (
                      <button
                        key={it.id}
                        type="button"
                        className={`w-full rounded-lg border px-2.5 py-1.5 text-left text-[11px] flex items-center justify-between gap-2 ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/40"
                        }`}
                        onClick={() => onSelectItem(block.id, it.id)}
                      >
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <span className="mt-[2px] text-[10px] font-semibold text-gray-500">
                            #{index + 1}
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="truncate font-medium text-gray-900">
                              {name}
                            </span>
                          </div>
                        </div>
                        <span className="shrink-0 text-[10px] text-gray-400">
                          #{it.order}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

type RoutineItemEditorProps = {
  item: RoutineItemDTO | null;
  blocks: RoutineBlockDTO[];
  onLocalChange: (itemId: string, partial: Partial<RoutineItemDTO>) => void;
  onSaveField: (
    itemId: string,
    field: keyof RoutineItemDTO,
    value: unknown,
  ) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  onDuplicate: (itemId: string) => Promise<void>;
  onMoveToBlock: (itemId: string, blockId: string) => Promise<void>;
  onShowVideo: (payload: {
    id: string;
    name: string;
    videoUrl: string | null;
  }) => void;
  readOnly?: boolean;
};

function RoutineItemEditor({
  item,
  blocks,
  onLocalChange,
  onSaveField,
  onDelete,
  onDuplicate,
  onMoveToBlock,
  onShowVideo,
  readOnly,
}: RoutineItemEditorProps) {
  const [pendingValues, setPendingValues] = useState<
    Partial<Record<keyof RoutineItemDTO, string | number | null>>
  >({});
  const [debounceTimers, setDebounceTimers] = useState<
    Partial<Record<keyof RoutineItemDTO, number | undefined>>
  >({});

  if (!item) {
    return (
      <div className="rounded-lg border bg-gray-50 p-4 text-sm text-gray-500 flex items-center justify-center h-full">
        Seleccioná un ejercicio en la columna izquierda para editar sus detalles.
      </div>
    );
  }

  function scheduleSave(field: keyof RoutineItemDTO, raw: string) {
    if (!item) return;
    let value: unknown = raw || null;

    if (field === "sets" || field === "reps") {
      value = raw ? Number(raw) : null;
    }

  const original = (item as any)[field] ?? null;
    if (value === original) {
      setPendingValues((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
      const timerId = debounceTimers[field];
      if (timerId !== undefined) {
        clearTimeout(timerId);
        setDebounceTimers((prev) => ({ ...prev, [field]: undefined }));
      }
      return;
    }

    setPendingValues((prev) => ({ ...prev, [field]: value as any }));

    const existingTimer = debounceTimers[field];
    if (existingTimer !== undefined) {
      clearTimeout(existingTimer);
    }

    const timeoutId = window.setTimeout(async () => {
      if (!item) return;
      try {
  const latest = (item as any)[field] ?? null;
        const toSave = pendingValues[field] ?? value;
        if (toSave === latest) {
          setPendingValues((prev) => {
            const next = { ...prev };
            delete next[field];
            return next;
          });
          setDebounceTimers((prev) => ({ ...prev, [field]: undefined }));
          return;
        }
        await onSaveField(item.id, field, toSave);
      } finally {
        setPendingValues((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
        setDebounceTimers((prev) => ({ ...prev, [field]: undefined }));
      }
    }, 500);

    setDebounceTimers((prev) => ({ ...prev, [field]: timeoutId }));
  }

  const handleBlur =
    (field: keyof RoutineItemDTO) =>
    async (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const raw = e.target.value;
      scheduleSave(field, raw);
    };

  return (
    <div className="rounded-lg border bg-white p-3 space-y-3 shadow-sm h-full">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Ejercicio seleccionado
          </p>
          <p className="text-sm font-medium text-gray-900">
            {getItemDisplayName(item)}
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            {item.sets != null && item.reps != null && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                {item.sets}×{item.reps}
              </span>
            )}
            {item.tempo && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                Tempo {item.tempo}
              </span>
            )}
            {item.rest && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                Descanso {item.rest}
              </span>
            )}
            {item.load && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                Carga {item.load}
              </span>
            )}
          </div>
        </div>
        {!readOnly && (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              className="text-[11px] rounded-md border px-2 py-1 hover:bg-gray-50"
              onClick={() => onDuplicate(item.id)}
            >
              Duplicar
            </button>
            <button
              type="button"
              className="text-[11px] rounded-md border border-red-200 px-2 py-1 text-red-700 hover:bg-red-50"
              onClick={() => onDelete(item.id)}
            >
              Eliminar
            </button>
          </div>
        )}
      </div>

      <div className="space-y-1 pt-1">
        <label className="block text-[10px] text-gray-500">Descripción</label>
        <textarea
          className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          rows={3}
          defaultValue={item.description ?? ""}
          placeholder="Descripción del ejercicio (opcional)"
          onChange={(e) => {
            onLocalChange(item.id, { description: e.target.value || null });
            scheduleSave("description", e.target.value);
          }}
          onBlur={handleBlur("description")}
          disabled={readOnly}
        />
      </div>

      <hr className="my-2" />

      <div className="space-y-2">
        <label className="block text-[10px] text-gray-500">Bloque</label>
        <select
          className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          value={item.blockId ?? ""}
          onChange={async (e) => {
            const blockId = e.target.value || null;
            if (!blockId) return;
            await onMoveToBlock(item.id, blockId);
          }}
          disabled={readOnly}
        >
          <option value="">Sin bloque</option>
          {blocks
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((b) => {
              const typeLabel =
                b.type === "WARMUP"
                  ? "Warmup"
                  : b.type === "MAIN"
                  ? "Main"
                  : b.type === "COOLDOWN"
                  ? "Cooldown"
                  : b.type === "ACCESSORY"
                  ? "Accessory"
                  : "Sin tipo";
              return (
                <option key={b.id} value={b.id}>
                  {b.name} ({typeLabel})
                </option>
              );
            })}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
        <div className="space-y-0.5">
          <label className="block text-[10px] text-gray-500">Series</label>
          <input
            type="number"
            className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            defaultValue={item.sets ?? ""}
            onChange={(e) =>
              onLocalChange(item.id, { sets: e.target.value ? Number(e.target.value) : null })
            }
            onBlur={handleBlur("sets")}
            disabled={readOnly}
          />
        </div>
        <div className="space-y-0.5">
          <label className="block text-[10px] text-gray-500">Reps</label>
          <input
            type="number"
            className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            defaultValue={item.reps ?? ""}
            onChange={(e) =>
              onLocalChange(item.id, { reps: e.target.value ? Number(e.target.value) : null })
            }
            onBlur={handleBlur("reps")}
            disabled={readOnly}
          />
        </div>
        <div className="space-y-0.5">
          <label className="block text-[10px] text-gray-500">Carga</label>
          <input
            type="text"
            className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            defaultValue={item.load ?? ""}
            onChange={(e) => {
              onLocalChange(item.id, { load: e.target.value || null });
              scheduleSave("load", e.target.value);
            }}
            onBlur={handleBlur("load")}
            disabled={readOnly}
          />
        </div>
        <div className="space-y-0.5">
          <label className="block text-[10px] text-gray-500">Tempo</label>
          <input
            type="text"
            className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            defaultValue={item.tempo ?? ""}
            onChange={(e) => {
              onLocalChange(item.id, { tempo: e.target.value || null });
              scheduleSave("tempo", e.target.value);
            }}
            onBlur={handleBlur("tempo")}
            disabled={readOnly}
          />
        </div>
        <div className="space-y-0.5">
          <label className="block text-[10px] text-gray-500">Descanso</label>
          <input
            type="text"
            className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            defaultValue={item.rest ?? ""}
            onChange={(e) => {
              onLocalChange(item.id, { rest: e.target.value || null });
              scheduleSave("rest", e.target.value);
            }}
            onBlur={handleBlur("rest")}
            disabled={readOnly}
          />
        </div>
        <div className="space-y-0.5 sm:col-span-2">
          <label className="block text-[10px] text-gray-500">Notas staff</label>
          <input
            type="text"
            className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            defaultValue={item.notes ?? ""}
            onChange={(e) => {
              onLocalChange(item.id, { notes: e.target.value || null });
              scheduleSave("notes", e.target.value);
            }}
            onBlur={handleBlur("notes")}
            disabled={readOnly}
          />
        </div>
        <div className="space-y-0.5 sm:col-span-2">
          <label className="block text-[10px] text-gray-500">Notas jugador</label>
          <input
            type="text"
            className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            defaultValue={item.athleteNotes ?? ""}
            onChange={(e) => {
              onLocalChange(item.id, { athleteNotes: e.target.value || null });
              scheduleSave("athleteNotes", e.target.value);
            }}
            onBlur={handleBlur("athleteNotes")}
            disabled={readOnly}
          />
        </div>
      </div>
      <hr className="my-2" />

      {(item.videoUrl || item.exerciseId) && (
        <div className="mt-2 space-y-1">
          <label className="block text-[10px] text-gray-500">Recursos asociados</label>
          <div className="flex flex-wrap gap-2">
            {item.videoUrl && (
              <button
                type="button"
                className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700 hover:bg-blue-100"
                onClick={() =>
                  onShowVideo({
                    id: item.id,
                    name: getItemDisplayName(item),
                    videoUrl: item.videoUrl,
                  })
                }
              >
                Ver video
              </button>
            )}
            {item.exerciseId && (
              <button
                type="button"
                className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-700 hover:bg-gray-100"
                onClick={() =>
                  onShowVideo({
                    id: item.exerciseId!,
                    name: getItemDisplayName(item),
                    videoUrl: item.videoUrl,
                  })
                }
              >
                Ver ejercicio original
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type ExerciseSelectorPanelProps = {
  exercises: ExerciseDTO[];
  selectedBlockId: string | null;
  selectedItemId: string | null;
  onSelectForItem?: (exercise: ExerciseDTO) => void;
  onAddToRoutine?: (exercise: ExerciseDTO) => void;
  onQuickPreview?: (exercise: ExerciseDTO) => void;
};

function ExerciseSelectorPanel({
  exercises,
  selectedBlockId,
  onSelectForItem,
  onAddToRoutine,
  onQuickPreview,
}: ExerciseSelectorPanelProps) {
  type ExerciseGroup = "Warmup" | "Campo" | "Gym";

  function deriveExerciseMeta(zoneRaw: string | null | undefined): {
    group: ExerciseGroup;
    primaryZone: string;
    tags: string[];
  } {
    const zone = zoneRaw?.trim();
    if (!zone) {
      return {
        group: "Gym",
        primaryZone: "Sin zona",
        tags: [],
      };
    }

    let group: ExerciseGroup = "Gym";
    if (zone.startsWith("Warmup")) {
      group = "Warmup";
    } else if (zone.startsWith("Drills Campo")) {
      group = "Campo";
    }

    const parts = zone.split(",").map((p) => p.trim()).filter(Boolean);
    const primaryZone = parts[0] || "Sin zona";
    const tags = parts.slice(1);

    return { group, primaryZone, tags };
  }

  const derivedExercises = useMemo(
    () => exercises.map((e) => ({ ...e, ...deriveExerciseMeta(e.zone) })),
    [exercises],
  );

  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<"all" | ExerciseGroup>("all");
  const [zoneFilter, setZoneFilter] = useState<string>("all");

  // 🔁 cada vez que cambio de Warmup/Campo/Gym, limpio la zona
  useEffect(() => {
    setZoneFilter("all");
  }, [groupFilter]);

  // 🔍 zonas principales según el tipo seleccionado
  const primaryZones = useMemo(() => {
    const set = new Set<string>();
    derivedExercises
      .filter((ex) => groupFilter === "all" || ex.group === groupFilter)
      .forEach((ex) => set.add(ex.primaryZone));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [derivedExercises, groupFilter]);

  const filtered = useMemo(
    () =>
      derivedExercises.filter((ex) => {
        if (groupFilter !== "all" && ex.group !== groupFilter) return false;
        if (zoneFilter !== "all" && ex.primaryZone !== zoneFilter) return false;
        if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [derivedExercises, groupFilter, zoneFilter, search],
  );

  return (
    <div className="rounded-lg border bg-white p-3 space-y-3 shadow-sm h-full">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Biblioteca de ejercicios
        </p>
        <div className="space-y-2 mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre…"
            className="w-full rounded-md border px-2 py-1 text-sm"
          />
          <div className="flex gap-2">
            <select
              className="flex-1 rounded-md border px-2 py-1 text-sm"
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value as any)}
            >
              <option value="all">Todos los tipos</option>
              <option value="Warmup">Warmup</option>
              <option value="Campo">Campo</option>
              <option value="Gym">Gym</option>
            </select>
            <select
              className="flex-1 rounded-md border px-2 py-1 text-sm"
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
            >
              <option value="all">Todas las zonas</option>
              {primaryZones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!selectedBlockId && (
        <p className="text-[11px] text-yellow-700 bg-yellow-50 border border-yellow-100 rounded-md px-2 py-1">
          Seleccioná un bloque en la izquierda para agregar ejercicios directamente.
        </p>
      )}

      <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
        {filtered.length === 0 ? (
          <p className="text-[11px] text-gray-400">No hay ejercicios que coincidan con la búsqueda.</p>
        ) : (
          filtered.map((ex) => {
            const meta = deriveExerciseMeta(ex.zone);
            const tagsText = meta.tags.join(" · ");

            return (
              <div
                key={ex.id}
                className="rounded-lg border bg-white px-3 py-2 shadow-sm text-xs space-y-1"
              >
                <p className="font-semibold text-gray-900 truncate">{ex.name}</p>
                <p className="text-[11px] text-gray-500 truncate">
                  {meta.primaryZone}
                  {tagsText ? ` · ${tagsText}` : ""}
                </p>
                <div className="flex justify-end gap-2 pt-1">
                  {ex.videoUrl && onQuickPreview && (
                    <button
                      type="button"
                      className="text-[11px] text-blue-600 hover:underline"
                      onClick={() => onQuickPreview(ex)}
                    >
                      Ver video
                    </button>
                  )}
                  {onAddToRoutine && (
                    <button
                      type="button"
                      className="rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-emerald-50"
                      onClick={() => onAddToRoutine(ex)}
                      disabled={!selectedBlockId}
                    >
                      Agregar
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

type ExerciseQuickPreviewProps = {
  exercise: ExerciseDTO | null;
  open: boolean;
  onClose: () => void;
  onAddToRoutine?: () => void;
};

function ExerciseQuickPreview({
  exercise,
  open,
  onClose,
  onAddToRoutine,
}: ExerciseQuickPreviewProps) {
  if (!open || !exercise) return null;

  return (
    <VideoPlayerModal
      open={open}
      onClose={onClose}
      title={exercise.name}
      zone={exercise.zone}
      videoUrl={exercise.videoUrl}
    />
  );
}
