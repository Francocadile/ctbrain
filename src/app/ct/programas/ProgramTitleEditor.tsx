"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function ProgramTitleEditor({
  programId,
  initialTitle,
  initialDescription,
}: {
  programId: string;
  initialTitle: string;
  initialDescription: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setTitle(initialTitle);
    setDescription(initialDescription ?? "");
    setDirty(false);
  }, [initialTitle, initialDescription]);

  async function handleSave() {
    startTransition(async () => {
      const res = await fetch(`/api/ct/routine-programs/${programId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CT-CSRF": "1",
        },
        body: JSON.stringify({
          title,
          description: description.trim() ? description.trim() : null,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json?.error || "No se pudo guardar");
        return;
      }

      setDirty(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="program-title">Título</label>
        <input
          id="program-title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setDirty(true);
          }}
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="program-desc">Descripción</label>
        <textarea
          id="program-desc"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setDirty(true);
          }}
          className="min-h-[72px] w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !dirty}
          className="inline-flex items-center justify-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {isPending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
