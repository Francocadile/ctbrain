// src/app/jugador/wellness/page.tsx
"use client";
import { useEffect, useState } from "react";
import { getPlayerIdentity } from "@/lib/player";

function todayYMD() {
  return new Date().toISOString().slice(0, 10);
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
  const [loaded, setLoaded] = useState(false);
  const [sent, setSent] = useState(false);

  // Cargar nombre desde la SESIÓN (login)
  useEffect(() => {
    (async () => {
      const id = await getPlayerIdentity(); // name || email
      setName(id);
    })();
  }, []);

  // Prefill si ya envió hoy
  useEffect(() => {
    async function fetchExisting() {
      if (!name) return;
      const url = `/api/metrics/wellness?date=${date}&playerKey=${encodeURIComponent(name)}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = res.ok ? await res.json() : [];
      if (Array.isArray(data) && data.length) {
        const r = data[0];
        setSleepQuality(r.sleepQuality ?? "");
        setSleepHours(r.sleepHours != null ? String(r.sleepHours) : "");
        setFatigue(r.fatigue ?? "");
        setSoreness(r.muscleSoreness ?? r.soreness ?? "");
        setStress(r.stress ?? "");
        setMood(r.mood ?? "");
        setNotes(r.comment ?? r.notes ?? "");
        setSent(true);
      } else {
        setSleepQuality("");
        setSleepHours("");
        setFatigue("");
        setSoreness("");
        setStress("");
        setMood("");
        setNotes("");
        setSent(false);
      }
      setLoaded(true);
    }
    fetchExisting();
  }, [date, name]);

  async function submit() {
    if (!name.trim()) {
      alert("Tu sesión no trae nombre/email. Cerrá sesión y volvé a entrar.");
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
      alert((await res.text()) || "Error");
      return;
    }
    setSent(true);
    alert("¡Wellness enviado!");
  }

  function signOut() {
    location.href = "/jugador";
  }

  const partial =
    Number(sleepQuality || 0) +
      Number(fatigue || 0) +
      Number(soreness || 0) +
      Number(stress || 0) +
      Number(mood || 0) || 0;

  const submitDisabled =
    !name ||
    sleepQuality === "" ||
    fatigue === "" ||
    soreness === "" ||
    stress === "" ||
    mood === "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => history.back()} className="text-sm">
          &larr; Volver
        </button>
        <button onClick={signOut} className="text-sm underline">
          Salir
        </button>
      </div>

      <h1 className="text-xl font-bold">Wellness diario</h1>
      <p className="text-sm text-gray-600">Escala 1–5. Completá una vez por día.</p>

      <div className="rounded-2xl border bg-white p-4 space-y-4">
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
            <label className="text-[12px] text-gray-500">Tu nombre (login)</label>
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
            />
          </div>
        </div>

        <div className="text-sm text-gray-600">
          Puntaje parcial (sin horas): <b>{partial ? partial : "—"}</b>
        </div>

        {loaded && sent && (
          <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">
            Ya enviaste tu Wellness hoy. Podés editar y volver a <b>Guardar</b>.
          </div>
        )}

        <button
          onClick={submit}
          disabled={submitDisabled}
          className={`px-3 py-1.5 rounded-xl text-sm ${
            submitDisabled
              ? "bg-gray-200 text-gray-500"
              : "bg-black text-white hover:opacity-90"
          }`}
        >
          {sent ? "Guardar cambios" : "Enviar Wellness"}
        </button>

        {!name && (
          <div className="text-xs text-red-600 mt-2">
            No pudimos leer tu nombre/email de la sesión. Cerrá sesión y volvé a iniciar.
          </div>
        )}
      </div>
    </div>
  );
}
