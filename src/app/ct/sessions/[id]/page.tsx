// src/app/ct/sessions/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getSessionById, updateSession, type SessionDTO } from "@/lib/api/sessions";
import {
  createSessionExercise,
  type SessionMeta,
  type ExerciseDTO,
} from "@/lib/api/exercises";
import { listKinds, addKind as apiAddKind, replaceKinds } from "@/lib/settings";
import SessionDetailView from "@/components/sessions/SessionDetailView";
import {
  encodeExercises,
  decodeExercises,
  type Exercise,
} from "@/lib/sessions/encodeDecodeExercises";

type TurnKey = "morning" | "afternoon";

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
   Helpers locales
   ========================= */

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
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const [pickerExercises, setPickerExercises] = useState<ExerciseDTO[]>([]);
  const [loadingPicker, setLoadingPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

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
        if (d.exercises.length) {
          // Si hay ejercicios embebidos en la descripción, usamos solo esos
          setExercises(d.exercises);
        } else if (isViewMode) {
          // Modo solo lectura: siempre consultamos la biblioteca por ejercicios de sesión.
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
                const meta: SessionMeta | null | undefined = exLib.sessionMeta;
                if (!meta) {
                  // Sin sessionMeta: respetamos que hay ejercicios en biblioteca pero mostramos campos vacíos.
                  return {
                    title: "",
                    kind: "",
                    space: "",
                    players: "",
                    duration: "",
                    description: "",
                    imageUrl: "",
                    routineId: "",
                    routineName: "",
                  };
                }

                return {
                  title: exLib.name || "",
                  kind: (meta.type as string) || "",
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

  // Nota: el flujo antiguo de linkRoutine en la URL fue eliminado.

  async function saveAll() {
    if (isViewMode) return;
    if (!s) return;
    setSaving(true);
    try {
  // 1) Persistimos la sesión con la descripción actualizada (fuente de verdad para el jugador)
      await persistSessionOnly();

      // 2) Extraemos el primer ejercicio real del editor
      const realExercises = exercises.filter(isRealExercise);
      if (realExercises.length > 0) {
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

        // 3) Upsert automático en la biblioteca de ejercicios de Sesión
        //    Delegamos completamente la decisión crear/actualizar al backend (POST /api/ct/exercises).
        await createSessionExercise({
          name,
          zone,
          videoUrl,
          originSessionId: s.id,
          sessionMeta,
        });
      }

      setEditing(false);
      alert("Guardado");
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function openLibraryPicker(idx: number) {
    if (isViewMode) return;
    try {
      setLoadingPicker(true);
      setPickerSearch("");
      setPickerIndex(idx);

      const res = await fetch("/api/ct/exercises?usage=SESSION", { cache: "no-store" });
      const json = await res.json();
      const list = Array.isArray((json as any)?.data) ? (json as any).data : json;
      setPickerExercises(Array.isArray(list) ? list : []);
    } catch (err: any) {
      console.error(err);
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
    <>
      <SessionDetailView
        session={s}
        exercises={exercises}
        markerRow={marker.row}
        markerTurn={marker.turn}
        markerYmd={marker.ymd}
        isViewMode={isViewMode}
        mode="ct"
        onSaveAll={saveAll}
        saving={saving}
        editing={editing}
        setEditing={setEditing}
        roCls={roCls}
        updateExercise={updateExercise}
        addExercise={addExercise}
        removeExercise={removeExercise}
        isVideoUrl={isVideoUrl}
        openLibraryPicker={openLibraryPicker}
        pickerIndex={pickerIndex}
        loadingPicker={loadingPicker}
        pickerExercises={pickerExercises}
        visiblePickerExercises={visiblePickerExercises}
        pickerSearch={pickerSearch}
        setPickerSearch={setPickerSearch}
        setPickerIndex={setPickerIndex}
      />

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
    </>
  );
}

