// src/app/jugador/wellness/page.tsx
"use client";
import { useEffect, useState } from "react";
import { fetchSessionUser } from "@/lib/player";

function todayYMD() {
  return new Date().toISOString().slice(0, 10);
}

type Face = { value: 1|2|3|4|5; emoji: string; label: string; tone: string };

const FACES: Face[] = [
  { value: 1, emoji: "😞", label: "Muy mal",   tone: "bg-red-50  border-red-200  text-red-700" },
  { value: 2, emoji: "🙁", label: "Mal",       tone: "bg-orange-50 border-orange-200 text-orange-700" },
  { value: 3, emoji: "😐", label: "Normal",    tone: "bg-gray-50 border-gray-200 text-gray-700" },
  { value: 4, emoji: "🙂", label: "Bien",      tone: "bg-lime-50 border-lime-200 text-lime-700" },
  { value: 5, emoji: "😄", label: "Excelente", tone: "bg-emerald-50 border-emerald-200 text-emerald-700" },
];

function FaceScale({
  value,
  onChange,
}: {
  value: number | "";
  onChange: (v: 1|2|3|4|5) => void;
}) {
  return (
    <div className="flex gap-2">
      {FACES.map((f) => {
        const active = value === f.value;
        return (
          <button
            key={f.value}
            type="button"
            className={`flex-1 rounded-lg border px-2 py-2 text-sm text-center
              ${active ? f.tone + " ring-2 ring-black/30" : "bg-white"}`}
            onClick={() => onChange(f.value)}
            title={`${f.value} — ${f.label}`}
          >
            <div className="text-xl">{f.emoji}</div>
            <div className="mt-1 text-xs font-medium">{f.value} · {f.label}</div>
          </button>
        );
      })}
    </div>
  );
}

export default function WellnessJugador() {
  const [date, setDate] = useState(todayYMD());

  // Identidad del jugador desde NextAuth
  const [userId, setUserId] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [loadingIdentity, setLoadingIdentity] = useState(true);

  // Valores
  const [sleepQuality, setSleepQuality] = useState<number | "">("");
  const [sleepHours, setSleepHours] = useState<string>("");
  const [fatigue, setFatigue] = useState<number | "">("");
  const [soreness, setSoreness] = useState<number | "">("");
  const [stress, setStress] = useState<number | "">("");
  const [mood, setMood] = useState<number | "">("");
  const [notes, setNotes] = useState("");

  const [loaded, setLoaded] = useState(false);
  const [sent, setSent] = useState(false);

  // Cargar identidad (id + name/email)
  useEffect(() => {
    (async () => {
      try {
        const u = await fetchSessionUser();
        setUserId(u?.id || "");
        setName((u?.name || u?.email || "")?.trim());
      } finally {
        setLoadingIdentity(false);
      }
    })();
  }, []);

  // Prefill si ya envió hoy (prioriza userId; fallback playerKey)
  useEffect(() => {
    async function fetchExisting() {
      if (!userId && !name) { setLoaded(true); return; }

      const qp = userId
        ? `userId=${encodeURIComponent(userId)}`
        : `playerKey=${encodeURIComponent(name)}`;

      const url = `/api/metrics/wellness?date=${date}&${qp}`;
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
        setSleepQuality(""); setSleepHours("");
        setFatigue(""); setSoreness(""); setStress(""); setMood("");
        setNotes(""); setSent(false);
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
      userId,               // <- requerido por tu API
      playerKey: name || null, // compat opcional
      sleepQuality: Number(sleepQuality || 0),
      sleepHours: sleepHours ? Number(sleepHours) : null,
      fatigue: Number(fatigue || 0),
      soreness: Number(soreness || 0),
      stress: Number(stress || 0),
      mood: Number(mood || 0),
      comment: notes.trim() || null,
    };

    const res = await fetch("/api/metrics/wellness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) { alert((await res.text()) || "Error"); return; }
    setSent(true);
    alert("¡Wellness enviado!");
  }

  const partial =
    Number(sleepQuality || 0) +
    Number(fatigue || 0) +
    Number(soreness || 0) +
    Number(stress || 0) +
    Number(mood || 0) || 0;

  const submitDisabled =
    loadingIdentity ||
    !userId ||
    sleepQuality === "" ||
    fatigue === "" ||
    soreness === "" ||
    stress === "" ||
    mood === "";

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button onClick={() => history.back()} className="text-sm">&larr; Volver</button>
        <a href="/api/auth/signout?callbackUrl=/jugador" className="text-sm underline">Salir</a>
      </div>

      <h1 className="text-xl font-bold">Wellness diario</h1>
      <p className="text-sm text-gray-600">Elegí una carita (1–5) para cada ítem. 5 = mejor.</p>

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
          <label className="text-[12px] text-gray-500">Tu nombre (login)</label>
          <input className="w-full rounded-md border px-2 py-1.5" value={name} disabled />
        </div>
      </div>

      {/* Tarjeta con caritas */}
      <div className="rounded-2xl border bg-white p-4 space-y-4">
        <div>
          <div className="text-[12px] text-gray-500 mb-1">Calidad de sueño</div>
          <FaceScale value={sleepQuality} onChange={(v) => setSleepQuality(v)} />
        </div>

        <div className="grid md:grid-cols-2 gap-3 items-end">
          <div>
            <div className="text-[12px] text-gray-500 mb-1">Horas de sueño</div>
            <input
              className="w-full rounded-md border px-2 py-1.5"
              placeholder="Ej: 7.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
            />
          </div>
        </div>

        <div>
          <div className="text-[12px] text-gray-500 mb-1">Fatiga</div>
          <FaceScale value={fatigue} onChange={(v) => setFatigue(v)} />
        </div>

        <div>
          <div className="text-[12px] text-gray-500 mb-1">Dolor muscular</div>
          <FaceScale value={soreness} onChange={(v) => setSoreness(v)} />
        </div>

        <div>
          <div className="text-[12px] text-gray-500 mb-1">Estrés</div>
          <FaceScale value={stress} onChange={(v) => setStress(v)} />
        </div>

        <div>
          <div className="text-[12px] text-gray-500 mb-1">Ánimo</div>
          <FaceScale value={mood} onChange={(v) => setMood(v)} />
        </div>

        <div>
          <div className="text-[12px] text-gray-500 mb-1">Comentario (opcional)</div>
          <textarea
            className="w-full rounded-md border px-2 py-1.5"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Totales + enviado */}
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
            submitDisabled ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"
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
