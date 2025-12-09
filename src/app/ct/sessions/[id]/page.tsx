// src/app/ct/sessions/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getSessionById, updateSession, type SessionDTO } from "@/lib/api/sessions";
import {
  createSessionExercise,
  updateSessionExercise,
  type SessionMeta,
  type ExerciseDTO,
} from "@/lib/api/exercises";
import { listKinds, addKind as apiAddKind, replaceKinds } from "@/lib/settings";
import SessionPageContent from "./SessionPageContent";
import { SessionRoutinePanel, type LinkedRoutineDTO } from "./SessionRoutinePanel";

type TurnKey = "morning" | "afternoon";

type Exercise = {
  title: string;
  kind: string;
  space: string;
  players: string;
  duration: string;
  description: string;
  imageUrl: string;
  routineId?: string;
  routineName?: string;
  // Si true, este bloque representa solo una rutina vinculada
  // y los campos de ejercicio se consideran vacíos/ignorados.
  isRoutineOnly?: boolean;
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

function isVideoUrl(url: string | undefined | null) {
  if (!url) return false;
  const u = url.toLowerCase();
  return u.includes("youtube.com") || u.includes("youtu.be") || u.includes("vimeo.com");
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
        routineId: (e as any).routineId ?? "",
        routineName: (e as any).routineName ?? "",
        isRoutineOnly: (e as any).isRoutineOnly ?? false,
      }));
      return { prefix, exercises: fixed };
    }
  } catch {}
  return { prefix: text, exercises: [] };
}

