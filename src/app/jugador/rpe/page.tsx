// src/app/jugador/rpe/page.tsx
"use client";

import { useState } from "react";

function todayYMD() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 10);
}

export default function RPEForm() {
  const [date, setDate] = useState(todayYMD());
  const [userId, setUserId] = useState("");
  const [rpe, setRpe] = useState<number | "">("");
  const [duration, setDuration] = useState<number | "">(""); // opcional (CT suele cargar)
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId.trim()) {
      alert("Ingresá tu ID de jugador (por ahora sin login).");
      return;
    }
    if (rpe === "" || Number.isNaN(Number(rpe))) {
      alert("Ingresá un RPE (0–10).");
      return;
    }

    const body = {
      userId: userId.trim(),
      date, // YYYY-MM-DD
      rpe: Math.max(0, Math.min(10, Number(rpe))),
      // si el jugador no sabe la duración, la dejamos vacía y el CT la setea luego
      duration: duration === "" ? undefined : Math.max(0, Number(duration)),
    };

    setSaving(true);
    try {
      const res = await fetch("/api/metrics/rpe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      alert("¡RPE enviado!");
      // no limpiamos RPE para que pueda mandar el de otro día si quiere cambiar fecha
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Error al enviar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">RPE post-entrenamiento</h1>
          <p className="text-sm text-gray-600">
            RPE 0–10. La duración la completa el CT si no la sabés.
          </p>
        </div>
        <a
          href="/jugador"
          className="text-xs rounded-xl border px-3 py-1.5 hover:bg-gray-50"
        >
          ← Volver
        </a>
      </header>

      <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-white p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-[11px] text-gray-500">Fecha</label>
            <input
              type="date"
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-[11px] text-gray-500">Tu ID de jugador</label>
            <input
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              placeholder="Ej: JUG-001"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-[11px] text-gray-500">RPE (0–10)</label>
            <input
              type="number"
              min={0}
              max={10}
              step={1}
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              placeholder="Ej: 6"
              value={rpe === "" ? "" : rpe}
              onChange={(e) =>
                setRpe(e.target.value === "" ? "" : Number(e.target.value))
              }
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-gray-500">
              Duración (min) — opcional
            </label>
            <input
              type="number"
              min={0}
              step={1}
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              placeholder="Ej: 90"
              value={duration === "" ? "" : duration}
              onChange={(e) =>
                setDuration(e.target.value === "" ? "" : Number(e.target.value))
              }
            />
            <div className="text-[11px] text-gray-500">
              Si no la sabés, dejalo vacío. El CT puede aplicar un valor por defecto
              para ese día y se recalcula el sRPE automáticamente.
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className={`px-4 py-2 rounded-xl text-sm ${
              saving ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"
            }`}
          >
            {saving ? "Enviando…" : "Enviar RPE"}
          </button>
        </div>
      </form>
    </div>
  );
}
