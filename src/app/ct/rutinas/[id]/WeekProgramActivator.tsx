"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function WeekProgramActivator({ baseRoutineId }: { baseRoutineId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleActivate() {
    setError(null);

    try {
      const res = await fetch(`/api/ct/routines/${baseRoutineId}/program`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Follows existing CSRF pattern used elsewhere in the app.
          "X-CT-CSRF": "1",
        },
        body: JSON.stringify({}),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "No se pudo activar la semana");

      startTransition(() => router.refresh());
    } catch (e: any) {
      setError(e?.message || "Error");
    }
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-medium">Activar semana desde esta rutina</div>
          <div className="text-sm text-muted-foreground">
            Se crearán 7 rutinas (Lun–Dom) clonadas desde esta rutina base.
          </div>
        </div>

        <button
          type="button"
          onClick={handleActivate}
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
        >
          {isPending ? "Activando…" : "Activar"}
        </button>
      </div>

      {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}
    </div>
  );
}
