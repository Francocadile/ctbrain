// src/app/ct/sessions/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getSessionById, updateSession, type SessionDTO } from "@/lib/api/sessions";
import { listKinds, addKind as apiAddKind, replaceKinds } from "@/lib/settings";

type TurnKey = "morning" | "afternoon";

type Exercise = {
  title: string;
  kind: string;
  space: string;
  players: string;
  duration: string;
  description: string;
  imageUrl: string;
};

const EX_TAG = "[EXERCISES]";

/** Helper local: intenta notificar al backend para importar ejercicios (si existe el endpoint).
 *  Si no existe o falla, seguimos como si nada. */
async function importFromSession(sessionId: string) {
  try {
    const res = await fetch(`/api/exercises/import?sessionId=${encodeURIComponent(sessionId)}`, {
      method: "POST",
    });
    if (!res.ok) return { ok: false, created: 0, updated: 0 };
    return (await res.json()) as { ok: boolean; created: number; updated: number };
  } catch {
    return { ok: false, created: 0, updated: 0 };
  }
}

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
    const arr = JSON.parse(json) as Partial<Exercise>[];
    if (Array.isArray(arr)) {
      const fixed = arr.map((e) => ({
        title: e.title ?? "",
        kind: e.kind ?? "",
        space: e.space ?? "",
        players: e.players ?? "",
        duration: e.duration ?? "",
        description: e.description ?? "",
        imageUrl: e.imageUrl ?? "",
      }));
      return { prefix, exercises: fixed };
    }
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
  const [kinds, setKinds] = useState<string[]>([]);

  useEffect(() => {
    (async () => setKinds(await listKinds()))();
  }, []);

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
        setExercises(
          d.exercises.length
            ? d.exercises
            : [{ title: "", kind: "", space: "", players: "", duration: "", description: "", imageUrl: "" }]
        );

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
    setExercises((prev) => [
      ...prev,
      { title: "", kind: "", space: "", players: "", duration: "", description: "", imageUrl: "" },
    ]);
  }

  function removeExercise(idx: number) {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  }

  function addKind() {
    const n = prompt("Nuevo tipo de ejercicio:");
    if (!n) return;
    const name = n.trim();
    if (!name) return;
    (async () => {
      const updated = await apiAddKind(name);
      setKinds(updated);
    })();
    return name;
  }

  function manageKinds() {
    (async () => {
      const edited = prompt(
        "Gestionar tipos (una línea por opción). Borrá para eliminar, editá para renombrar:",
        kinds.join("\n")
      );
      if (edited === null) return;
      const list = edited.split("\n").map((s) => s.trim()).filter(Boolean);
      const unique = await replaceKinds(list);
      setKinds(unique);
    })();
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

      // Intento opcional de importar al backend (si el endpoint existe).
      importFromSession(s.id).catch(() => {});

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
    <div id="print-root" className="p-4 md:p-6 space-y-4 print:!p-2">
      {/* Header */}
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between print:hidden">
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
              className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs"
            >
              ← Volver a sesión
            </a>
          )}
          <a href="/ct/dashboard" className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">Dashboard</a>
          <a href="/ct/plan-semanal" className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">✏️ Editor semanal</a>

          {editing ? (
            <button
              onClick={saveAll}
              disabled={saving}
              className={`px-3 py-1.5 rounded-xl text-xs ${saving ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"}`}
            >
              {saving ? "Guardando…" : "Guardar y bloquear"}
            </button>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 rounded-xl border text-xs hover:bg-gray-50"
            >
              ✏️ Editar
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-xl border text-xs hover:bg-gray-50"
            title="Imprimir"
          >
            🖨️ Imprimir
          </button>
        </div>
      </header>

      {/* Lista de ejercicios */}
      <div className="space-y-4">
        {exercises.map((ex, idx) => (
          <section
            id={`ex-${idx}`}
            key={idx}
            className="rounded-2xl border bg-white shadow-sm overflow-hidden print:page"
          >
            <div className="flex items-center justify-between bg-gray-50 px-3 py-2 border-b">
              <input
                className={`text-[12px] font-semibold uppercase tracking-wide w-full max-w-[360px] ${roCls}`}
                placeholder={`EJERCICIO #${idx + 1} — Título`}
                value={ex.title}
                onChange={(e) => updateExercise(idx, { title: e.target.value })}
                disabled={!editing}
              />
              {editing && (
                <button
                  type="button"
                  onClick={() => removeExercise(idx)}
                  className="ml-2 text-[11px] rounded-lg border px-2 py-0.5 hover:bg-gray-50"
                >
                  Eliminar
                </button>
              )}
            </div>

            <div className="p-3 grid md:grid-cols-2 gap-3">
              {/* Tipo de ejercicio (desplegable persistente) */}
              <div className="space-y-2">
                <label className="text-[11px] text-gray-500">Tipo de ejercicio</label>
                <div className="flex items-center gap-1">
                  <select
                    className={`w-full rounded-md border px-2 py-1.5 text-sm ${roCls}`}
                    value={ex.kind || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "__add__") {
                        const created = addKind();
                        if (created) updateExercise(idx, { kind: created });
                        return;
                      }
                      if (v === "__manage__") {
                        manageKinds();
                        return;
                      }
                      updateExercise(idx, { kind: v });
                    }}
                    disabled={!editing}
                  >
                    <option value="">— Seleccionar —</option>
                    {kinds.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                    <option value="__add__">➕ Agregar…</option>
                    <option value="__manage__">⚙️ Gestionar…</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] text-gray-500">Espacio</label>
                <input
                  className={`w-full rounded-md border px-2 py-1.5 text-sm ${roCls}`}
                  value={ex.space}
                  onChange={(e) => updateExercise(idx, { space: e.target.value })}
                  placeholder="Mitad de cancha"
                  disabled={!editing}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] text-gray-500">N° de jugadores</label>
                <input
                  className={`w-full rounded-md border px-2 py-1.5 text-sm ${roCls}`}
                  value={ex.players}
                  onChange={(e) => updateExercise(idx, { players: e.target.value })}
                  placeholder="22 jugadores"
                  disabled={!editing}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] text-gray-500">Duración</label>
                <input
                  className={`w-full rounded-md border px-2 py-1.5 text-sm ${roCls}`}
                  value={ex.duration}
                  onChange={(e) => updateExercise(idx, { duration: e.target.value })}
                  placeholder="10 minutos"
                  disabled={!editing}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[11px] text-gray-500">Descripción</label>
                <textarea
                  className={`w-full rounded-md border px-2 py-1.5 text-sm min-h-[120px] ${roCls}`}
                  value={ex.description}
                  onChange={(e) => updateExercise(idx, { description: e.target.value })}
                  placeholder="Consignas, series, repeticiones, variantes..."
                  disabled={!editing}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-gray-500">Imagen (URL)</label>
                  {!editing && <span className="text-[10px] text-gray-400">Bloqueado</span>}
                </div>
                <input
                  className={`w-full rounded-md border px-2 py-1.5 text-sm ${roCls}`}
                  value={ex.imageUrl}
                  onChange={(e) => updateExercise(idx, { imageUrl: e.target.value })}
                  placeholder="https://..."
                  disabled={!editing}
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

        {editing && (
          <div className="print:hidden">
            <button
              type="button"
              onClick={addExercise}
              className="rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50"
            >
              + Agregar ejercicio
            </button>
          </div>
        )}
      </div>

      {/* estilos de impresión */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body * {
            visibility: hidden !important;
          }
          #print-root,
          #print-root * {
            visibility: visible !important;
          }
          #print-root {
            position: absolute;
            inset: 0;
            margin: 0 !important;
            padding: 0 !important;
          }
          nav,
          aside,
          header[role='banner'],
          .sidebar,
          .app-sidebar,
          .print\\:hidden {
            display: none !important;
          }
          a[href]:after {
            content: '';
          }
          /* === hoja A4 por ejercicio === */
          .print\\:page {
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  );
}
