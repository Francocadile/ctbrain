"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function CreateProgramButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleCreate() {
    try {
      const res = await fetch("/api/ct/routine-programs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CT-CSRF": "1",
        },
        body: JSON.stringify({}),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "No se pudo crear el programa");

      const id = json?.program?.id as string | undefined;
      if (!id) throw new Error("Programa creado pero sin id");

      startTransition(() => router.push(`/ct/programas/${id}`));
    } catch (e: any) {
      alert(e?.message || "Error");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCreate}
      disabled={isPending}
      className="inline-flex items-center justify-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
    >
      {isPending ? "Creando…" : "Nuevo programa"}
    </button>
  );
}
