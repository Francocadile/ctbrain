// src/app/ct/sessions/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getSessionById, updateSession, type SessionDTO } from "@/lib/api/sessions";

type TurnKey = "morning" | "afternoon";

type Exercise = {
  title: string;       // Título del ejercicio (editable arriba)
  kind?: string;       // Tipo de ejercicio (SSG, MSG, etc.)
  space: string;
  players: string;
  duration: string;
  description: string;
  imageUrl: string;
};

const EX_TAG = "[EXERCISES]";
const KIND_OPTIONS = ["Rueda de pases", "Circuito técnico", "SSG", "MSG", "LSG", "Otro…"];

// ---------- helpers ----------
function parseMarker(description?: string) {
  const text = (description || "").trimStart();
  const m = text.match(/^\[GRID:(morning|afternoon):(.+?)\]\s*\|\s*(\d{4}-\d{2}-\d{2})/i);
  return { turn: (m?.[1] || "") as TurnKey | "", row: m?.[2] || "", ymd: m?.[3] || "" };
}

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
  return { prefix: text, exercises: [] };
}

function encodeExercises(prefix: string, exercises: Exercise[]) {
  const b64 = btoa(JSON.stringify(exercises));
  const safePrefix = (prefix || "").trimEnd();
  return `${safePrefix}\n\n${EX_TAG} ${b64}`;
}

