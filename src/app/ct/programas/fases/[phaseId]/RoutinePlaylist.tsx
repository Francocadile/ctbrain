"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import RoutinePicker from "./RoutinePicker";

type PlaylistItem = {
  id: string;
  routineId: string;
  routineTitle: string | null;
  order: number;
};

export default function RoutinePlaylist({
  phaseId,
  initialItems,
}: {
  phaseId: string;
  initialItems: PlaylistItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [items, setItems] = useState<PlaylistItem[]>(initialItems);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Keep in sync after refresh
  useEffect(() => setItems(initialItems), [initialItems]);

  const orderedRoutineIds = useMemo(() => items.map((x) => x.routineId), [items]);

  const dragRoutineId = useRef<string | null>(null);

  async function apiAdd(routineId: string) {
    const res = await fetch(`/api/ct/routine-programs/phases/${phaseId}/routines`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CT-CSRF": "1",
      },
      body: JSON.stringify({ routineId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "No se pudo agregar");
    router.refresh();
  }

  async function apiRemove(routineId: string) {
    const res = await fetch(`/api/ct/routine-programs/phases/${phaseId}/routines/${routineId}`, {
      method: "DELETE",
      headers: { "X-CT-CSRF": "1" },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "No se pudo quitar");
    router.refresh();
  }

  async function apiReorder(finalIds: string[]) {
    const res = await fetch(`/api/ct/routine-programs/phases/${phaseId}/routines/reorder`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CT-CSRF": "1",
      },
      body: JSON.stringify({ orderedRoutineIds: finalIds }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "No se pudo reordenar");
  }

  function moveRoutine(dragId: string, overId: string) {
    if (dragId === overId) return;
    const from = items.findIndex((x) => x.routineId === dragId);
    const to = items.findIndex((x) => x.routineId === overId);
    if (from < 0 || to < 0) return;

    const next = items.slice();
    const [picked] = next.splice(from, 1);
    next.splice(to, 0, picked);
    setItems(next);

    // Persist immediately
    startTransition(async () => {
      try {
        await apiReorder(next.map((x) => x.routineId));
        router.refresh();
      } catch (e: any) {
        alert(e?.message || "Error");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Rutinas</div>
          <div className="text-xs text-muted-foreground">Arrastrá para ordenar</div>
        </div>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
        >
          Agregar rutina
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          Todavía no hay rutinas en esta fase.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => {
            const title = it.routineTitle ?? "Rutina no disponible";

            return (
              <div
                key={it.routineId}
                draggable
                onDragStart={() => {
                  dragRoutineId.current = it.routineId;
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={() => {
                  const dragId = dragRoutineId.current;
                  if (!dragId) return;
                  moveRoutine(dragId, it.routineId);
                }}
                className="flex items-center justify-between gap-3 rounded-xl border bg-background p-3"
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium text-muted-foreground">#{it.order}</div>
                  <div className="truncate text-sm font-semibold">{title}</div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/ct/rutinas/${it.routineId}`}
                    className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm hover:bg-muted"
                  >
                    Abrir
                  </Link>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      if (!confirm("¿Quitar rutina de la fase?")) return;
                      startTransition(async () => {
                        try {
                          await apiRemove(it.routineId);
                        } catch (e: any) {
                          alert(e?.message || "Error");
                        }
                      });
                    }}
                    className="inline-flex h-9 items-center rounded-md border border-red-200 bg-red-50 px-3 text-sm text-red-700 hover:bg-red-100 disabled:opacity-60"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RoutinePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={apiAdd}
      />

      {/* keep derived value referenced to satisfy eslint in some configs */}
      <input type="hidden" value={orderedRoutineIds.length} readOnly />
    </div>
  );
}
