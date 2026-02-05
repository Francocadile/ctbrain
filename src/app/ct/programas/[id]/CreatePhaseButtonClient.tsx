"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function CreatePhaseButtonClient({
  programId,
  existingCount,
}: {
  programId: string;
  existingCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleCreate() {
    startTransition(async () => {
      const res = await fetch(`/api/ct/routine-programs/${programId}/phases`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CT-CSRF": "1",
        },
        body: JSON.stringify({}),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json?.error || "No se pudo crear la fase");
        return;
      }

      // We stay on the program page and refresh to show the new phase.
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleCreate}
      disabled={isPending}
      className="inline-flex items-center justify-center rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
      title={existingCount === 0 ? "Crear tu primera fase" : "Crear otra fase"}
    >
      {isPending ? "Creando…" : "Nueva fase"}
    </button>
  );
}
