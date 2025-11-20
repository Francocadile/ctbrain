"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type RoutineItemDTO = {
  id: string;
  title: string;
  description: string | null;
  order: number;
};

type RoutineDTO = {
  id: string;
  title: string;
  description: string | null;
  items: RoutineItemDTO[];
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

export function RoutineDetailClient({ routine }: { routine: RoutineDTO }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleUpdateRoutine(payload: { title?: string; description?: string | null }) {
    setError(null);
    try {
      await patchJSON(`/api/ct/routines/${routine.id}`, payload);
      startTransition(() => {
        router.refresh();
      });
    } catch (e: any) {
      setError(e?.message || "No se pudo actualizar la rutina");
    }
  }

  async function handleCreateItem(payload: { title: string; description?: string | null; order?: number }) {
    setError(null);
    try {
      await postJSON(`/api/ct/routines/${routine.id}/items`, payload);
      startTransition(() => {
        router.refresh();
      });
    } catch (e: any) {
      setError(e?.message || "No se pudo crear el item");
    }
  }

  async function handleUpdateItem(id: string, payload: { title?: string; description?: string | null; order?: number }) {
    setError(null);
    try {
      await patchJSON(`/api/ct/routines/items/${id}`, payload);
      startTransition(() => {
        router.refresh();
      });
    } catch (e: any) {
      setError(e?.message || "No se pudo actualizar el item");
    }
  }

  async function handleDeleteItem(id: string) {
    setError(null);
    try {
      await deleteJSON(`/api/ct/routines/items/${id}`);
      startTransition(() => {
        router.refresh();
      });
    } catch (e: any) {
      setError(e?.message || "No se pudo borrar el item");
    }
  }

  // UI muy básica / placeholder: edición inline mínima
  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <header className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-semibold">{routine.title}</h1>
            {routine.description && (
              <p className="text-sm text-gray-500 mt-1">{routine.description}</p>
            )}
          </div>
          <button
            type="button"
            className="text-xs rounded-md border px-3 py-1 hover:bg-gray-50"
            onClick={() => {
              const title = window.prompt("Nuevo título", routine.title)?.trim();
              if (!title) return;
              const description = window.prompt(
                "Nueva descripción (opcional)",
                routine.description || "",
              );
              void handleUpdateRoutine({ title, description: description?.trim() || null });
            }}
            disabled={isPending}
          >
            Editar nombre
          </button>
        </header>
      </section>

      <section className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
        <header className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-sm">Items de la rutina</h2>
          <button
            type="button"
            className="text-xs rounded-md border px-3 py-1 hover:bg-gray-50"
            onClick={() => {
              const title = window.prompt("Título del item")?.trim();
              if (!title) return;
              const description = window.prompt("Descripción (opcional)")?.trim();
              void handleCreateItem({ title, description: description || null });
            }}
            disabled={isPending}
          >
            Agregar item
          </button>
        </header>

        {routine.items.length === 0 ? (
          <p className="text-sm text-gray-500">Esta rutina no tiene items aún.</p>
        ) : (
          <ul className="space-y-2">
            {routine.items.map((it) => (
              <li
                key={it.id}
                className="rounded-lg border px-3 py-2 flex items-start justify-between bg-white"
              >
                <div>
                  <div className="text-sm font-medium">
                    #{it.order} — {it.title}
                  </div>
                  {it.description && (
                    <div className="text-xs text-gray-500 mt-0.5">{it.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    className="rounded-md border px-2 py-1 hover:bg-gray-50"
                    onClick={() => {
                      const title = window.prompt("Nuevo título", it.title)?.trim();
                      if (!title) return;
                      const description = window.prompt(
                        "Nueva descripción (opcional)",
                        it.description || "",
                      )?.trim();
                      const orderStr = window.prompt("Nuevo orden", String(it.order))?.trim();
                      const order = orderStr ? Number(orderStr) : it.order;
                      void handleUpdateItem(it.id, {
                        title,
                        description: description || null,
                        order: Number.isFinite(order) ? order : it.order,
                      });
                    }}
                    disabled={isPending}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="rounded-md border px-2 py-1 hover:bg-red-50 text-red-600 border-red-200"
                    onClick={() => {
                      if (!window.confirm("¿Borrar este item?")) return;
                      void handleDeleteItem(it.id);
                    }}
                    disabled={isPending}
                  >
                    Borrar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
