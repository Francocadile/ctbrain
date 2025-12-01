// src/app/ct/sessions/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getSessionById, updateSession, type SessionDTO } from "@/lib/api/sessions";
import {
  createSessionExercise,
  updateSessionExercise,
  type SessionMeta,
  type ExerciseDTO,
} from "@/lib/api/exercises";
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

/* =========================
   Base64 helpers (Unicode-safe)
   ========================= */
function encodeB64Json(value: unknown) {
  const json = JSON.stringify(value);
  try {
    // Navegador: unicode-safe
    // encodeURIComponent -> escape -> btoa
    // (catch por si el ambiente no soporta escape/unescape)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return btoa(unescape(encodeURIComponent(json)));
  } catch {
    return btoa(json);
  }
}

function decodeB64Json<T = any>(b64: string): T {
  try {
    // Navegador: unicode-safe
    // atob -> unescape-reverse -> decodeURIComponent -> JSON.parse
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const s = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(s) as T;
  } catch {
    const s = atob(b64);
    return JSON.parse(s) as T;
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
    const arr = decodeB64Json<Partial<Exercise>[]>(b64);
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
  const b64 = encodeB64Json(exercises);
  const safePrefix = (prefix || "").trimEnd();
  return `${safePrefix}\n\n${EX_TAG} ${b64}`;
}

// ---------- page ----------
export default function SesionDetailEditorPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const isViewMode = searchParams.get("view") === "1";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(!isViewMode);

  const [s, setS] = useState<SessionDTO | null>(null);
  const [prefix, setPrefix] = useState<string>("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [kinds, setKinds] = useState<string[]>([]);
  const [savingToLibrary, setSavingToLibrary] = useState(false);
  const [errorLibrary, setErrorLibrary] = useState<string | null>(null);
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const [pickerExercises, setPickerExercises] = useState<ExerciseDTO[]>([]);
  const [loadingPicker, setLoadingPicker] = useState(false);

  useEffect(() => {
    (async () => setKinds(await listKinds()))();
  }, []);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      try {
        const res = await getSessionById(id);
        const sess: SessionDTO =
          (res as any)?.data ? (res as any).data : (res as unknown as SessionDTO);
        setS(sess);

        const d = decodeExercises(sess?.description || "");
        setPrefix(d.prefix);
        setExercises(
          d.exercises.length
            ? d.exercises
            : [
                {
                  title: "",
                  kind: "",
                  space: "",
                  players: "",
                  duration: "",
                  description: "",
                  imageUrl: "",
                },
              ]
        );

  setEditing(!isViewMode);
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
  const displayRow = (marker.row || "").replace("ENTREN0", "ENTRENO");

  function updateExercise(idx: number, patch: Partial<Exercise>) {
    setExercises((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  function addExercise() {
    if (isViewMode) return;
    setExercises((prev) => [
      ...prev,
      {
        title: "",
        kind: "",
        space: "",
        players: "",
        duration: "",
        description: "",
        imageUrl: "",
      },
    ]);
  }

  function removeExercise(idx: number) {
    if (isViewMode) return;
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  }

  function addKind() {
    if (isViewMode) return;
    const n = prompt("Nuevo tipo de ejercicio (ej: Juego reducido MSG):");
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
    if (isViewMode) return;
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

  async function persistSessionOnly() {
    if (!s) return;
    const newDescription = encodeExercises(prefix || (s.description as string) || "", exercises);
    await updateSession(s.id, {
      title: s.title ?? "",
      description: newDescription,
      date: s.date,
    });
  }

  async function saveAll() {
    if (isViewMode) return;
    if (!s) return;
    setSaving(true);
    try {
      await persistSessionOnly();

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

  async function handleSaveToSessionLibrary() {
    if (!s || isViewMode) return;
    if (!exercises.length) return;
    try {
      setSavingToLibrary(true);
      setErrorLibrary(null);
      await persistSessionOnly();

      const first = exercises[0];
      const name = (first.title || first.kind || "Ejercicio sin nombre").trim();
      const zone = (first.kind || "").trim() || null;
      const videoUrl = (first.imageUrl || "").trim() || null;

      const rawPlayers = (first as any).players ?? null;
      let players: number | string | null = null;
      if (typeof rawPlayers === "number") {
        players = rawPlayers;
      } else if (typeof rawPlayers === "string") {
        const n = parseInt(rawPlayers.replace(/\D+/g, ""), 10);
        players = Number.isFinite(n) ? n : rawPlayers;
      }

      const sessionMeta = {
        type: first.kind ?? null,
        space: (first as any).space ?? null,
        players,
        duration: (first as any).duration ?? null,
        description: (first as any).description ?? null,
        imageUrl: first.imageUrl ?? null,
        sessionId: s.id,
      };

      const res = await fetch(
        `/api/ct/exercises?usage=SESSION&originSessionId=${encodeURIComponent(s.id)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      const list = Array.isArray((json as any)?.data) ? (json as any).data : json;
      const existing = (Array.isArray(list) ? list[0] : null) as ExerciseDTO | null;

      if (existing?.id) {
        await updateSessionExercise(existing.id, {
          name,
          zone,
          videoUrl,
          originSessionId: s.id,
          sessionMeta,
        });
      } else {
        await createSessionExercise({
          name,
          zone,
          videoUrl,
          originSessionId: s.id,
          sessionMeta,
        });
      }

      alert("Ejercicio guardado en la biblioteca de Sesiones / Campo");
    } catch (err: any) {
      console.error(err);
      setErrorLibrary(err?.message || "No se pudo guardar en la biblioteca");
    } finally {
      setSavingToLibrary(false);
    }
  }

  async function openLibraryPicker(idx: number) {
    if (isViewMode) return;
    try {
      setLoadingPicker(true);
      setErrorLibrary(null);
      setPickerIndex(idx);

      const res = await fetch("/api/ct/exercises?usage=SESSION", { cache: "no-store" });
      const json = await res.json();
      const list = Array.isArray((json as any)?.data) ? (json as any).data : json;
      setPickerExercises(Array.isArray(list) ? list : []);
    } catch (err: any) {
      console.error(err);
      setErrorLibrary(err?.message || "No se pudieron cargar los ejercicios de biblioteca");
      setPickerExercises([]);
    } finally {
      setLoadingPicker(false);
    }
  }

  function applyLibraryExercise(exLib: ExerciseDTO) {
    if (pickerIndex === null) return;

    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== pickerIndex) return ex;

        const meta = exLib.sessionMeta || {};

        return {
          ...ex,
          title: exLib.name || "",
          kind: (meta.type as string) || exLib.zone || "",
          space: (meta.space as string) || "",
          players:
            meta.players != null
              ? String(meta.players)
              : ex.players || "",
          duration: (meta.duration as string) || "",
          description: (meta.description as string) || "",
          imageUrl:
            (meta.imageUrl as string) ||
            exLib.videoUrl ||
            "",
        };
      })
    );

    setPickerIndex(null);
  }

  if (loading) return <div className="p-6 text-gray-500">Cargando…</div>;
  if (!s)
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Sesión no encontrada</h1>
      </div>
    );

  const roCls = editing ? "" : "bg-gray-50 text-gray-600 cursor-not-allowed";

  return (
    <div id="print-root" className="p-4 md:p-6 space-y-4 print:!p-2">
      {/* Header */}
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between print:hidden">
        <div>
          <h1 className="text-lg md:text-xl font-bold">
            Sesión: {displayRow || "Bloque"} · {"(" + (marker.turn === "morning" ? "Mañana" : marker.turn === "afternoon" ? "Tarde" : "—") + ")"}
          </h1>
          <p className="text-xs md:text-sm text-gray-500">
            Día: {marker.ymd || "—"} · Tipo: {s.type}
          </p>
          {errorLibrary && (
            <p className="mt-1 text-[11px] text-red-600">{errorLibrary}</p>
          )}
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

          <button
            type="button"
            onClick={handleSaveToSessionLibrary}
            disabled={savingToLibrary}
            className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
          >
            {savingToLibrary ? "Guardando..." : "Guardar en biblioteca"}
          </button>

          {editing ? (
            <button onClick={saveAll} disabled={saving} className="hidden">
              {saving ? "Guardando…" : "Guardar y bloquear"}
            </button>
          ) : (
            <button onClick={() => setEditing(true)} className="hidden">
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
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-700">
                EJERCICIO #{idx + 1}
              </span>
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
              {editing && (
                <div className="md:col-span-2 mb-1">
                  <button
                    type="button"
                    className="text-[11px] text-blue-600 hover:underline"
                    onClick={() => openLibraryPicker(idx)}
                  >
                    Usar ejercicio de biblioteca
                  </button>
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <label className="text-[11px] text-gray-500">Título del ejercicio</label>
                <input
                  className="w-full rounded-md border px-2 py-1.5 text-sm"
                  value={ex.title || ""}
                  onChange={(e) => updateExercise(idx, { title: e.target.value })}
                  placeholder="Ej: Activación con balón 6v6"
                  disabled={!editing}
                />
              </div>

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
                    <option value="">— Ej: Juego reducido MSG —</option>
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

      {pickerIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold">Elegir ejercicio de biblioteca</h2>
              <button
                type="button"
                className="text-xs text-gray-500 hover:underline"
                onClick={() => setPickerIndex(null)}
              >
                Cerrar
              </button>
            </div>
            {loadingPicker ? (
              <p className="text-xs text-gray-500">Cargando ejercicios...</p>
            ) : pickerExercises.length === 0 ? (
              <p className="text-xs text-gray-500">
                No hay ejercicios en la biblioteca de Sesiones / Campo.
              </p>
            ) : (
              <ul className="max-h-64 overflow-auto divide-y divide-gray-100">
                {pickerExercises.map((exLib) => (
                  <li key={exLib.id} className="py-1.5 text-xs">
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => applyLibraryExercise(exLib)}
                    >
                      <p className="font-medium text-gray-900">{exLib.name}</p>
                      {exLib.sessionMeta?.description && (
                        <p className="text-[11px] text-gray-500 line-clamp-2">
                          {exLib.sessionMeta.description}
                        </p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

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

