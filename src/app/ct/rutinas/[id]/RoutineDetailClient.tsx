"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type RoutineHeaderDTO = {
  id: string;
  title: string;
  description: string | null;
  goal: string | null;
  visibility: "STAFF_ONLY" | "PLAYER_VISIBLE" | null;
  notesForAthlete: string | null;
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
};

export function RoutineDetailClient({ routine, blocks, items }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [header, setHeader] = useState<RoutineHeaderDTO>(routine);
  const [localBlocks, setLocalBlocks] = useState<RoutineBlockDTO[]>(blocks);
  const [localItems, setLocalItems] = useState<RoutineItemDTO[]>(items);

  const [sessions, setSessions] = useState<SessionListDTO[]>([]);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);

  // cargar asignaciones de sesiones iniciales
  useEffect(() => {
    (async () => {
      try {
        const sessionsResp = await getJSON<{ data: SessionListDTO[] }>("/api/sessions");
        setSessions(sessionsResp.data || []);

        const linkResp = await getJSON<{ sessionIds: string[] }>(
          `/api/ct/routines/${routine.id}/sessions`,
        );
        setSelectedSessionIds(linkResp.sessionIds || []);
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

  async function handleAddBlock() {
    setError(null);
    try {
      const name = "Bloque nuevo";
      const res = await postJSON(`/api/ct/routines/${header.id}/blocks`, { name });
      // postJSON no devuelve el cuerpo, así que usamos fetch directamente si necesitamos datos
    } catch (e) {
      console.error(e);
      setError("No se pudo crear el bloque");
    } finally {
      startTransition(() => router.refresh());
    }
  }

  function groupedItemsByBlock() {
    return useMemo(() => {
      const byBlock: Record<string, RoutineItemDTO[]> = {};
      const unassigned: RoutineItemDTO[] = [];
      for (const it of localItems) {
        if (it.blockId) {
          if (!byBlock[it.blockId]) byBlock[it.blockId] = [];
          byBlock[it.blockId].push(it);
        } else {
          unassigned.push(it);
        }
      }
      return { byBlock, unassigned };
    }, [localItems]);
  }

  const { byBlock, unassigned } = groupedItemsByBlock();

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
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => startTransition(() => void handleSaveHeader())}
            disabled={isPending}
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
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

      {/* Bloques e items (placeholder simplificado, se seguirá refinando) */}
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

        <div className="space-y-4">
          {localBlocks.map((b) => (
            <div key={b.id} className="border rounded-lg p-3 space-y-2 bg-gray-50">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <input
                    className="w-full rounded-md border px-2 py-1 text-sm bg-white"
                    value={b.name}
                    readOnly
                  />
                  {b.description && (
                    <p className="text-[11px] text-gray-500 line-clamp-2">{b.description}</p>
                  )}
                </div>
              </div>

              <div className="mt-2 space-y-1">
                <div className="text-[11px] font-medium text-gray-500">Ejercicios del bloque</div>
                <ul className="space-y-1">
                  {(byBlock[b.id] || []).map((it) => (
                    <li key={it.id} className="rounded-md border bg-white px-2 py-1 text-xs">
                      #{it.order} · {it.title}
                    </li>
                  ))}
                  {(byBlock[b.id] || []).length === 0 && (
                    <li className="text-[11px] text-gray-400">Sin ejercicios aún.</li>
                  )}
                </ul>
              </div>
            </div>
          ))}

          {unassigned.length > 0 && (
            <div className="border rounded-lg p-3 space-y-2 bg-white">
              <div className="text-sm font-semibold">Otros ejercicios (sin bloque)</div>
              <ul className="space-y-1">
                {unassigned.map((it) => (
                  <li key={it.id} className="rounded-md border px-2 py-1 text-xs">
                    #{it.order} · {it.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
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
