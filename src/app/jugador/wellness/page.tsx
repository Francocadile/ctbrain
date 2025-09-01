// src/app/jugador/wellness/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { getPlayerName, clearPlayerName } from "@/lib/player";

function todayYMD() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function WellnessJugador() {
  const [date, setDate] = useState(todayYMD());
  const [name, setName] = useState("");
  const [sleepQuality, setSleepQuality] = useState<number | "">("");
  const [sleepHours, setSleepHours] = useState<string>("");
  const [fatigue, setFatigue] = useState<number | "">("");
  const [soreness, setSoreness] = useState<number | "">("");
  const [stress, setStress] = useState<number | "">("");
  const [mood, setMood] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [alreadySent, setAlreadySent] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const n = getPlayerName();
    setName(n);
  }, []);

  useEffect(() => {
    async function check() {
      if (!name) return;
      const res = await fetch(`/api/metrics/wellness?date=${date}&playerKey=${encodeURIComponent(name)}`, { cache: "no-store" });
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
    const body = {
      date,
      playerKey: name.trim(),
      sleepQuality: Number(sleepQuality || 0),
      sleepHours: sleepHours ? Number(sleepHours) : null,
      fatigue: Number(fatigue || 0),
      soreness: Number(soreness || 0),
      stress: Number(stress || 0),
      mood: Number(mood || 0),
      notes: notes.trim() || null,
    };
    const res = await fetch("/api/metrics/wellness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    setSending(false);
    if (res.status === 409) {
      setAlreadySent(true);
      alert("Ya enviaste wellness hoy");
      return;
    }
    if (!res.ok) {
      const t = await res.text();
      alert(t || "Error");
      return;
    }
    setAlreadySent(true);
    alert("¡Wellness enviado!");
  }

  function Select({
    value,
    onChange,
  }: {
    value: any;
    onChange: (v: number) => void;
  }) {
    return (
      <select
        className="w-full rounded-md border px-2 py-1.5"
        value={String(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={alreadySent || sending}
      >
        <option value="">Elegí…</option>
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    );
  }

  const partial = useMemo(
    () =>
      (Number(sleepQuality || 0) +
        Number(fatigue || 0) +
        Number(soreness || 0) +
        Number(stress || 0) +
        Number(mood || 0)) || 0,
    [sleepQuality, fatigue, soreness, stress, mood]
  );

  function logout() {
    clearPlayerName();
    window.location.href = "/jugador"; // vuelve al prompt
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

      <h1 className="text-xl font-bold">Wellness diario</h1>
      {alreadySent && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800 text-sm">
          Ya enviaste tu wellness para <b>{date}</b>. ¡Gracias!
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
            <label className="text-[12px] text-gray-500">Calidad de sueño (1–5)</label>
            <Select value={sleepQuality} onChange={setSleepQuality} />
          </div>
          <div>
            <label className="text-[12px] text-gray-500">Horas de sueño</label>
            <input
              className="w-full rounded-md border px-2 py-1.5"
              placeholder="Ej: 7.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              disabled={alreadySent || sending}
            />
          </div>
          <div>
            <label className="text-[12px] text-gray-500">Fatiga (1–5)</label>
            <Select value={fatigue} onChange={setFatigue} />
          </div>
          <div>
            <label className="text-[12px] text-gray-500">Dolor muscular (1–5)</label>
            <Select value={soreness} onChange={setSoreness} />
          </div>
          <div>
            <label className="text-[12px] text-gray-500">Estrés (1–5)</label>
            <Select value={stress} onChange={setStress} />
          </div>
          <div>
            <label className="text-[12px] text-gray-500">Ánimo (1–5)</label>
            <Select value={mood} onChange={setMood} />
          </div>
          <div className="md:col-span-2">
            <label className="text-[12px] text-gray-500">Comentario (opcional)</label>
            <textarea
              className="w-full rounded-md border px-2 py-1.5"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={alreadySent || sending}
            />
          </div>
        </div>

        <div className="text-sm text-gray-600">
          Puntaje parcial (sin horas): <b>{partial ? partial : "—"}</b>
        </div>

        <button
          onClick={submit}
          disabled={alreadySent || sending}
          className={`px-3 py-1.5 rounded-xl text-sm ${
            alreadySent || sending ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"
          }`}
        >
          {alreadySent ? "Ya enviado" : sending ? "Enviando…" : "Enviar Wellness"}
        </button>
      </div>
    </div>
  );
}
