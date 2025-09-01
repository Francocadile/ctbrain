// src/app/jugador/rpe/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getPlayerIdentity, clearPlayerName } from "@/lib/player";

function todayYMD() { return new Date().toISOString().slice(0,10); }

export default function RPEJugador() {
  const [date, setDate] = useState(todayYMD());
  const [name, setName] = useState("");
  const [loadingName, setLoadingName] = useState(true);

  const [rpe, setRpe] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const [sent, setSent] = useState(false);

  // Cargar nombre desde sesión (NextAuth)
  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const n = await getPlayerIdentity();
        if (ok) setName(n || "");
      } finally {
        if (ok) setLoadingName(false);
      }
    })();
    return () => { ok = false; };
  }, []);

  // Prefill si ya envió hoy
  useEffect(() => {
    async function fetchExisting() {
      if (!name) { setLoaded(true); return; }
      const url = `/api/metrics/rpe?date=${date}&playerKey=${encodeURIComponent(name)}`;
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
  }, [date, name]);

  async function submit() {
    if (loadingName) { alert("Cargando identidad…"); return; }
    if (!name.trim()) { alert("No hay nombre seleccionado."); return; }

    const body = { date, playerKey: name.trim(), rpe: Number(rpe || 0) };
    const res = await fetch("/api/metrics/rpe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) { alert((await res.text()) || "Error"); return; }
    setSent(true);
    alert("¡RPE enviado!");
  }

  function signOut() {
    // Compat localStorage + signout de NextAuth
    clearPlayerName();
    window.location.href = "/api/auth/signout?callbackUrl=/jugador";
  }

  const submitDisabled = loadingName || !name || rpe === "";

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
              value={loadingName ? "Cargando…" : (name || "—")}
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
