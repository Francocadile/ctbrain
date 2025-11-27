"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import VideoPlayerModal from "@/components/training/VideoPlayerModal";
import { deleteSessionExercise } from "@/lib/api/exercises";

type Mode = "ROUTINE" | "SESSION";

type SessionMeta = {
  type?: string | null;
  space?: string | null;
  players?: number | null;
  duration?: string | null;
  description?: string | null;
  originSessionId?: string | null;
};

type ExerciseClientDTO = {
  id: string;
  name: string;
  zone: string | null;
  videoUrl: string | null;
  isTeamExercise?: boolean;
  createdAt: string;
  // Extra para Sesiones / Campo
  originSessionId?: string | null;
  sessionMeta?: SessionMeta | null;
};

type Props = {
  exercises: ExerciseClientDTO[];
  mode: Mode;
};

type ExerciseGroup = "Warmup" | "Campo" | "Gym";

type DerivedExercise = ExerciseClientDTO & {
  group: ExerciseGroup;
  primaryZone: string;
  tags: string[];
};

const groupLabels: Record<ExerciseGroup, string> = {
  Warmup: "Warmup",
  Campo: "Campo",
  Gym: "Gym / Fuerza",
};

const groupChipClasses: Record<ExerciseGroup, string> = {
  Warmup: "bg-orange-50 text-orange-700 border-orange-200",
  Campo: "bg-sky-50 text-sky-700 border-sky-200",
  Gym: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function deriveExerciseMeta(zoneRaw: string | null, mode: Mode): {
  group: ExerciseGroup;
  primaryZone: string;
  tags: string[];
} {
  // 👉 Sesiones / Campo: usamos una categoría simple
  if (mode === "SESSION") {
    const raw = zoneRaw?.trim() || "";
    return {
      group: "Campo",
      primaryZone: raw || "Sin categoría",
      tags: [],
    };
  }

  // 👉 Rutinas / Gym (lógica original)
  if (!zoneRaw) {
    return {
      group: "Gym",
      primaryZone: "Sin categoría",
      tags: [],
    };
  }

  const raw = zoneRaw.trim();
  if (!raw) {
    return {
      group: "Gym",
      primaryZone: "Sin categoría",
      tags: [],
    };
  }

  const lower = raw.toLowerCase();

  if (lower.startsWith("warmup")) {
    const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
    return {
      group: "Warmup",
      primaryZone: parts[0] || "Warmup",
      tags: parts.slice(1),
    };
  }

  if (lower.startsWith("drills campo") || lower.includes("campo")) {
    const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
    return {
      group: "Campo",
      primaryZone: parts[0] || "Campo",
      tags: parts.slice(1),
    };
  }

  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  return {
    group: "Gym",
    primaryZone: parts[0] || "Gym",
    tags: parts.slice(1),
  };
}

export default function ExercisesLibraryClient({ exercises, mode }: Props) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<"all" | ExerciseGroup>("all");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [videoPreview, setVideoPreview] = useState<{
    title: string;
    zone?: string | null;
    videoUrl?: string | null;
  } | null>(null);

  // Sesiones / Campo
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const derived: DerivedExercise[] = useMemo(
    () =>
      exercises.map((e) => {
        const meta = deriveExerciseMeta(e.zone, mode);
        return { ...e, ...meta };
      }),
    [exercises, mode],
  );

  const zones = useMemo(() => {
    const set = new Set<string>();
    derived.forEach((e) => {
      set.add(e.primaryZone);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [derived]);

  const filtered = useMemo(
    () =>
      derived.filter((ex) => {
        if (mode === "ROUTINE" && groupFilter !== "all" && ex.group !== groupFilter) {
          return false;
        }
        if (zoneFilter !== "all" && ex.primaryZone !== zoneFilter) return false;
        if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [derived, mode, groupFilter, zoneFilter, search],
  );

  const totalCount = exercises.length;

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este ejercicio de la biblioteca?")) return;
    try {
      setDeletingId(id);
      setErrorMsg(null);
      await deleteSessionExercise(id);
      // Refresco optimista: filtramos localmente
      const remaining = exercises.filter((e) => e.id !== id);
      const updated = remaining.map((e) => {
        const meta = deriveExerciseMeta(e.zone, mode);
        return { ...e, ...meta };
      });
      // No podemos cambiar props, así que solo mostramos un toast.
      // Para ver el cambio real, el usuario recarga la página.
      alert("Ejercicio eliminado. Recarga la página para actualizar la lista.");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "No se pudo eliminar el ejercicio");
    } finally {
      setDeletingId(null);
    }
  }

  function handleEdit(ex: ExerciseClientDTO) {
    const sessionId = ex.originSessionId || ex.sessionMeta?.originSessionId;
    if (!sessionId) {
      alert("Este ejercicio no tiene sesión de origen vinculada.");
      return;
    }
    router.push(`/ct/sessions/${sessionId}`);
  }

  return (
    <>
      <section className="space-y-3">
        {/* Filtros */}
        <div className="rounded-2xl border bg-white p-3 md:p-4 shadow-sm space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs text-gray-500">
                {filtered.length} de {totalCount} ejercicios
              </p>
              {errorMsg && (
                <p className="mt-1 text-[11px] text-red-600">{errorMsg}</p>
              )}
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
              <input
                type="text"
                placeholder="Buscar por nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full md:w-64 rounded-lg border px-2.5 py-1.5 text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            {/* Filtro por grupo: SOLO Rutinas / Gym */}
            {mode === "ROUTINE" ? (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setGroupFilter("all")}
                  className={`rounded-full border px-3 py-1 text-[11px] md:text-xs ${
                    groupFilter === "all"
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  Todos
                </button>
                {(["Warmup", "Campo", "Gym"] as ExerciseGroup[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGroupFilter(g)}
                    className={`rounded-full border px-3 py-1 text-[11px] md:text-xs ${
                      groupFilter === g
                        ? `${groupChipClasses[g]} ring-1 ring-offset-1 ring-emerald-500`
                        : `${groupChipClasses[g]} opacity-80 hover:opacity-100`
                    }`}
                  >
                    {groupLabels[g]}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-gray-500">
                Biblioteca de ejercicios de campo guardados desde las sesiones.
              </div>
            )}

            {/* Filtro por zona / categoría */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-500">
                {mode === "ROUTINE" ? "Zona:" : "Categoría:"}
              </span>
              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                className="rounded-lg border px-2 py-1 text-[11px] md:text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">
                  {mode === "ROUTINE" ? "Todas" : "Todas las categorías"}
                </option>
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Lista de ejercicios */}
        <div className="rounded-2xl border bg-white shadow-sm max-h-[520px] overflow-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">
              No se encontraron ejercicios con esos filtros.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((ex) => (
                <li key={ex.id} className="px-3 py-2.5 text-xs md:text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId((prev) => (prev === ex.id ? null : ex.id))
                        }
                        className="text-left w-full"
                      >
                        <p className="font-medium text-gray-900 truncate underline-offset-2 hover:underline">
                          {ex.name}
                        </p>
                      </button>

                      {/* Tags / chips debajo del nombre */}
                      {mode === "ROUTINE" ? (
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 border text-[10px] ${
                              groupChipClasses[ex.group]
                            }`}
                          >
                            {groupLabels[ex.group]}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5">
                            {ex.primaryZone}
                          </span>
                          {ex.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5"
                            >
                              {tag}
                            </span>
                          ))}
                          {ex.tags.length > 2 && (
                            <span className="text-[9px] text-gray-400">
                              +{ex.tags.length - 2} más
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500">
                          {ex.primaryZone && ex.primaryZone !== "Sin categoría" && (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5">
                              {ex.primaryZone}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {ex.videoUrl && (
                        <button
                          type="button"
                          className="text-[11px] text-blue-600 hover:underline"
                          onClick={() =>
                            setVideoPreview({
                              title: ex.name,
                              zone: ex.zone,
                              videoUrl: ex.videoUrl,
                            })
                          }
                        >
                          Ver video
                        </button>
                      )}
                      <span className="text-[9px] text-gray-400">
                        {new Date(ex.createdAt).toLocaleDateString()}
                      </span>

                      {mode === "SESSION" && (
                        <div className="mt-1 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(ex)}
                            className="rounded-md border px-2 py-0.5 text-[10px] text-gray-700 hover:bg-gray-50"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === ex.id}
                            onClick={() => handleDelete(ex.id)}
                            className="rounded-md border border-red-200 px-2 py-0.5 text-[10px] text-red-600 hover:bg-red-50 disabled:opacity-60"
                          >
                            {deletingId === ex.id ? "Borrando..." : "Eliminar"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Detalle expandido SOLO en Sesiones / Campo */}
                  {mode === "SESSION" && expandedId === ex.id && (
                    <div className="mt-3 rounded-xl border bg-gray-50 px-3 py-2.5 text-[11px] text-gray-700">
                      {ex.sessionMeta ? (
                        <div className="space-y-0.5">
                          {ex.sessionMeta.type && (
                            <p>
                              <span className="font-semibold">Tipo: </span>
                              {ex.sessionMeta.type}
                            </p>
                          )}
                          {ex.sessionMeta.space && (
                            <p>
                              <span className="font-semibold">Espacio: </span>
                              {ex.sessionMeta.space}
                            </p>
                          )}
                          {ex.sessionMeta.players != null && (
                            <p>
                              <span className="font-semibold">Nº de jugadores: </span>
                              {ex.sessionMeta.players}
                            </p>
                          )}
                          {ex.sessionMeta.duration && (
                            <p>
                              <span className="font-semibold">Duración: </span>
                              {ex.sessionMeta.duration}
                            </p>
                          )}
                          {ex.sessionMeta.description && (
                            <p>
                              <span className="font-semibold">Descripción: </span>
                              {ex.sessionMeta.description}
                            </p>
                          )}
                          {(ex.originSessionId ||
                            ex.sessionMeta.originSessionId) && (
                            <p className="text-[10px] text-gray-500">
                              <span className="font-semibold">Sesión origen: </span>
                              {ex.originSessionId || ex.sessionMeta.originSessionId}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-500">
                          No hay detalles guardados para este ejercicio. Se creó
                          manualmente desde la sesión.
                        </p>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <VideoPlayerModal
        open={!!videoPreview}
        onClose={() => setVideoPreview(null)}
        title={videoPreview?.title ?? ""}
        zone={videoPreview?.zone ?? null}
        videoUrl={videoPreview?.videoUrl ?? null}
      />
    </>
  );
}
