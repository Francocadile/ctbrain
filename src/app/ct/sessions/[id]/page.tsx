// src/app/ct/sessions/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getSessionById, updateSession, type SessionDTO } from "@/lib/api/sessions";

type TurnKey = "morning" | "afternoon";

type Exercise = {
  title: string;       // Tipo de tarea
  space: string;       // Espacio
  players: string;     // Nº de jugadores (texto libre)
  duration: string;    // Duración (texto libre)
  description: string; // Descripción
  imageUrl: string;    // URL de imagen
};

const EX_TAG = "[EXERCISES]";

function parseMarker(description?: string) {
  const turn = (description?.match(/^\[GRID:(morning|afternoon):/i)?.[1] || "") as
    | TurnKey
    | "";
  const row = description?.match(/^\[GRID:(?:morning|afternoon):(.+?)\]/i)?.[1] || "";
  const ymd = description?.split("|")[1]?.trim() || "";
  return { turn, row, ymd };
}

// Devuelve { prefix, exercises } donde prefix es la parte "original" de description (incluye marker)
function decodeExercises(desc: string | null | undefined): { prefix: string; exercises: Exercise[] } {
  const text = (desc || "").trimEnd();
  const idx = text.lastIndexOf(EX_TAG);
  if (idx === -1) return { prefix: text, exercises: [] };
  const prefix = text.slice(0, idx).trimEnd();
  const rest = text.slice(idx + EX_TAG.length).trim();
  const b64 = rest.split(/\s+/)[0] || "";
  try {
    const json = atob(b64);
    const arr = JSON.parse(json) as Exercise[];
    if (Array.isArray(arr)) return { prefix, exercises: arr };
  } catch {}
  // si falla, no rompemos:
  return { prefix: text, exercises: [] };
}

function encodeExercises(prefix: string, exercises: Exercise[]) {
  const b64 = btoa(JSON.stringify(exercises));
  const safePrefix = (prefix || "").trimEnd();
  return `${safePrefix}\n\n${EX_TAG} ${b64}`;
}

export default function SesionDetailEditorPage() {
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [s, setS] = useState<SessionDTO | null>(null);
  const [prefix, setPrefix] = useState<string>("");
  const [exercises, setExercises] = useState<Exercise[]>([]);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      try {
        const res = await getSessionById(id);
        const sess: SessionDTO =
          (res as any)?.data ? (res as any).data : (res as unknown as SessionDTO);
        setS(sess);
        const { prefix, exercises } = decodeExercises(sess?.description || "");
        setPrefix(prefix);
        setExercises(exercises.length ? exercises : [
          { title: "", space: "", players: "", duration: "", description: "", imageUrl: "" },
        ]);
      } catch (e) {
        console.error(e);
        setS(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const marker = useMemo(
    () => parseMarker(typeof s?.description === "string" ? s?.description : ""),
    [s?.description]
  );

  function updateExercise(idx: number, patch: Partial<Exercise>) {
    setExercises((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  function addExercise() {
    setExercises((prev) => [
      ...prev,
      { title: "", space: "", players: "", duration: "", description: "", imageUrl: "" },
    ]);
  }

  function removeExercise(idx: number) {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  }

  async function saveAll() {
    if (!s) return;
    setSaving(true);
    try {
      const newDescription = encodeExercises(prefix || (s.description as string) || "", exercises);
      await updateSession(s.id, {
        // mantenemos el title como está (contenido de la celda/encabezado)
        title: s.title,
        description: newDescription,
        date: s.date,
      });
      alert("Guardado");
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-gray-500">Cargando…</div>;
  if (!s) return <div className="p-6"><h1 className="text-xl font-semibold">Sesión no encontrada</h1></div>;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-bold">
            Editor de ejercicio(s) — {marker.row || "Bloque"} ·{" "}
            {marker.turn === "morning" ? "Mañana" : marker.turn === "afternoon" ? "Tarde" : "—"}
          </h1>
          <p className="text-xs md:text-sm text-gray-500">
            Día: {marker.ymd || "—"} · Tipo: {s.type}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {marker.ymd && marker.turn && (
            <a
              href={`/ct/sessions/by-day/${marker.ymd}/${marker.turn}?focus=${encodeURIComponent(
                marker.row || ""
              )}`}
              className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs"
            >
              ← Volver a sesión
            </a>
          )}
          <a href="/ct/dashboard" className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">
            Dashboard
          </a>
          <a href="/ct/plan-semanal" className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">
            ✏️ Editor semanal
          </a>
          <button
            onClick={saveAll}
            disabled={saving}
            className={`px-3 py-1.5 rounded-xl text-xs ${
              saving ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"
            }`}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </header>

      {/* Lista de ejercicios */}
      <div className="space-y-4">
        {exercises.map((ex, idx) => (
          <section key={idx} className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between bg-gray-50 px-3 py-2 border-b">
              <div className="text-[12px] font-semibold uppercase tracking-wide">
                Ejercicio #{idx + 1}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => removeExercise(idx)}
                  className="text-[11px] rounded-lg border px-2 py-0.5 hover:bg-gray-50"
                >
                  Eliminar
                </button>
              </div>
            </div>

            <div className="p-3 grid md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-[11px] text-gray-500">Tipo de tarea</label>
                <input
                  className="w-full rounded-md border px-2 py-1.5 text-sm"
                  value={ex.title}
                  onChange={(e) => updateExercise(idx, { title: e.target.value })}
                  placeholder="Ej: Circuito de definición"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] text-gray-500">Espacio</label>
                <input
                  className="w-full rounded-md border px-2 py-1.5 text-sm"
                  value={ex.space}
                  onChange={(e) => updateExercise(idx, { space: e.target.value })}
                  placeholder="Mitad de cancha"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] text-gray-500">N° de jugadores</label>
                <input
                  className="w-full rounded-md border px-2 py-1.5 text-sm"
                  value={ex.players}
                  onChange={(e) => updateExercise(idx, { players: e.target.value })}
                  placeholder="22 jugadores"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] text-gray-500">Duración</label>
                <input
                  className="w-full rounded-md border px-2 py-1.5 text-sm"
                  value={ex.duration}
                  onChange={(e) => updateExercise(idx, { duration: e.target.value })}
                  placeholder="10 minutos"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[11px] text-gray-500">Descripción</label>
                <textarea
                  className="w-full rounded-md border px-2 py-1.5 text-sm min-h-[120px]"
                  value={ex.description}
                  onChange={(e) => updateExercise(idx, { description: e.target.value })}
                  placeholder={`Detalles del ejercicio, consignas, series, repeticiones...`}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[11px] text-gray-500">Imagen (URL)</label>
                <input
                  className="w-full rounded-md border px-2 py-1.5 text-sm"
                  value={ex.imageUrl}
                  onChange={(e) => updateExercise(idx, { imageUrl: e.target.value })}
                  placeholder="https://..."
                />
                {ex.imageUrl ? (
                  <div className="mt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ex.imageUrl}
                      alt="Vista previa"
                      className="max-h-80 rounded-lg border object-contain"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ))}

        <div>
          <button
            type="button"
            onClick={addExercise}
            className="rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50"
          >
            + Agregar ejercicio
          </button>
        </div>
      </div>
    </div>
  );
}
