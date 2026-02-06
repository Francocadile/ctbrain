"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

type Weekday = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export default function DuplicateForDayButton({
  baseRoutineId,
  weekNumber,
  weekday,
}: {
  baseRoutineId: string;
  weekNumber: number;
  weekday: Weekday;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleClick() {
    const ok = window.confirm(
      "Esto creará una copia de la rutina solo para este día. ¿Continuar?",
    );
    if (!ok) return;

    startTransition(async () => {
      const res = await fetch(`/api/ct/routines/${baseRoutineId}/clone-for-day`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CT-CSRF": "1",
        },
        body: JSON.stringify({ weekNumber, weekday }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json?.error || "No se pudo duplicar la rutina para este día");
        return;
      }

      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
    >
      {isPending ? "Duplicando…" : "Duplicar para este día"}
    </button>
  );
}