function isRealExercise(ex: Exercise): boolean {
  const hasRoutine = !!ex.routineId;
  const hasExerciseFields =
    !!ex.title?.trim() ||
    !!ex.kind?.trim() ||
    !!ex.description?.trim() ||
    !!ex.space?.trim() ||
    !!ex.players?.trim() ||
    !!ex.duration?.trim() ||
    !!ex.imageUrl?.trim();

  // Bloques “solo rutina”: no van a la biblioteca
  if (ex.isRoutineOnly) return false;

  // Bloques que solo tienen rutina y nada más: también se excluyen
  if (hasRoutine && !hasExerciseFields) return false;

  // Bloques completamente vacíos: tampoco
  if (!hasRoutine && !hasExerciseFields) return false;

  return true;
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
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(!isViewMode);

  const [s, setS] = useState<SessionDTO | null>(null);
  const [prefix, setPrefix] = useState<string>("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [kinds, setKinds] = useState<string[]>([]);
  const [routineOptions, setRoutineOptions] = useState<{ id: string; name: string }[]>([]);
  const [savingToLibrary, setSavingToLibrary] = useState(false);
  const [errorLibrary, setErrorLibrary] = useState<string | null>(null);
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const [pickerExercises, setPickerExercises] = useState<ExerciseDTO[]>([]);
  const [loadingPicker, setLoadingPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [linkedRoutines, setLinkedRoutines] = useState<LinkedRoutineDTO[]>([]);

  useEffect(() => {
    (async () => setKinds(await listKinds()))();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/ct/routines", { cache: "no-store" });
        const json = await res.json();
        const list = Array.isArray((json as any)?.data) ? (json as any).data : json;
        const options = Array.isArray(list)
          ? list.map((r: any) => ({
              id: String(r.id),
              // La API de /api/ct/routines expone `title` como nombre principal
              // (ver src/app/api/ct/routines/route.ts), así que usamos ese campo.
              name: (r.title as string) || (r.name as string) || "Rutina sin nombre",
            }))
          : [];
        setRoutineOptions(options);
      } catch (err) {
        console.error("No se pudieron cargar las rutinas de fuerza", err);
      }
    })();
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

        // Cargar rutinas de fuerza vinculadas a esta sesión
        try {
          const relRes = await fetch(`/api/ct/routines`, { cache: "no-store" });
          const relJson = await relRes.json();
          const relData = Array.isArray((relJson as any)?.data) ? (relJson as any).data : relJson;

          // Para cada rutina, consultamos si está vinculada a esta sesión
          const routineList: { id: string; title: string }[] = Array.isArray(relData)
            ? relData.map((r: any) => ({ id: String(r.id), title: (r.title as string) || "Rutina sin nombre" }))
            : [];

          const linked: LinkedRoutineDTO[] = [];
          await Promise.all(
            routineList.map(async (r) => {
              try {
                const linkRes = await fetch(`/api/ct/routines/${r.id}/sessions`, {
                  cache: "no-store",
                });
                if (!linkRes.ok) return;
                const linkJson = await linkRes.json();
                const sessionIds: string[] = Array.isArray((linkJson as any)?.sessionIds)
                  ? (linkJson as any).sessionIds
                  : [];
                if (sessionIds.includes(sess.id)) {
                  linked.push({ id: r.id, title: r.title });
                }
              } catch (err) {
                console.error("No se pudieron cargar las sesiones vinculadas para la rutina", r.id, err);
              }
            })
          );

          setLinkedRoutines(linked);
        } catch (err) {
          console.error("No se pudieron cargar las rutinas vinculadas a la sesión", err);
        }

        const d = decodeExercises(sess?.description || "");
        setPrefix(d.prefix);
        if (d.exercises.length) {
          setExercises(d.exercises);
        } else if (isViewMode) {
          // Modo solo lectura: si no hay ejercicios estructurados, intentamos usar la biblioteca.
          try {
            const resLib = await fetch(
              `/api/ct/exercises?usage=SESSION&originSessionId=${encodeURIComponent(sess.id)}`,
              { cache: "no-store" }
            );
            const jsonLib = await resLib.json();
            const listLib = Array.isArray((jsonLib as any)?.data)
              ? (jsonLib as any).data
              : jsonLib;
            const arr: ExerciseDTO[] = Array.isArray(listLib) ? listLib : [];

            if (arr.length > 0) {
              const mapped: Exercise[] = arr.map((exLib) => {
                const meta = exLib.sessionMeta || {};
                return {
                  title: exLib.name || (meta.description as string) || "",
                  kind: (meta.type as string) || exLib.zone || "",
                  space: (meta.space as string) || "",
                  players:
                    meta.players != null
                      ? String(meta.players)
                      : "",
                  duration: (meta.duration as string) || "",
                  description: (meta.description as string) || "",
                  imageUrl:
                    (meta.imageUrl as string) ||
                    exLib.videoUrl ||
                    "",
                  routineId: (meta.routineId as string) || "",
                  routineName: (meta.routineName as string) || "",
                };
              });
              setExercises(mapped);
            } else {
              setExercises([]);
            }
          } catch (err) {
            console.error("No se pudieron cargar ejercicios desde la biblioteca para view mode", err);
            setExercises([]);
          }
        } else {
          // Modo edición: plantilla inicial para que el CT pueda empezar a cargar el ejercicio.
          setExercises([
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

  const visiblePickerExercises = useMemo(() => {
    const term = pickerSearch.trim().toLowerCase();
    if (!term) return pickerExercises;
    return pickerExercises.filter((ex) => {
      const name = (ex.name || "").toLowerCase();
      const type = (ex.sessionMeta?.type || "").toLowerCase();
      const desc = (ex.sessionMeta?.description || "").toLowerCase();
      return name.includes(term) || type.includes(term) || desc.includes(term);
    });
  }, [pickerExercises, pickerSearch]);
  // NOTA: linkedRoutines y routineOptions se mantienen para compatibilidad de datos,
  // pero ya no se usan en la UI del editor de ejercicios.

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
    // Al guardar la sesión, persistimos todos los bloques, incluidos los de solo rutina,
    // para que el jugador pueda verlos en el plan del día.
    const newDescription = encodeExercises(
      prefix || (s.description as string) || "",
      exercises
    );
    await updateSession(s.id, {
      title: s.title ?? "",
      description: newDescription,
      date: s.date,
    });
  }

  // Si venimos de un flujo externo que quiere vincular una rutina a un bloque concreto,
  // por ejemplo /ct/sessions/[id]?linkRoutine=<RID>&block=<N>, actualizamos ese bloque
  // a modo solo-rutina y persistimos la sesión.
  useEffect(() => {
    if (!s) return;
    const linkRoutine = searchParams.get("linkRoutine");
    const blockParam = searchParams.get("block");
    if (!linkRoutine || blockParam == null) return;

    const blockIndex = Number(blockParam);
    if (!Number.isFinite(blockIndex) || blockIndex < 0) return;

    // Evitar reprocesar si ya está aplicado
    const current = exercises[blockIndex];
    if (current && current.routineId === linkRoutine && current.isRoutineOnly) {
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/ct/routines/${encodeURIComponent(linkRoutine)}`);
        if (!res.ok) return;
        const json = await res.json();
        const data: any = (json as any)?.data || json;
        const routineTitle: string = data?.title || "Rutina sin nombre";

        setExercises((prev) => {
          const next = [...prev];
          const ex: Exercise = next[blockIndex] || {
            title: "",
            kind: "",
            space: "",
            players: "",
            duration: "",
            description: "",
            imageUrl: "",
          };
          next[blockIndex] = {
            ...ex,
            title: "",
            kind: "",
            space: "",
            players: "",
            duration: "",
            description: "",
            imageUrl: "",
            routineId: linkRoutine,
            routineName: routineTitle,
            isRoutineOnly: true,
          };
          return next;
        });

        // Persistimos la sesión con la rutina vinculada
        await persistSessionOnly();

        // Limpiar los params de la URL para evitar repetir la operación si el usuario recarga
        const sp = new URLSearchParams(searchParams.toString());
        sp.delete("linkRoutine");
        sp.delete("block");
        const qs = sp.toString();
        const base = `/ct/sessions/${encodeURIComponent(id)}`;
        router.replace(qs ? `${base}?${qs}` : base);
      } catch (err) {
        console.error("No se pudo vincular la rutina desde linkRoutine", err);
      }
    })();
  }, [s, exercises, id, router, searchParams]);

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

      const realExercises = exercises.filter(isRealExercise);
      if (!realExercises.length) {
        setErrorLibrary("No hay ejercicios de sesión para guardar en la biblioteca");
        return;
      }

      const first = realExercises[0];
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
        routineId: (first as any).routineId ?? null,
        routineName: (first as any).routineName ?? null,
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
      setPickerSearch("");
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
          routineId: (meta.routineId as string) || ex.routineId || "",
          routineName: (meta.routineName as string) || ex.routineName || "",
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

      {/* COPILOT: AJUSTAR VISIBILIDAD DE SessionRoutinePanel (RUTINA DE FUERZA)
       *
       * Solo mostramos el bloque de "Rutina de fuerza" para sesiones de tipo GYM.
       * Para sesiones de campo (GENERAL, etc.) no tiene sentido mostrarlo.
       */}
  {s.type === "FUERZA" && (
        <SessionRoutinePanel
          sessionId={s.id}
          routines={linkedRoutines}
          isViewMode={isViewMode}
        />
      )}

      {/* Lista de ejercicios de la sesión (campo) */}
      {exercises.length > 0 && (
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
                {editing && !isViewMode && (
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
                {editing && !isViewMode && (
                  <div className="md:col-span-2 mb-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <button
                        type="button"
                        className="text-[11px] text-blue-600 hover:underline"
                        onClick={() => openLibraryPicker(idx)}
                      >
                        Usar ejercicio de biblioteca
                      </button>
                    </div>
                  </div>
                )}
                <>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[11px] text-gray-500">Título del ejercicio</label>
                      <input
                        className="w-full rounded-md border px-2 py-1.5 text-sm"
                        value={ex.title || ""}
                        onChange={(e) => {
                          if (!editing || isViewMode) return;
                          updateExercise(idx, { title: e.target.value });
                        }}
                        placeholder="Ej: Activación con balón 6v6"
                        disabled={!editing || isViewMode}
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
                          disabled={!editing || isViewMode}
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
                        onChange={(e) => {
                          if (!editing || isViewMode) return;
                          updateExercise(idx, { space: e.target.value });
                        }}
                        placeholder="Mitad de cancha"
                        disabled={!editing || isViewMode}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] text-gray-500">N° de jugadores</label>
                      <input
                        className={`w-full rounded-md border px-2 py-1.5 text-sm ${roCls}`}
                        value={ex.players}
                        onChange={(e) => {
                          if (!editing || isViewMode) return;
                          updateExercise(idx, { players: e.target.value });
                        }}
                        placeholder="22 jugadores"
                        disabled={!editing || isViewMode}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] text-gray-500">Duración</label>
                      <input
                        className={`w-full rounded-md border px-2 py-1.5 text-sm ${roCls}`}
                        value={ex.duration}
                        onChange={(e) => {
                          if (!editing || isViewMode) return;
                          updateExercise(idx, { duration: e.target.value });
                        }}
                        placeholder="10 minutos"
                        disabled={!editing || isViewMode}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[11px] text-gray-500">Descripción</label>
                      <textarea
                        className={`w-full rounded-md border px-2 py-1.5 text-sm min-h-[120px] ${roCls}`}
                        value={ex.description}
                        onChange={(e) => {
                          if (!editing || isViewMode) return;
                          updateExercise(idx, { description: e.target.value });
                        }}
                        placeholder="Consignas, series, repeticiones, variantes..."
                        disabled={!editing || isViewMode}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <div className="flex items-center justify-between print:hidden">
                        <label className="text-[11px] text-gray-500">Imagen / video (URL)</label>
                        {!editing && (
                          <span className="text-[10px] text-gray-400">Bloqueado</span>
                        )}
                      </div>
                      <input
                        className={`w-full rounded-md border px-2 py-1.5 text-sm print:hidden ${roCls}`}
                        value={ex.imageUrl}
                        onChange={(e) => {
                          if (!editing || isViewMode) return;
                          updateExercise(idx, { imageUrl: e.target.value });
                        }}
                        placeholder="https://..."
                        disabled={!editing || isViewMode}
                      />
                      {ex.imageUrl ? (
                        <div className="mt-2">
                          {isVideoUrl(ex.imageUrl) ? (
                            <div className="aspect-video w-full rounded-lg border overflow-hidden">
                              <iframe
                                src={ex.imageUrl}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={ex.imageUrl}
                              alt="Vista previa"
                              className="max-h-80 rounded-lg border object-contain"
                            />
                          )}
                        </div>
                      ) : null}
                    </div>
                  </>
              </div>
            </section>
          ))}

          {editing && !isViewMode && (
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
      )}

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

            {!loadingPicker && pickerExercises.length > 0 && (
              <div className="mb-2">
                <input
                  type="text"
                  className="w-full rounded-md border px-2 py-1.5 text-xs"
                  placeholder="Buscar por nombre..."
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                />
              </div>
            )}

            {loadingPicker ? (
              <p className="text-xs text-gray-500">Cargando ejercicios...</p>
            ) : pickerExercises.length === 0 ? (
              <p className="text-xs text-gray-500">
                No hay ejercicios en la biblioteca de Sesiones / Campo.
              </p>
            ) : visiblePickerExercises.length === 0 ? (
              <p className="text-xs text-gray-500">
                No hay ejercicios que coincidan con la búsqueda.
              </p>
            ) : (
              <ul className="max-h-64 overflow-auto divide-y divide-gray-100">
                {visiblePickerExercises.map((exLib) => (
                  <li key={exLib.id} className="py-1.5 text-xs">
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => applyLibraryExercise(exLib)}
                    >
                      <p className="font-medium text-gray-900">{exLib.name}</p>
                      {exLib.sessionMeta?.type && (
                        <p className="text-[11px] text-gray-500">
                          Tipo: {exLib.sessionMeta.type}
                        </p>
                      )}
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

          /* === ajustes de layout para impresión === */
          #print-root section.print\:page {
            margin-bottom: 6mm;
            padding: 8px 10px !important;
            border-width: 1px !important;
            page-break-inside: avoid !important;
          }

          #print-root h1 {
            font-size: 14px !important;
            margin-bottom: 4px !important;
          }

          #print-root h2,
          #print-root h3 {
            font-size: 12px !important;
          }

          #print-root label {
            font-size: 9px !important;
          }

          #print-root p,
          #print-root input,
          #print-root textarea {
            font-size: 10px !important;
            line-height: 1.3 !important;
          }

          #print-root img {
            max-width: 100% !important;
            height: auto !important;
          }
        }
      `}</style>
    </div>
  );
}

