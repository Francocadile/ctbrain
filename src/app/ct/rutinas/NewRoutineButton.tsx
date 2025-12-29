"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function NewRoutineButton({
  fromSession,
  blockIndex,
}: {
  fromSession?: string;
  blockIndex?: number;
} = {}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleClick() {
    try {
      const res = await fetch("/api/ct/routines", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CT-CSRF": "1",
        },
        body: JSON.stringify({ title: "Nueva rutina" }),
      });

      if (!res.ok) {
        const text = await res.text();
        alert(text || `No se pudo crear la rutina (status ${res.status})`);
        throw new Error(text || `No se pudo crear la rutina (status ${res.status})`);
      }

      const json = await res.json();
      const id = json?.data?.id as string | undefined;

      if (!id) {
        alert("La rutina se creó pero no se recibió un ID válido.");
        console.error("Respuesta inesperada:", json);
        return;
      }

      startTransition(() => {
        let url = `/ct/rutinas/${id}`;
        if (fromSession && typeof blockIndex === "number" && blockIndex >= 0) {
          const sp = new URLSearchParams();
          sp.set("fromSession", fromSession);
          sp.set("block", String(blockIndex));
          url += `?${sp.toString()}`;
        }
        router.push(url);
      });
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Error creando la rutina.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {isPending ? "Creando…" : "Nueva rutina"}
    </button>
  );
}
