"use client";

import { useMemo, useState } from "react";
import ExerciseChooser from "./ExerciseChooser";

type RoutineDTO = {
  id: string;
  title: string;
  description: string | null;
  goal: string | null;
  visibility: string | null;
  notesForAthlete: string | null;
  shareMode?: string | null;
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

export type RoutineEditorClientProps = {
  routine: RoutineDTO;
  blocks: RoutineBlockDTO[];
  items: RoutineItemDTO[];
  sharedPlayerIds: string[];
};

export default function RoutineEditorClient({
  routine,
  blocks: initialBlocks,
  items: initialItems,
}: RoutineEditorClientProps) {
  const [blocks, setBlocks] = useState<RoutineBlockDTO[]>([...initialBlocks]);
  const [items, setItems] = useState<RoutineItemDTO[]>([...initialItems]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(
    initialBlocks[0]?.id ?? null,
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [exerciseModalOpen, setExerciseModalOpen] = useState(false);

  const itemsByBlock = useMemo(() => {
    const map: Record<string, RoutineItemDTO[]> = {};
    for (const it of items) {
      const key = it.blockId || "__unassigned__";
      if (!map[key]) map[key] = [];
      map[key].push(it);
    }
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => a.order - b.order);
    });
    return map;
  }, [items]);

  const selectedBlockItems = selectedBlockId
    ? itemsByBlock[selectedBlockId] || []
    : [];
  const selectedItem = selectedItemId
    ? items.find((it) => it.id === selectedItemId) || null
    : null;

  async function handleAddItem(blockId: string) {
    const order = (itemsByBlock[blockId]?.[itemsByBlock[blockId].length - 1]?.order || 0) + 1;
    const res = await fetch(`/api/ct/routines/${routine.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Nuevo ejercicio",
        blockId,
        order,
      }),
    });
    if (!res.ok) {
      console.error("No se pudo crear el item");
      return;
    }
    const json = await res.json();
    const created: RoutineItemDTO = json.data;
    setItems((prev) => [...prev, created]);
    setSelectedItemId(created.id);
  }

  function moveBlock(blockId: string, direction: -1 | 1) {
    setBlocks((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((b) => b.id === blockId);
      if (idx === -1) return prev;
      const swapIdx = idx + direction;
      if (swapIdx < 0 || swapIdx >= sorted.length) return prev;
      const a = sorted[idx];
      const b = sorted[swapIdx];
      [a.order, b.order] = [b.order, a.order];
      // Persistir en background
      fetch(`/api/ct/routines/blocks/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: a.order }),
      });
      fetch(`/api/ct/routines/blocks/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: b.order }),
      });
      return [...sorted];
    });
  }

  function moveItem(itemId: string, direction: -1 | 1) {
    setItems((prev) => {
      const current = prev.find((it) => it.id === itemId);
      if (!current) return prev;
      const blockId = current.blockId || "__unassigned__";
      const blockItems = prev
        .filter((it) => (it.blockId || "__unassigned__") === blockId)
        .sort((a, b) => a.order - b.order);
      const idx = blockItems.findIndex((it) => it.id === itemId);
      if (idx === -1) return prev;
      const swapIdx = idx + direction;
      if (swapIdx < 0 || swapIdx >= blockItems.length) return prev;
      const a = blockItems[idx];
      const b = blockItems[swapIdx];
      [a.order, b.order] = [b.order, a.order];
      // Persistir
      fetch(`/api/ct/routines/items/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: a.order }),
      });
      fetch(`/api/ct/routines/items/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: b.order }),
      });
      return prev.map((it) =>
        it.id === a.id ? { ...it, order: a.order } : it.id === b.id ? { ...it, order: b.order } : it,
      );
    });
  }

  async function handleSaveItem(updated: RoutineItemDTO) {
    const res = await fetch(`/api/ct/routines/items/${updated.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sets: updated.sets,
        reps: updated.reps,
        load: updated.load,
        tempo: updated.tempo,
        rest: updated.rest,
        notes: updated.notes,
        athleteNotes: updated.athleteNotes,
        exerciseId: updated.exerciseId,
      }),
    });
    if (!res.ok) {
      console.error("No se pudo guardar el item");
      return;
    }
    const json = await res.json();
    const saved: RoutineItemDTO = json.data;
    setItems((prev) => prev.map((it) => (it.id === saved.id ? saved : it)));
  }

  function handleChangeSelectedItem(field: keyof RoutineItemDTO, value: any) {
    if (!selectedItem) return;
    const updated: RoutineItemDTO = { ...selectedItem, [field]: value };
    setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
  }

  function handleChooseExercise(exerciseId: string, exerciseName: string) {
    if (!selectedItem) return;
    const updated: RoutineItemDTO = { ...selectedItem, exerciseId, exerciseName };
    setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
    setExerciseModalOpen(false);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[2fr,3fr] gap-4">
      {/* Panel izquierdo: bloques + items */}
      <div className="space-y-3 border rounded-xl p-3 bg-white">
        <h2 className="text-sm font-semibold mb-1">
          Bloques de la rutina: {routine.title}
        </h2>
        {blocks
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((block) => {
            const bItems = itemsByBlock[block.id] || [];
            const isSelected = block.id === selectedBlockId;
            return (
              <div
                key={block.id}
                className={`border rounded-lg mb-2 ${
                  isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-gray-50"
                }`}
              >
                <div
                  className="flex items-center justify-between px-2 py-1 cursor-pointer"
                  onClick={() => setSelectedBlockId(block.id)}
                >
                  <div>
                    <div className="text-xs font-medium">{block.name}</div>
                    {block.description && (
                      <div className="text-[11px] text-gray-500 line-clamp-1">
                        {block.description}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      className="px-1 py-0.5 rounded border text-gray-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveBlock(block.id, -1);
                      }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="px-1 py-0.5 rounded border text-gray-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveBlock(block.id, 1);
                      }}
                    >
                      ↓
                    </button>
                  </div>
                </div>

                {/* Items del bloque */}
                <div className="border-t border-gray-200 bg-white px-2 py-1">
                  {bItems.length === 0 && (
                    <div className="text-[11px] text-gray-400">
                      Sin ejercicios en este bloque.
                    </div>
                  )}
                  {bItems.map((it) => (
                    <div
                      key={it.id}
                      className={`flex items-center justify-between text-[11px] px-1 py-0.5 rounded cursor-pointer mb-0.5 ${
                        it.id === selectedItemId ? "bg-blue-100" : "hover:bg-gray-50"
                      }`}
                      onClick={() => setSelectedItemId(it.id)}
                    >
                      <div>
                        <div className="font-medium">
                          {it.exerciseName || it.title || "Ejercicio"}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {it.sets ? `${it.sets}x${it.reps ?? "?"}` : ""}
                          {it.load ? ` · ${it.load}` : ""}
                          {it.rest ? ` · ${it.rest}` : ""}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="px-1 py-0.5 rounded border text-gray-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveItem(it.id, -1);
                          }}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="px-1 py-0.5 rounded border text-gray-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveItem(it.id, 1);
                          }}
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="mt-1 text-[11px] text-blue-600 hover:underline"
                    onClick={() => handleAddItem(block.id)}
                  >
                    + Agregar ejercicio
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {/* Panel derecho: editor del item seleccionado */}
      <div className="space-y-3 border rounded-xl p-3 bg-white">
        <h2 className="text-sm font-semibold mb-1">Editor de ejercicio</h2>
        {!selectedItem ? (
          <p className="text-xs text-gray-500">
            Seleccioná un ejercicio en la izquierda para editar sus parámetros.
          </p>
        ) : (
          <div className="space-y-2">
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Sets</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1 text-sm"
                value={selectedItem.sets ?? ""}
                onChange={(e) =>
                  handleChangeSelectedItem("sets", e.target.value ? Number(e.target.value) : null)
                }
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Reps</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1 text-sm"
                value={selectedItem.reps ?? ""}
                onChange={(e) =>
                  handleChangeSelectedItem("reps", e.target.value ? Number(e.target.value) : null)
                }
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Carga (load)</label>
              <input
                type="text"
                className="w-full border rounded px-2 py-1 text-sm"
                value={selectedItem.load ?? ""}
                onChange={(e) => handleChangeSelectedItem("load", e.target.value || null)}
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Tempo</label>
              <input
                type="text"
                className="w-full border rounded px-2 py-1 text-sm"
                value={selectedItem.tempo ?? ""}
                onChange={(e) => handleChangeSelectedItem("tempo", e.target.value || null)}
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Descanso (rest)</label>
              <input
                type="text"
                className="w-full border rounded px-2 py-1 text-sm"
                value={selectedItem.rest ?? ""}
                onChange={(e) => handleChangeSelectedItem("rest", e.target.value || null)}
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Notas</label>
              <textarea
                className="w-full border rounded px-2 py-1 text-sm min-h-[80px]"
                value={selectedItem.notes ?? ""}
                onChange={(e) => handleChangeSelectedItem("notes", e.target.value || null)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] text-gray-500 mb-1">
                Notas para el jugador
              </label>
              <textarea
                className="w-full border rounded px-2 py-1 text-sm min-h-[60px]"
                rows={2}
                value={selectedItem.athleteNotes ?? ""}
                onChange={(e) =>
                  handleChangeSelectedItem("athleteNotes", e.target.value || null)
                }
              />
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="text-[11px] text-gray-500">
                Ejercicio: {selectedItem.exerciseName || selectedItem.exerciseId || "(sin asignar)"}
              </div>
              <button
                type="button"
                className="text-[11px] text-blue-600 hover:underline"
                onClick={() => setExerciseModalOpen(true)}
              >
                Elegir ejercicio
              </button>
            </div>

            <button
              type="button"
              className="mt-3 px-3 py-1.5 rounded-xl border text-xs bg-gray-900 text-white hover:bg-black"
              onClick={() => selectedItem && handleSaveItem(selectedItem)}
            >
              Guardar ejercicio
            </button>
          </div>
        )}
      </div>

      {exerciseModalOpen && selectedItem && (
        <ExerciseChooser
          onClose={() => setExerciseModalOpen(false)}
          onChoose={handleChooseExercise}
        />
      )}
    </div>
  );
}
