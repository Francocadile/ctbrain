// src/app/jugador/rpe/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getPlayerName } from "@/lib/player";

function todayYMD() {
  const d = new Date();
  return d.toISOString().slice(0,10);
}

export default function RPEJugador() {
  const [date, setDate] = useState(todayYMD());
  const [name, setName] = useState("");
  const [rpe, setRpe] = useState<string>("");

  useEffect(() => setName(getPlayerName()), []);

  async function submit() {
    if (!name.trim()) {
      alert("Fijate que arriba diga tu nombre (botón Cambiar nombre).");
      return;
    }
    const body = {
      date,
      playerKey: name.trim(),
      rpe: Number(rpe || 0),
      // duración NO se envía (la cargará CT por default y recalcula sRPE)
    };
    const res = await fetch("/api/metrics/rpe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      const t = await res.text();
      alert(t || "Error");
      return;
    }
    alert("¡RPE enviado!");
  }

  return (
    <div className="space-y-4">
      <button onClick={()=>history.back()} className="text-sm">&larr; Volver</button>
      <h1 className="text-xl font-bold">RPE post-entrenamiento</h1>
      <p className="text-sm text-gray-600">RPE 0–10. La <b>duración</b> la completa el <b>CT</b>.</p>

      <div className="rounded-2xl border bg-white p-4 space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] text-gray-500">Fecha</label>
            <input type="date" className="w-full rounded-md border px-2 py-1.5" value={date} onChange={e=>setDate(e.target.value)} />
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
              onChange={(e)=> setRpe(e.target.value)}
              inputMode="numeric"
            />
          </div>
        </div>

        <button onClick={submit} className="px-3 py-1.5 rounded-xl bg-black text-white text-sm hover:opacity-90">
          Enviar RPE
        </button>
      </div>
    </div>
  );
}
