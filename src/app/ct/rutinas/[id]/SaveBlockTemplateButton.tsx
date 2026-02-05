"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export default function SaveBlockTemplateButton({
  blockId,
  defaultTitle,
}: {
  blockId: string;
  defaultTitle: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleSave() {
    const title = prompt("Nombre del template", defaultTitle) ?? "";
    const trimmed = title.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const res = await fetch("/api/ct/block-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CT-CSRF": "1",
        },
        body: JSON.stringify({ title: trimmed, sourceBlockId: blockId }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json?.error || "No se pudo guardar el template");
        return;
      }

      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={isPending}
      className="inline-flex h-8 items-center rounded-md border bg-background px-2 text-xs hover:bg-muted disabled:opacity-60"
      title="Guardar este bloque como template"
    >
      {isPending ? "Guardando…" : "Guardar como template"}
    </button>
  );
}
