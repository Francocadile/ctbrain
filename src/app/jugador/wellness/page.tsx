// src/app/jugador/wellness/page.tsx
"use client";

import { useMemo, useState } from "react";

function todayYMD() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 10);
}

export default function WellnessForm() {
  const [date, setDate] = useState(todayYMD());
  const [userId, setUserId] = useState("");
  const [sleepQuality, setSleepQuality] = useState<number | "">("");
  const [sleepHours, setSleepHours] = useState<number | "">("");
  const [fatigue, setFatigue] = useState<number | "">("");
  const [soreness, setSoreness] = useState<number | "">("");
  const [stress, setStress] = useState<number | "">("");
  const [mood, setMood] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const total = useMemo(() => {
    const vals = [sleepQuality, fatigue, soreness, stress, mood]
      .map((v) => (typeof v === "number" ? v : 0));
    return vals.reduce((a, b) => a + b, 0);
  }, [sleepQuality, fatigue, soreness, stress, mood]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId.trim()) {
      alert("Ingresá tu ID de jugador (por ahora sin login).");
      return;
    }
    // Validaciones mínimas (1–5)
    const scale = (v: number | "") =>
      typeof v === "number" ? Math.max(1, Math.min(5, v)) : undefined;
    const body = {
      userId: userId.trim(),
      date, // YYYY-MM-DD
      sleepQuality: scale(sleepQuality),
      sleepHours: sleepHours === "" ? undefined : Number(sleepHours),
      fatigue: scale(fatigue),
      soreness: scale(soreness),
      stress: scale(stress),
      mood: scale(mood),
      notes: notes.trim() || undefined,
    };

    setSaving(true);
    try {
      const res = await fetch("/api/metrics/wellness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      alert("¡Wellness enviado!");
      // limpiar solo comentario
      setNotes("");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Error al enviar");
    } finally {
      setSaving(false);
    }
  }

  const Select1a5 = (props: {
    value: number | "";
    onChange: (n: number | "") => void;
    placeholder?: string;
  }) => (
    <select
      className="w-full rounded-md border px-2 py-1.5 text-sm"
      value={props.value === "" ? "" : String(props.value)}
      onChange={(e) =>
        props.onChange(e.target.value === "" ? "" : Number(e.target.value))
      }
    >
      <option value="">{props.placeholder ?? "—"}</option>
      <option value="1">1</option>
      <option value="2">2</option>
      <option value="3">3</option>
      <option value="4">4</option>
      <option value="5">5</option>
    </select>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Wellness diario</h1>
          <p className="text-sm text-gray-600">
            Escala 1–5. Completá una vez por día.
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
            <label className="text-[11px] text-gray-500">Calidad de sueño (1–5)</label>
            <Select1a5 value={sleepQuality} onChange={setSleepQuality} placeholder="Elegí…" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-gray-500">Horas de sueño</label>
            <input
              type="number"
              min={0}
              step={0.5}
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              placeholder="Ej: 7.5"
              value={sleepHours === "" ? "" : sleepHours}
              onChange={(e) =>
                setSleepHours(e.target.value === "" ? "" : Number(e.target.value))
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-gray-500">Fatiga (1–5)</label>
            <Select1a5 value={fatigue} onChange={setFatigue} placeholder="Elegí…" />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-gray-500">Dolor muscular (1–5)</label>
            <Select1a5 value={soreness} onChange={setSoreness} placeholder="Elegí…" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-gray-500">Estrés (1–5)</label>
            <Select1a5 value={stress} onChange={setStress} placeholder="Elegí…" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-gray-500">Ánimo (1–5)</label>
            <Select1a5 value={mood} onChange={setMood} placeholder="Elegí…" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] text-gray-500">Comentario (opcional)</label>
          <textarea
            rows={3}
            className="w-full rounded-md border px-2 py-1.5 text-sm"
            placeholder='Ej: "Dormí poco por viaje"'
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-600">
            Puntaje parcial (sin horas): <b>{total || "—"}</b>
          </div>
          <button
            type="submit"
            disabled={saving}
            className={`px-4 py-2 rounded-xl text-sm ${
              saving ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"
            }`}
          >
            {saving ? "Enviando…" : "Enviar Wellness"}
          </button>
        </div>
      </form>
    </div>
  );
}
