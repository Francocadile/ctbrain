// src/app/jugador/rpe/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getPlayerName, clearPlayerName } from "@/lib/player";

function todayYMD() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function RPEJugador() {
  const [date, setDate] = useState(todayYMD());
  const [name, setName] = useState("");
  const [rpe, setRpe] = useState<string>("");
  const [alreadySent, setAlreadySent] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => setName(getPlayerName()), []);

  useEffect(() => {
    async function check() {
      if (!name) return;
      const res = await fetch(`/api/metrics/rpe?date=${date}&playerKey=${encodeURIComponent(name)}`, { cache: "no-store" });
      if (res.ok) {
        const rows = await res.json();
        setAlreadySent(Array.isArray(rows) && rows.length > 0);
      }
    }
    check();
  }, [name, date]);

  async function submit() {
    if (!name.trim()) {
      alert("Fijate que arriba diga tu nombre (botón Cambiar nombre).");
      return;
    }
    setSending(true);
    const body = { date, playerKey: name.trim(), rpe: Number(rpe || 0) };
    const res = await fetch("/api/metrics/rpe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    setSending(false);
    if (res.status === 409) {
      setAlreadySent(true);
      alert("Ya enviaste RPE hoy");
      return;
    }
    if (!res.ok) {
      const t = await res.text();
      alert(t || "Error");
      return;
    }
    setAlreadySent(true);
    alert("¡RPE enviado!");
  }

  function logout() {
    clearPlayerName();
    window.location.href = "/jugador";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => history.back()} className="text-sm">
          &larr; Volver
        </button>
        <button onClick={logout} className="text-xs rounded border px-2 py-1 hover:bg-gray-50">
          Salir
        </button>
      </div>

      <h1 className="text-xl font-bold">RPE post-entrenamiento</h1>
      <p className="text-sm text-gray-600">
        RPE 0–10. La <b>duración</b> la completa el <b>CT</b>.
      </p>

      {alreadySent && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800 text-sm">
          Ya enviaste tu RPE para <b>{date}</b>. ¡Gracias!
        </div>
      )}

      <div className="rounded-2xl border bg-white p-4 space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] text-gray-500">Fecha</label>
            <input
              type="date"
              className="w-full rounded-md border px-2 py-1.5"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={alreadySent || sending}
            />
          </div>
          <div>
            <label className="text-[12px] text-gray-500">Tu nombre</label>
            <input className="w-full rounded-md border px-2 py-1.5" value={name} disabled />
          </div>
          <div>
            <label className="text-[12px] text-gray-500">RPE (0–10)</label>
            <input
              className="w-full rounded-md border px-2 py-1.5"
              placeholder="Ej: 6"
              value={rpe}
              onChange={(e) => setRpe(e.target.value)}
              inputMode="numeric"
              disabled={alreadySent || sending}
            />
          </div>
        </div>

        <button
          onClick={submit}
          disabled={alreadySent || sending}
          className={`px-3 py-1.5 rounded-xl text-sm ${
            alreadySent || sending ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"
          }`}
        >
          {alreadySent ? "Ya enviado" : sending ? "Enviando…" : "Enviar RPE"}
        </button>
      </div>
    </div>
  );
}
