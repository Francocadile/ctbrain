// src/app/jugador/wellness/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getPlayerName } from "@/lib/player";

function todayYMD() {
  const d = new Date();
  return d.toISOString().slice(0,10);
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

  useEffect(() => setName(getPlayerName()), []);

  async function submit() {
    if (!name.trim()) {
      alert("Fijate que arriba diga tu nombre (botón Cambiar nombre).");
      return;
    }
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
    if (!res.ok) {
      const t = await res.text();
      alert(t || "Error");
      return;
    }
    alert("¡Wellness enviado!");
  }

  function Select({ value, onChange }: { value: any, onChange: (v:number)=>void }) {
    return (
      <select
        className="w-full rounded-md border px-2 py-1.5"
        value={String(value)}
        onChange={(e)=> onChange(Number(e.target.value))}
      >
        <option value="">Elegí…</option>
        {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
      </select>
    );
  }

  const partial =
    (Number(sleepQuality||0) + Number(fatigue||0) + Number(soreness||0) + Number(stress||0) + Number(mood||0)) || 0;

  return (
    <div className="space-y-4">
      <button onClick={()=>history.back()} className="text-sm">&larr; Volver</button>
      <h1 className="text-xl font-bold">Wellness diario</h1>

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
            <label className="text-[12px] text-gray-500">Calidad de sueño (1–5)</label>
            <Select value={sleepQuality} onChange={setSleepQuality} />
          </div>
          <div>
            <label className="text-[12px] text-gray-500">Horas de sueño</label>
            <input className="w-full rounded-md border px-2 py-1.5" placeholder="Ej: 7.5" value={sleepHours} onChange={e=>setSleepHours(e.target.value)} />
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
            <textarea className="w-full rounded-md border px-2 py-1.5" rows={3} value={notes} onChange={e=>setNotes(e.target.value)} />
          </div>
        </div>

        <div className="text-sm text-gray-600">
          Puntaje parcial (sin horas): <b>{partial ? partial : "—"}</b>
        </div>

        <button onClick={submit} className="px-3 py-1.5 rounded-xl bg-black text-white text-sm hover:opacity-90">
          Enviar Wellness
        </button>
      </div>
    </div>
  );
}
