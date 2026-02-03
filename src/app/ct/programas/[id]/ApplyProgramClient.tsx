"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Mode = "cycle" | "truncate";

export default function ApplyProgramClient({ programId }: { programId: string }) {
  const router = useRouter();
  const [sessionIdsText, setSessionIdsText] = useState("");
  const [startDayIndex, setStartDayIndex] = useState(1);
  const [mode, setMode] = useState<Mode>("cycle");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleApply() {
    setError(null);
    setMessage(null);

    const sessionIds = sessionIdsText
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (sessionIds.length === 0) {
      setError("Pegá al menos un sessionId");
      return;
    }

    try {
      const res = await fetch(`/api/ct/routine-programs/${programId}/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CT-CSRF": "1",
        },
        body: JSON.stringify({ sessionIds, startDayIndex, mode }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "No se pudo aplicar el programa");
      }

      setMessage(
        `Aplicado: ${json?.data?.appliedCount ?? 0}, omitidos: ${json?.data?.skippedCount ?? 0}`,
      );

      startTransition(() => router.refresh());
    } catch (e: any) {
      setError(e?.message || "Error");
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        className="w-full rounded-md border px-3 py-2 text-sm"
        rows={4}
        value={sessionIdsText}
        onChange={(e) => setSessionIdsText(e.target.value)}
        placeholder="Pegá sessionIds separados por coma o espacios"
      />

      <div className="grid gap-2 md:grid-cols-3">
        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-700">startDayIndex</div>
          <input
            type="number"
            value={startDayIndex}
            min={1}
            onChange={(e) => setStartDayIndex(Number(e.target.value || 1))}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-700">mode</div>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            className="w-full rounded-md border px-3 py-2 text-sm bg-white"
          >
            <option value="cycle">cycle</option>
            <option value="truncate">truncate</option>
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={handleApply}
        disabled={isPending}
        className="inline-flex items-center rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
      >
        {isPending ? "Aplicando..." : "Aplicar"}
      </button>

      {message && <p className="text-xs text-gray-600">{message}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}

      <p className="text-[11px] text-gray-500">
        Política: no pisa snapshots existentes (si ya hay SessionRoutineItem para esa rutina+sesión, se omite).
      </p>
    </div>
  );
}
