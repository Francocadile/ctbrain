// src/app/jugador/rpe/page.tsx
"use client";

import { useEffect, useState } from "react";
import { fetchSessionUser, getPlayerDisplayName } from "@/lib/player";

function todayYMD() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function RPEJugador() {
  const [date, setDate] = useState(todayYMD());
  const [userId, setUserId] = useState<string>("");
  const [name, setName] = useState<string>("");

  const [rpe, setRpe] = useState<string>(""); // string para controlar el input
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cargar sesión
  useEffect(() => {
    (async () => {
      const u = await fetchSessionUser();
      setUserId(u?.id || "");
      setName((await getPlayerDisplayName()) || "");
      setLoading(false);
    })();
  }, []);

  // Prefill si ya existe RPE de ese día
  useEffect(() => {
    if (!userId || !date) return;
    (async () => {
      const q = new URLSearchParams({ date, userId });
      const res = await fetch(`/api/metrics/rpe?${q.toString()}`, { cache: "no-store" });
      if (!res.ok) return;
      const rows = await res.json();
      const row = Array.isArray(rows) ? rows[0] : null;
      if (row) {
        setExists(true);
        setRpe(row.rpe != null ? String(row.rpe) : "");
      } else {
        setExists(false);
        setRpe("");
      }
    })();
  }, [userId, date]);

  async function submit() {
    if (!userId) {
      alert("Necesitás estar logueado para enviar el RPE.");
      return;
    }
    const num = Number(rpe);
    if (!Number.isFinite(num) || num < 0 || num > 10) {
      alert("RPE debe ser un número entre 0 y 10.");
      return;
    }
    const body = {
      date,
      userId, // usamos el ID real del usuario
      rpe: Math.round(num), // nuestro schema usa Int
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
    setExists(true);
    alert(exists ? "¡RPE actualizado!" : "¡RPE enviado!");
  }

  return (
    <div className="space-y-4">
      <a href="/jugador" className="text-sm">
        &larr; Volver
      </a>
      <h1 className="text-xl font-bold">RPE post-entrenamiento</h1>
      <p className="text-sm text-gray-600">
        RPE 0–10. La <b>duración</b> la completa el <b>CT</b>.
      </p>

      <div className="rounded-2xl border bg-white p-4 space-y-4">
        {loading ? (
          <div>Cargando…</div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] text-gray-500">Fecha</label>
                <input
                  type="date"
                  className="w-full rounded-md border px-2 py-1.5"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[12px] text-gray-500">Tu nombre</label>
                <input className="w-full rounded-md border px-2 py-1.5" value={name} disabled />
              </div>
              <div>
                <label className="text-[12px] text-gray-500">RPE (0–10)</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={1}
                  className="w-full rounded-md border px-2 py-1.5"
                  placeholder="Ej: 6"
                  value={rpe}
                  onChange={(e) => setRpe(e.target.value)}
                />
              </div>
            </div>

            <button
              onClick={submit}
              className="px-3 py-1.5 rounded-xl bg-black text-white text-sm hover:opacity-90"
            >
              {exists ? "Actualizar RPE" : "Enviar RPE"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