// ---------- page ----------
export default function SesionDetailEditorPage() {
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(true);

  const [s, setS] = useState<SessionDTO | null>(null);
  const [prefix, setPrefix] = useState<string>("");
  const [exercises, setExercises] = useState<Exercise[]>([]);

  const printCSS = `
    @media print {
      @page { size: A4 portrait; margin: 10mm; }
      .no-print { display: none !important; }
    }
  `;

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      try {
        const res = await getSessionById(id);
        const sess: SessionDTO = (res as any)?.data ? (res as any).data : (res as unknown as SessionDTO);
        setS(sess);

        const d = decodeExercises(sess?.description || "");
        setPrefix(d.prefix);
        const initial = d.exercises.length
          ? d.exercises
          : [{ title: "", kind: "", space: "", players: "", duration: "", description: "", imageUrl: "" }];
        setExercises(initial);
        setEditing(true);
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
    setExercises((prev) => [...prev, { title: "", kind: "", space: "", players: "", duration: "", description: "", imageUrl: "" }]);
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
        title: s.title ?? "",
        description: newDescription,
        date: s.date,
      });
      setEditing(false);
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

  const roCls = editing ? "" : "bg-gray-50 text-gray-600 cursor-not-allowed";

  return (
    <div className="p-4 md:p-6 space-y-4">
      <style jsx global>{printCSS}</style>

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
              href={`/ct/sessions/by-day/${marker.ymd}/${marker.turn}?focus=${encodeURIComponent(marker.row || "")}`}
              className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs no-print"
            >
              ← Volver a sesión
            </a>
          )}
          <a href="/ct/dashboard" className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs no-print">Dashboard</a>
          <a href="/ct/plan-semanal" className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs no-print">✏️ Editor semanal</a>

          {editing ? (
            <button onClick={saveAll} disabled={saving} className={`px-3 py-1.5 rounded-xl text-xs ${saving ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"} no-print`}>
              {saving ? "Guardando…" : "Guardar y bloquear"}
            </button>
          ) : (
            <button onClick={() => setEditing(true)} className="px-3 py-1.5 rounded-xl border text-xs hover:bg-gray-50 no-print">
              ✏️ Editar
            </button>
          )}

          <button onClick={() => window.print()} className="px-3 py-1.5 rounded-xl border text-xs hover:bg-gray-50 no-print">🖨 Imprimir</button>
        </div>
      </header>

      {/* Lista de ejercicios */}
      <div className="space-y-6">
        {exercises.map((ex, idx) => {
          const showOther = (ex.kind || "") === "Otro…";
          return (
            <section key={idx} className="rounded-2xl border bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between bg-gray-50 px-3 py-2 border-b">
                <div className="text-[12px] font-semibold uppercase tracking-wide">EJERCICIO #{idx + 1}</div>
                {editing && (
                  <button type="button" onClick={() => removeExercise(idx)} className="text-[11px] rounded-lg border px-2 py-0.5 hover:bg-gray-50">
                    Eliminar
                  </button>
                )}
              </div>

              <div className="p-3 grid md:grid-cols-2 gap-3">
                {/* Título del ejercicio (independiente) */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[11px] text-gray-500">Título del ejercicio</label>
                  <input
                    className={`w-full rounded-md border px-2 py-1.5 text-sm ${roCls}`}
                    value={ex.title}
                    onChange={(e) => updateExercise(idx, { title: e.target.value })}
                    placeholder="Ej: Activación 3 zonas"
                    disabled={!editing}
                  />
                </div>

                {/* Tipo de ejercicio (select + otro) */}
                <div className="space-y-2">
                  <label className="text-[11px] text-gray-500">Tipo de ejercicio</label>
                  <select
                    className={`w-full rounded-md border px-2 py-1.5 text-sm ${roCls}`}
                    value={ex.kind || ""}
                    onChange={(e) => updateExercise(idx, { kind: e.target.value })}
                    disabled={!editing}
                  >
                    <option value="">— Seleccionar —</option>
                    {KIND_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>

                {showOther && (
                  <div className="space-y-2">
                    <label className="text-[11px] text-gray-500">Otro (personalizado)</label>
                    <input
                      className={`w-full rounded-md border px-2 py-1.5 text-sm ${roCls}`}
                      value={ex.kind === "Otro…" ? "" : (ex.kind || "")}
                      onChange={(e) => updateExercise(idx, { kind: e.target.value || "Otro…" })}
                      placeholder="Escribí el tipo"
                      disabled={!editing}
                    />
                  </div>
                )}

                {/* Resto de campos */}
                <div className="space-y-2">
                  <label className="text-[11px] text-gray-500">Espacio</label>
                  <input className={`w-full rounded-md border px-2 py-1.5 text-sm ${roCls}`} value={ex.space} onChange={(e) => updateExercise(idx, { space: e.target.value })} placeholder="Mitad de cancha" disabled={!editing} />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] text-gray-500">N° de jugadores</label>
                  <input className={`w-full rounded-md border px-2 py-1.5 text-sm ${roCls}`} value={ex.players} onChange={(e) => updateExercise(idx, { players: e.target.value })} placeholder="22 jugadores" disabled={!editing} />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] text-gray-500">Duración</label>
                  <input className={`w-full rounded-md border px-2 py-1.5 text-sm ${roCls}`} value={ex.duration} onChange={(e) => updateExercise(idx, { duration: e.target.value })} placeholder="10 minutos" disabled={!editing} />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[11px] text-gray-500">Descripción</label>
                  <textarea className={`w-full rounded-md border px-2 py-1.5 text-sm min-h-[120px] ${roCls}`} value={ex.description} onChange={(e) => updateExercise(idx, { description: e.target.value })} placeholder="Consignas, series, repeticiones, variantes..." disabled={!editing} />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-gray-500">Imagen (URL)</label>
                    {!editing && <span className="text-[10px] text-gray-400">Bloqueado</span>}
                  </div>
                  <input className={`w-full rounded-md border px-2 py-1.5 text-sm ${roCls}`} value={ex.imageUrl} onChange={(e) => updateExercise(idx, { imageUrl: e.target.value })} placeholder="https://..." disabled={!editing} />
                  {ex.imageUrl ? (
                    <div className="mt-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ex.imageUrl} alt="Vista previa" className="max-h-80 rounded-lg border object-contain" />
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          );
        })}

        {editing && (
          <div className="no-print">
            <button type="button" onClick={addExercise} className="rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50">
              + Agregar ejercicio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
