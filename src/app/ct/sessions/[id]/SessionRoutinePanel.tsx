"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type LinkedRoutineDTO = {
  id: string;
  title: string;
};

export type RoutineListItemDTO = {
  id: string;
  title: string;
  description: string | null;
  goal: string | null;
  blocksCount: number;
  itemsCount: number;
};

type Props = {
  sessionId: string;
  routines: LinkedRoutineDTO[];
  isViewMode: boolean;
};

export function SessionRoutinePanel({ sessionId, routines: initialRoutines, isViewMode }: Props) {
  const router = useRouter();
  const [linkedRoutines, setLinkedRoutines] = useState<LinkedRoutineDTO[]>(initialRoutines);
  const [allRoutines, setAllRoutines] = useState<RoutineListItemDTO[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openModal() {
    setError(null);
    setIsModalOpen(true);
    if (allRoutines.length > 0) return;
    try {
      setLoading(true);
      const res = await fetch("/api/ct/routines", { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const data = Array.isArray((json as any)?.data) ? (json as any).data : json;
      const list: RoutineListItemDTO[] = Array.isArray(data)
        ? data.map((r: any) => ({
            id: String(r.id),
            title: (r.title as string) || "Rutina sin nombre",
            description: (r.description as string) ?? null,
            goal: (r.goal as string) ?? null,
            blocksCount: Number(r.blocksCount ?? 0),
            itemsCount: Number(r.itemsCount ?? 0),
          }))
        : [];
      setAllRoutines(list);
    } catch (err: any) {
      console.error("No se pudieron cargar las rutinas", err);
      setError(err?.message || "No se pudieron cargar las rutinas");
    } finally {
      setLoading(false);
    }
  }

  async function assignRoutine(routine: RoutineListItemDTO) {
    try {
      setError(null);
      setLoading(true);

      // Obtener sesiones actuales de esa rutina
      const resGet = await fetch(`/api/ct/routines/${routine.id}/sessions`, {
        cache: "no-store",
      });
      if (!resGet.ok) throw new Error(await resGet.text());
      const jsonGet = await resGet.json();
      const current: string[] = Array.isArray((jsonGet as any)?.sessionIds)
        ? (jsonGet as any).sessionIds
        : [];

      const nextSessionIds = Array.from(new Set([...current, sessionId]));

      const resPut = await fetch(`/api/ct/routines/${routine.id}/sessions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionIds: nextSessionIds }),
      });
      if (!resPut.ok) throw new Error(await resPut.text());

      setLinkedRoutines((prev) => {
        if (prev.some((r) => r.id === routine.id)) return prev;
        return [...prev, { id: routine.id, title: routine.title }];
      });

      setIsModalOpen(false);
      router.refresh();
    } catch (err: any) {
      console.error("No se pudo asignar la rutina a la sesión", err);
      setError(err?.message || "No se pudo asignar la rutina a la sesión");
    } finally {
      setLoading(false);
    }
  }

  async function removeRoutine(routine: LinkedRoutineDTO) {
    try {
      setError(null);
      setLoading(true);

      const resGet = await fetch(`/api/ct/routines/${routine.id}/sessions`, {
        cache: "no-store",
      });
      if (!resGet.ok) throw new Error(await resGet.text());
      const jsonGet = await resGet.json();
      const current: string[] = Array.isArray((jsonGet as any)?.sessionIds)
        ? (jsonGet as any).sessionIds
        : [];

      const nextSessionIds = current.filter((sid) => sid !== sessionId);

      const resPut = await fetch(`/api/ct/routines/${routine.id}/sessions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionIds: nextSessionIds }),
      });
      if (!resPut.ok) throw new Error(await resPut.text());

      setLinkedRoutines((prev) => prev.filter((r) => r.id !== routine.id));
      router.refresh();
    } catch (err: any) {
      console.error("No se pudo quitar la rutina de la sesión", err);
      setError(err?.message || "No se pudo quitar la rutina de la sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Rutina de fuerza</h2>
          {!isViewMode && (
            <p className="text-xs text-gray-500">
              Asigná una rutina de fuerza del gimnasio a esta sesión.
            </p>
          )}
        </div>
        {!isViewMode && (
          <button
            type="button"
            className="text-xs rounded-md border px-3 py-1 hover:bg-gray-50"
            onClick={openModal}
            disabled={loading}
          >
            {linkedRoutines.length === 0 ? "Asignar rutina de fuerza" : "Cambiar rutinas"}
          </button>
        )}
      </header>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {linkedRoutines.length === 0 ? (
        <p className="text-sm text-gray-500">
          Esta sesión aún no tiene una rutina de fuerza asignada.
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {linkedRoutines.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium text-gray-900 truncate">{r.title}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  className="text-xs rounded-md border px-2 py-1 hover:bg-gray-50"
                  onClick={() => router.push(`/ct/rutinas/${r.id}`)}
                >
                  Ver rutina
                </button>
                {!isViewMode && (
                  <button
                    type="button"
                    className="text-xs rounded-md border border-red-200 px-2 py-1 text-red-700 hover:bg-red-50"
                    onClick={() => removeRoutine(r)}
                    disabled={loading}
                  >
                    Quitar de esta sesión
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {isModalOpen && !isViewMode && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-lg space-y-3">
            <header className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Asignar rutina de fuerza</h3>
              <button
                type="button"
                className="text-xs rounded-md border px-2 py-1 hover:bg-gray-50"
                onClick={() => setIsModalOpen(false)}
              >
                Cerrar
              </button>
            </header>

            {loading ? (
              <p className="text-sm text-gray-500">Cargando rutinas…</p>
            ) : allRoutines.length === 0 ? (
              <p className="text-sm text-gray-500">No hay rutinas de fuerza creadas todavía.</p>
            ) : (
              <ul className="max-h-80 overflow-auto space-y-2 text-sm">
                {allRoutines.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border bg-white px-3 py-2 shadow-sm flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{r.title}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {r.goal || r.description || "Sin objetivo definido"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        {r.blocksCount} bloque{r.blocksCount === 1 ? "" : "s"} · {r.itemsCount} ejercicio
                        {r.itemsCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 text-xs rounded-md border px-2 py-1 hover:bg-emerald-50"
                      onClick={() => assignRoutine(r)}
                    >
                      Asignar a esta sesión
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
