// src/app/jugador/rpe/page.tsx
"use client";
import { useEffect, useState } from "react";
import { fetchSessionUser, clearPlayerName } from "@/lib/player";

// Util simple
function todayYMD() {
  return new Date().toISOString().slice(0, 10);
}

type BorgStep = {
  value: number;
  label: string;
  tone: string; // tailwind bg color
};

const BORG_STEPS: BorgStep[] = [
  { value: 0,  label: "REPOSO",                      tone: "bg-sky-300" },
  { value: 1,  label: "MUY MUY SUAVE",               tone: "bg-sky-300" },
  { value: 2,  label: "MUY SUAVE",                   tone: "bg-sky-300" },
  { value: 3,  label: "SUAVE",                       tone: "bg-lime-200" },
  { value: 4,  label: "ALGO DURO",                   tone: "bg-lime-300" },
  { value: 5,  label: "DURO",                        tone: "bg-yellow-200" },
  { value: 6,  label: "MÁS DURO",                    tone: "bg-yellow-300" },
  { value: 7,  label: "MUY DURO",                    tone: "bg-orange-300" },
  { value: 8,  label: "MUY MUY DURO",                tone: "bg-orange-400" },
  { value: 9,  label: "MÁXIMO",                      tone: "bg-red-500" },
  { value: 10, label: "EXTREMADAMENTE MÁXIMO",       tone: "bg-red-600" },
];

export default function RPEJugador() {
  const [date, setDate] = useState(todayYMD());
  const [userId, setUserId] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [loadingIdentity, setLoadingIdentity] = useState(true);

  const [rpe, setRpe] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [sent, setSent] = useState(false);

  // Identidad (NextAuth)
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

  // Prefill si ya envió hoy
  useEffect(() => {
    async function fetchExisting() {
      if (!userId && !name) { setLoaded(true); return; }
      const qp = userId ? `userId=${encodeURIComponent(userId)}` : `playerKey=${encodeURIComponent(name)}`;
      const url = `/api/metrics/rpe?date=${date}&${qp}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = res.ok ? await res.json() : [];
      if (Array.isArray(data) && data.length) {
        const row = data[0];
        setRpe(Number(row.rpe ?? 0));
        setSent(true);
      } else {
        setRpe(null);
        setSent(false);
      }
      setLoaded(true);
    }
    fetchExisting();
  }, [date, userId, name]);

  async function submit() {
    if (loadingIdentity) { alert("Cargando identidad…"); return; }
    if (!userId) { alert("userId y date requeridos"); return; }
    if (rpe == null) { alert("Elegí un valor de la escala (0–10)"); return; }

    const body = {
      date,
      userId,           // tu API lo requiere
      playerKey: name,  // compat
      rpe: Number(rpe),
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
    clearPlayerName();
    window.location.href = "/api/auth/signout?callbackUrl=/jugador";
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button onClick={() => history.back()} className="text-sm">&larr; Volver</button>
        <button onClick={signOut} className="text-sm underline">Salir</button>
      </div>

      <h1 className="text-xl font-bold">RPE — Escala de Borg</h1>
      <p className="text-sm text-gray-600">
        Seleccioná un número del <b>0</b> al <b>10</b> que represente tu sensación subjetiva del trabajo realizado.
      </p>

      {/* Fecha + identidad */}
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
          <input
            className="w-full rounded-md border px-2 py-1.5"
            value={loadingIdentity ? "Cargando…" : name || "—"}
            disabled
          />
        </div>
      </div>

      {/* Escalera Borg */}
      <div className="rounded-2xl border bg-white p-3">
        <div className="space-y-2">
          {BORG_STEPS.map((s) => {
            const active = rpe === s.value;
            return (
              <button
                key={s.value}
                className={`w-full text-left rounded-md border px-3 py-2 font-semibold tracking-wide
                  ${s.tone} ${active ? "ring-2 ring-black/50" : ""}`}
                onClick={() => setRpe(s.value)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg">{s.value}</span>
                  <span className="uppercase">{s.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {loaded && sent && (
          <div className="mt-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">
            Ya enviaste tu RPE hoy. Podés corregirlo y volver a <b>Guardar</b>.
          </div>
        )}

        <div className="mt-3">
          <button
            onClick={submit}
            disabled={loadingIdentity || !userId || rpe == null}
            className={`px-3 py-1.5 rounded-xl text-sm
              ${loadingIdentity || !userId || rpe == null ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"}`}
          >
            {sent ? "Guardar cambios" : "Enviar RPE"}
          </button>
        </div>
      </div>
    </div>
  );
}
