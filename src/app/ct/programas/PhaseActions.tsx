"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function PhaseActions({
  phaseId,
  initialTitle,
}: {
  phaseId: string;
  initialTitle: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);

  async function handleRename() {
    const next = title.trim();
    if (!next) return;

    startTransition(async () => {
      const res = await fetch(`/api/ct/routine-programs/phases/${phaseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CT-CSRF": "1",
        },
        body: JSON.stringify({ title: next }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json?.error || "No se pudo renombrar");
        return;
      }

      setIsEditing(false);
      router.refresh();
    });
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar fase? Se quitarán sus rutinas.")) return;

    startTransition(async () => {
      const res = await fetch(`/api/ct/routine-programs/phases/${phaseId}`, {
        method: "DELETE",
        headers: {
          "X-CT-CSRF": "1",
        },
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json?.error || "No se pudo eliminar");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isEditing ? (
        <>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-9 w-56 rounded-md border bg-background px-3 text-sm"
          />
          <button
            type="button"
            onClick={handleRename}
            disabled={isPending}
            className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm hover:bg-muted disabled:opacity-60"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => {
              setTitle(initialTitle);
              setIsEditing(false);
            }}
            disabled={isPending}
            className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm hover:bg-muted disabled:opacity-60"
          >
            Cancelar
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            disabled={isPending}
            className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm hover:bg-muted disabled:opacity-60"
          >
            Renombrar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="inline-flex h-9 items-center rounded-md border border-red-200 bg-red-50 px-3 text-sm text-red-700 hover:bg-red-100 disabled:opacity-60"
          >
            Eliminar
          </button>
        </>
      )}
    </div>
  );
}
