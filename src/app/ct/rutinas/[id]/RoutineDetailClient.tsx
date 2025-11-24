"use client";

import type { FocusEvent } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
};

type PlayerDTO = {
  id: string;
  name: string | null;
  email: string | null;
};

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

        const exercisesResp = await getJSON<{ data: ExerciseDTO[] }>("/api/ct/exercises");
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
      const name = "Bloque nuevo";
      await postJSON(`/api/ct/routines/${header.id}/blocks`, { name });
    } catch (e) {
      console.error(e);
      setError("No se pudo crear el bloque");
    } finally {
      startTransition(() => router.refresh());
    }
  }

  async function handleAddItem(blockId: string) {
    setError(null);
    try {
      const itemsInBlock = localItems.filter((it) => it.blockId === blockId);
      const nextOrder =
        itemsInBlock.length > 0 ? Math.max(...itemsInBlock.map((it) => it.order)) + 1 : 1;

      await postJSON(`/api/ct/routines/${header.id}/items`, {
        title: "Nuevo ejercicio",
        description: "",
        blockId,
        exerciseId: null,
        exerciseName: "",
        order: nextOrder,
      });
    } catch (e) {
      console.error(e);
      setError("No se pudo crear el ejercicio");
    } finally {
      startTransition(() => router.refresh());
    }
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

      {/* Cabecera */}
      <section className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex-1 space-y-2">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-500">Título</label>
              <input
                className="w-full rounded-md border px-3 py-1.5 text-sm"
                value={header.title}
                onChange={(e) => handleFieldChange("title", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-500">Objetivo</label>
              <input
                className="w-full rounded-md border px-3 py-1.5 text-sm"
                value={header.goal ?? ""}
                onChange={(e) => handleFieldChange("goal", e.target.value || null)}
                placeholder="Ej: Activación + fuerza general"
              />
            </div>
          </div>
          <div className="w-full md:w-56 space-y-1">
            <label className="text-[11px] font-medium text-gray-500">Visibilidad</label>
            <select
              className="w-full rounded-md border px-3 py-1.5 text-sm bg-white"
              value={header.visibility ?? "STAFF_ONLY"}
              onChange={(e) =>
                handleFieldChange("visibility", e.target.value as "STAFF_ONLY" | "PLAYER_VISIBLE")
              }
            >
              <option value="STAFF_ONLY">Solo staff</option>
              <option value="PLAYER_VISIBLE">Visible para jugadores</option>
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-gray-500">Descripción</label>
          <textarea
            className="w-full rounded-md border px-3 py-1.5 text-sm min-h-[60px]"
            value={header.description ?? ""}
            onChange={(e) => handleFieldChange("description", e.target.value || null)}
          />
        </div>
        <div className="flex flex-col gap-2 items-stretch sm:flex-row sm:justify-between sm:items-center">
          <button
            type="button"
            onClick={handleDeleteRoutine}
            className="inline-flex items-center justify-center rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
          >
            Eliminar rutina
          </button>
          <button
            type="button"
            onClick={() => startTransition(() => void handleSaveHeader())}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isPending ? "Guardando..." : "Guardar cabecera"}
          </button>
        </div>
      </section>

      {/* Notas para el jugador */}
      <section className="rounded-xl border bg-white p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Notas para el jugador</h2>
        </div>
        <textarea
          className="w-full rounded-md border px-3 py-1.5 text-sm min-h-[80px]"
          value={header.notesForAthlete ?? ""}
          onChange={(e) => handleFieldChange("notesForAthlete", e.target.value || null)}
          placeholder="Mensaje que verá el jugador al recibir esta rutina."
        />
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
          >
            <option value="STAFF_ONLY">Solo staff</option>
            <option value="ALL_PLAYERS">Todos los jugadores del equipo</option>
            <option value="SELECTED_PLAYERS">Jugadores específicos</option>
          </select>
        </div>

        {header.shareMode === "SELECTED_PLAYERS" && (
          <div className="space-y-2">
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
          <button
            type="button"
            className="text-xs rounded-md border px-3 py-1 hover:bg-gray-50"
            onClick={handleAddBlock}
            disabled={isPending}
          >
            Agregar bloque
          </button>
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
          />

          <RoutineItemEditor
            item={selectedItem}
            blocks={localBlocks}
            onLocalChange={updateLocalItem}
            onSaveField={saveItemField}
            onDelete={deleteItem}
            onDuplicate={duplicateItem}
            onMoveToBlock={moveItemToBlock}
          />

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

        <ExerciseQuickPreview
          exercise={quickPreviewExercise}
          open={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          onAddToRoutine={addPreviewExerciseToRoutine}
        />
      </section>

      {/* Asignación a sesiones */}
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
}: RoutineStructurePanelProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Estructura de la rutina
        </h3>
        <p className="text-sm font-medium text-gray-900">{header.title}</p>
        {header.goal && <p className="text-xs text-gray-500">{header.goal}</p>}
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-[11px] font-medium text-gray-500">Bloques</span>
        <button
          type="button"
          className="text-[11px] rounded-md border px-2 py-1 hover:bg-gray-50"
          onClick={onAddBlock}
        >
          + Bloque
        </button>
      </div>

      <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
        {blocks.length === 0 && (
          <p className="text-[11px] text-gray-400">Todavía no hay bloques. Creá el primero.</p>
        )}

        {blocks.map((b) => {
          const itemsInBlock = byBlock[b.id] || [];
          const isBlockSelected = selectedBlockId === b.id;
          return (
            <div
              key={b.id}
              className={`rounded-lg border bg-gray-50 p-2 space-y-2 ${
                isBlockSelected ? "ring-1 ring-blue-500 border-blue-400" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <input
                  className="w-full rounded-md border px-2 py-1 text-xs bg-white"
                  value={b.name}
                  onChange={(e) => onBlockNameChangeLocal(b.id, e.target.value)}
                  onBlur={(e) => void onRenameBlock(b, e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span>Ejercicios ({itemsInBlock.length})</span>
                  <button
                    type="button"
                    className="rounded-md border px-2 py-0.5 hover:bg-gray-100"
                    onClick={() => onAddItem(b.id)}
                  >
                    + Ejercicio
                  </button>
                </div>
                <ul className="space-y-0.5">
                  {itemsInBlock.map((it) => {
                    const isSelected = selectedItemId === it.id;
                    return (
                      <li key={it.id}>
                        <button
                          type="button"
                          onClick={() => onSelectItem(b.id, it.id)}
                          className={`w-full text-left rounded-md px-2 py-1 text-[11px] ${
                            isSelected
                              ? "bg-blue-50 text-blue-700 border border-blue-300"
                              : "bg-white border border-transparent hover:bg-gray-50 text-gray-700"
                          }`}
                        >
                          <span className="font-medium mr-1">#{it.order}</span>
                          <span>{it.exerciseName || it.title}</span>
                        </button>
                      </li>
                    );
                  })}
                  {itemsInBlock.length === 0 && (
                    <li className="text-[11px] text-gray-400">Sin ejercicios aún.</li>
                  )}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
};

function RoutineItemEditor({
  item,
  blocks,
  onLocalChange,
  onSaveField,
  onDelete,
  onDuplicate,
  onMoveToBlock,
}: RoutineItemEditorProps) {
  if (!item) {
    return (
      <div className="rounded-lg border bg-gray-50 p-4 text-sm text-gray-500 flex items-center justify-center h-full">
        Seleccioná un ejercicio en la columna izquierda para editar sus detalles.
      </div>
    );
  }

  const handleBlur =
    (field: keyof RoutineItemDTO) =>
    async (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const raw = e.target.value;
      let value: unknown = raw || null;

      if (field === "sets" || field === "reps") {
        value = raw ? Number(raw) : null;
      }

      await onSaveField(item.id, field, value);
    };

  return (
    <div className="rounded-lg border bg-white p-3 space-y-3 shadow-sm h-full">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Ejercicio seleccionado
          </p>
          <p className="text-sm font-medium text-gray-900">
            {item.exerciseName || item.title || "Ejercicio sin nombre"}
          </p>
          {item.description && (
            <p className="text-[11px] text-gray-500 line-clamp-2">{item.description}</p>
          )}
        </div>
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
      </div>

      <div className="space-y-2">
        <label className="block text-[10px] text-gray-500">Bloque</label>
        <select
          className="w-full rounded-md border px-2 py-1 text-xs bg-white"
          value={item.blockId ?? ""}
          onChange={async (e) => {
            const blockId = e.target.value || null;
            if (!blockId) return;
            await onMoveToBlock(item.id, blockId);
          }}
        >
          <option value="">Sin bloque</option>
          {blocks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
        <div className="space-y-0.5">
          <label className="block text-[10px] text-gray-500">Series</label>
          <input
            type="number"
            className="w-full rounded-md border px-2 py-1 text-xs"
            defaultValue={item.sets ?? ""}
            onChange={(e) =>
              onLocalChange(item.id, { sets: e.target.value ? Number(e.target.value) : null })
            }
            onBlur={handleBlur("sets")}
          />
        </div>
        <div className="space-y-0.5">
          <label className="block text-[10px] text-gray-500">Reps</label>
          <input
            type="number"
            className="w-full rounded-md border px-2 py-1 text-xs"
            defaultValue={item.reps ?? ""}
            onChange={(e) =>
              onLocalChange(item.id, { reps: e.target.value ? Number(e.target.value) : null })
            }
            onBlur={handleBlur("reps")}
          />
        </div>
        <div className="space-y-0.5">
          <label className="block text-[10px] text-gray-500">Carga</label>
          <input
            type="text"
            className="w-full rounded-md border px-2 py-1 text-xs"
            defaultValue={item.load ?? ""}
            onChange={(e) => onLocalChange(item.id, { load: e.target.value || null })}
            onBlur={handleBlur("load")}
          />
        </div>
        <div className="space-y-0.5">
          <label className="block text-[10px] text-gray-500">Tempo</label>
          <input
            type="text"
            className="w-full rounded-md border px-2 py-1 text-xs"
            defaultValue={item.tempo ?? ""}
            onChange={(e) => onLocalChange(item.id, { tempo: e.target.value || null })}
            onBlur={handleBlur("tempo")}
          />
        </div>
        <div className="space-y-0.5">
          <label className="block text-[10px] text-gray-500">Descanso</label>
          <input
            type="text"
            className="w-full rounded-md border px-2 py-1 text-xs"
            defaultValue={item.rest ?? ""}
            onChange={(e) => onLocalChange(item.id, { rest: e.target.value || null })}
            onBlur={handleBlur("rest")}
          />
        </div>
        <div className="space-y-0.5 sm:col-span-2">
          <label className="block text-[10px] text-gray-500">Notas staff</label>
          <input
            type="text"
            className="w-full rounded-md border px-2 py-1 text-xs"
            defaultValue={item.notes ?? ""}
            onChange={(e) => onLocalChange(item.id, { notes: e.target.value || null })}
            onBlur={handleBlur("notes")}
          />
        </div>
        <div className="space-y-0.5 sm:col-span-2">
          <label className="block text-[10px] text-gray-500">Notas jugador</label>
          <input
            type="text"
            className="w-full rounded-md border px-2 py-1 text-xs"
            defaultValue={item.athleteNotes ?? ""}
            onChange={(e) =>
              onLocalChange(item.id, { athleteNotes: e.target.value || null })
            }
            onBlur={handleBlur("athleteNotes")}
          />
        </div>
      </div>

      {item.videoUrl && (
        <div className="mt-2 space-y-1">
          <label className="block text-[10px] text-gray-500">Video asociado</label>
          <a
            href={item.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-[11px] text-blue-600 hover:underline"
          >
            Ver video
          </a>
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
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState<string | null>(null);

  const zones = useMemo(
    () =>
      Array.from(new Set(exercises.map((ex) => ex.zone).filter((z): z is string => !!z))).sort(),
    [exercises],
  );

  const filtered = exercises.filter((ex) => {
    const matchesSearch =
      !search ||
      ex.name.toLowerCase().includes(search.toLowerCase()) ||
      (ex.zone || "").toLowerCase().includes(search.toLowerCase());
    const matchesZone = !zoneFilter || ex.zone === zoneFilter;
    return matchesSearch && matchesZone;
  });

  return (
    <div className="rounded-lg border bg-white p-3 space-y-3 shadow-sm h-full">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Biblioteca de ejercicios
        </p>
        <input
          className="w-full rounded-md border px-2 py-1 text-xs"
          placeholder="Buscar por nombre o zona…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {zones.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            <button
              type="button"
              className={`px-2 py-0.5 rounded-full text-[10px] border ${
                !zoneFilter ? "bg-gray-900 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
              onClick={() => setZoneFilter(null)}
            >
              Todas
            </button>
            {zones.map((z) => (
              <button
                key={z}
                type="button"
                className={`px-2 py-0.5 rounded-full text-[10px] border ${
                  zoneFilter === z
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => setZoneFilter(z)}
              >
                {z}
              </button>
            ))}
          </div>
        )}
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
            const labelParts = [ex.name];
            if (ex.zone) labelParts.push(ex.zone);
            if (ex.videoUrl) labelParts.push("video");
            const label = labelParts.join(" · ");

            return (
              <div
                key={ex.id}
                className="rounded-md border bg-gray-50 px-2 py-2 text-xs space-y-1 hover:bg-gray-100"
              >
                <div className="flex items-start gap-2">
                  <div className="h-10 w-10 flex-shrink-0 rounded-md bg-gray-200 flex items-center justify-center text-[10px] text-gray-500">
                    VID
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{ex.name}</p>
                    {ex.zone && (
                      <p className="text-[11px] text-gray-500">
                        Zona: <span className="font-medium">{ex.zone}</span>
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400">{label}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {ex.zone && (
                    <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-[10px] text-gray-700">
                      {ex.zone}
                    </span>
                  )}
                  {ex.videoUrl && (
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700">
                      Video
                    </span>
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  {onSelectForItem && (
                    <button
                      type="button"
                      className="flex-1 rounded-md border px-2 py-1 text-[11px] hover:bg-white"
                      onClick={() => onSelectForItem(ex)}
                    >
                      Usar en ítem seleccionado
                    </button>
                  )}
                  {onAddToRoutine && (
                    <button
                      type="button"
                      className="flex-1 rounded-md bg-black px-2 py-1 text-[11px] font-medium text-white hover:bg-gray-800 disabled:opacity-60"
                      onClick={() => onAddToRoutine(ex)}
                      disabled={!selectedBlockId}
                    >
                      Agregar a rutina
                    </button>
                  )}
                </div>
                {onQuickPreview && (
                  <button
                    type="button"
                    className="mt-1 text-[11px] text-blue-600 hover:underline"
                    onClick={() => onQuickPreview(ex)}
                  >
                    Ver rápido
                  </button>
                )}
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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-lg p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{exercise.name}</h3>
            {exercise.zone && (
              <p className="text-[11px] text-gray-500 mt-0.5">Zona: {exercise.zone}</p>
            )}
          </div>
          <button
            type="button"
            className="text-xs rounded-md border px-2 py-1 hover:bg-gray-50"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>

        {exercise.videoUrl ? (
          <video
            src={exercise.videoUrl}
            controls
            className="w-full rounded-md bg-black max-h-64"
          />
        ) : (
          <div className="w-full rounded-md bg-gray-100 flex items-center justify-center h-40 text-xs text-gray-500">
            Sin video disponible
          </div>
        )}

        <p className="text-[11px] text-gray-500">
          Cuando este ejercicio tenga descripción y puntos clave en el modelo, se mostrarán acá.
        </p>

        <div className="flex justify-end gap-2 pt-1">
          {onAddToRoutine && (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
              onClick={onAddToRoutine}
            >
              Agregar a rutina
            </button>
          )}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
