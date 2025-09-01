// src/app/jugador/rpe/page.tsx
"use client";

import { useEffect, useState } from "react";
import { fetchSessionUser, clearPlayerName } from "@/lib/player";

function todayYMD() { return new Date().toISOString().slice(0,10); }

export default function RPEJugador() {
  const [date, setDate] = useState(todayYMD());
  const [userId, setUserId] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [loadingIdentity, setLoadingIdentity] = useState(true);

  const [rpe, setRpe] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const [sent, setSent] = useState(false);

  // Cargar identidad desde NextAuth (id + name/email)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const u = await fetchSessionUser();
        if (!alive) return;
        setUserId(u?.id || "");
        setName((u?.name || u?.email || "")?.trim());
      } finally {
        if (alive) setLoadingIdentity(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Prefill si ya envió hoy (priorizar userId; si no, playerKey)
  useEffect(() => {
    async function fetchExisting() {
      if (!userId && !name) { setLoaded(true); return; }
      const qp = userId
        ? `userId=${encodeURIComponent(userId)}`
        : `playerKey=${encodeURIComponent(name)}`;
      const url = `/api/metrics/rpe?date=${date}&${qp}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = res.ok ? await res.json() : [];
      if (Array.isArray(data) && data.length) {
        const row = data[0];
        setRpe(String(row.rpe ?? ""));
        setSent(true);
      } else {
        setRpe("");
        setSent(false);
      }
      setLoaded(true);
    }
    fetchExisting();
  }, [date, userId, name]);

  async function submit() {
    if (loadingIdentity) { alert("Cargando identidad…"); return; }
    if (!userId) { alert("userId y date requeridos"); return; }

    const body = {
      date,
      userId,                // <- requerido por la API
      playerKey: name || null, // compat (por si lo usás en CT)
      rpe: Number(rpe || 0),
    };

    const res = await fetch("/api/metrics/rpe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!res.ok) {
      const msg = await res.text();
      alert(msg || "Error");
      return;
    }

    setSent(true);
    alert("¡RPE enviado!");
  }

  function signOut() {
    clearPlayerName(); // compat
    window.location.href = "/api/auth/signout?callbackUrl=/jugador";
  }

  const submitDisabled = loadingIdentity || !userId || rpe === "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={()=>history.back()} className="text-sm">&larr; Volver</button>
        <button onClick={signOut} className="text-sm underline">Salir</button>
      </div>

      <h1 className="text-xl font-bold">RPE post-entrenamiento</h1>
      <p className="text-sm text-gray-600">RPE 0–10. La <b>duración</b> la completa el <b>CT</b>.</p>

      <div className="rounded-2xl border bg-white p-4 space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] text-gray-500">Fecha</label>
            <input
              type="date"
              className="w-full rounded-md border px-2 py-1.5"
              value={date}
              onChange={(e)=>setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[12px] text-gray-500">Tu nombre</label>
            <input
              className="w-full rounded-md border px-2 py-1.5"
              value={loadingIdentity ? "Cargando…" : (name || "—")}
              disabled
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-[12px] text-gray-500">RPE (0–10)</label>
            <input
              className="w-full md:w-64 rounded-md border px-2 py-1.5"
              placeholder="Ej: 6"
              value={rpe}
              onChange={(e)=> setRpe(e.target.value)}
              inputMode="numeric"
            />
          </div>
        </div>

        {loaded && sent && (
          <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">
            Ya enviaste tu RPE hoy. Podés corregirlo y volver a <b>Guardar</b>.
          </div>
        )}

        <button
          onClick={submit}
          disabled={submitDisabled}
          className={`px-3 py-1.5 rounded-xl text-sm ${
            submitDisabled ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"
          }`}
        >
          {sent ? "Guardar cambios" : "Enviar RPE"}
        </button>
      </div>
    </div>
  );
}
