"use client";

import React, { useMemo, useState } from "react";
import VideoPlayerModal from "@/components/training/VideoPlayerModal";
import {
  updateSessionExercise,
  deleteSessionExercise,
  type SessionMeta,
} from "@/lib/api/exercises";

type ExerciseClientDTO = {
  id: string;
  name: string;
  zone: string | null;
  videoUrl: string | null;
  isTeamExercise: boolean;
  createdAt: string;
  sessionMeta?: SessionMeta | null;
};

type Mode = "ROUTINE" | "SESSION";

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
  // Sesiones / Campo: sin Warmup/Campo/Gym como grouping,
  // solo una categoría simple usando zone.
  if (mode === "SESSION") {
    const raw = zoneRaw?.trim() || "";
    return {
      group: "Campo",
      primaryZone: raw || "Sin categoría",
      tags: [],
    };
  }

  // Rutinas / Gym: lógica original
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
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<"all" | ExerciseGroup>("all");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [videoPreview, setVideoPreview] = useState<{
    title: string;
    zone?: string | null;
    videoUrl?: string | null;
  } | null>(null);

  // edición / borrado (solo Sesiones / Campo)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editZone, setEditZone] = useState("");
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  function startEdit(ex: DerivedExercise) {
    if (mode !== "SESSION") return;
    setEditingId(ex.id);
    setEditName(ex.name);
    setEditZone(ex.zone ?? ex.primaryZone ?? "");
    setEditVideoUrl(ex.videoUrl ?? "");
    setErrorMsg(null);
  }

  async function handleSaveEdit(id: string) {
    if (mode !== "SESSION") return;
    try {
      setSavingEdit(true);
      setErrorMsg(null);
      await updateSessionExercise(id, {
        name: editName,
        zone: editZone || null,
        videoUrl: editVideoUrl || null,
      });
      setEditingId(null);
      // refresco simple
      window.location.reload();
    } catch (e: any) {
      setErrorMsg(e?.message || "Error al guardar cambios");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(id: string) {
    if (mode !== "SESSION") return;
    if (!confirm("¿Eliminar este ejercicio de la biblioteca?")) return;
    try {
      setDeletingId(id);
      setErrorMsg(null);
      await deleteSessionExercise(id);
      window.location.reload();
    } catch (e: any) {
      setErrorMsg(e?.message || "Error al eliminar ejercicio");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <section className="space-y-3">
        <div className="rounded-2xl border bg-white p-3 md:p-4 shadow-sm space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs text-gray-500">
                {filtered.length} de {totalCount} ejercicios
              </p>
              {errorMsg && (
                <p className="mt-1 text-[11px] text-red-600">
                  {errorMsg}
                </p>
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
            {/* Filtro por grupo solo en Rutinas / Gym */}
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

        {/* Lista */}
        <div className="rounded-2xl border bg-white shadow-sm max-h-[520px] overflow-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">
              No se encontraron ejercicios con esos filtros.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((ex) => {
                const isEditing = mode === "SESSION" && editingId === ex.id;

                return (
                  <li key={ex.id} className="px-3 py-2.5 text-xs md:text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <>
                            <input
                              className="mb-1 w-full rounded border px-2 py-1 text-xs"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                            />
                            <input
                              className="mb-1 w-full rounded border px-2 py-1 text-xs"
                              placeholder="Categoría"
                              value={editZone}
                              onChange={(e) => setEditZone(e.target.value)}
                            />
                            <input
                              className="mb-1 w-full rounded border px-2 py-1 text-xs"
                              placeholder="URL de video (opcional)"
                              value={editVideoUrl}
                              onChange={(e) => setEditVideoUrl(e.target.value)}
                            />
                          </>
                        ) : (
                          <>
                            {mode === "SESSION" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedId(expandedId === ex.id ? null : ex.id)
                                }
                                className="font-medium text-gray-900 truncate text-left hover:underline"
                              >
                                {ex.name}
                              </button>
                            ) : (
                              <p className="font-medium text-gray-900 truncate">
                                {ex.name}
                              </p>
                            )}
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
                              <>
                                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500">
                                  {ex.primaryZone &&
                                    ex.primaryZone !== "Sin categoría" && (
                                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5">
                                        {ex.primaryZone}
                                      </span>
                                    )}
                                </div>
                                {expandedId === ex.id && (
                                  ex.sessionMeta ? (
                                    <div className="mt-2 rounded-lg border bg-gray-50 p-3 text-[11px] text-gray-700 space-y-1">
                                      {ex.sessionMeta.type && (
                                        <p>
                                          <span className="font-semibold">Tipo:</span>{" "}
                                          {ex.sessionMeta.type}
                                        </p>
                                      )}
                                      {ex.sessionMeta.space && (
                                        <p>
                                          <span className="font-semibold">Espacio:</span>{" "}
                                          {ex.sessionMeta.space}
                                        </p>
                                      )}
                                      {typeof ex.sessionMeta.players === "number" && (
                                        <p>
                                          <span className="font-semibold">Jugadores:</span>{" "}
                                          {ex.sessionMeta.players}
                                        </p>
                                      )}
                                      {ex.sessionMeta.duration && (
                                        <p>
                                          <span className="font-semibold">Duración:</span>{" "}
                                          {ex.sessionMeta.duration}
                                        </p>
                                      )}
                                      {ex.sessionMeta.description && (
                                        <p>
                                          <span className="font-semibold">Descripción:</span>{" "}
                                          {ex.sessionMeta.description}
                                        </p>
                                      )}
                                      {ex.sessionMeta.imageUrl && (
                                        <p>
                                          <span className="font-semibold">Imagen:</span>{" "}
                                          <a
                                            href={ex.sessionMeta.imageUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-blue-600 hover:underline break-all"
                                          >
                                            {ex.sessionMeta.imageUrl}
                                          </a>
                                        </p>
                                      )}
                                      {ex.sessionMeta.sessionId && (
                                        <p>
                                          <span className="font-semibold">Sesión origen:</span>{" "}
                                          {ex.sessionMeta.sessionId}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="mt-2 rounded-lg border border-dashed bg-gray-50 p-3 text-[11px] text-gray-500">
                                      Este ejercicio se guardó sin detalles de sesión.
                                    </div>
                                  )
                                )}
                              </>
                            )}
                          </>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {ex.videoUrl && !isEditing && (
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
                          isEditing ? (
                            <div className="flex gap-1 mt-1">
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(ex.id)}
                                disabled={savingEdit}
                                className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] text-white"
                              >
                                {savingEdit ? "Guardando..." : "Guardar"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="rounded bg-gray-200 px-2 py-0.5 text-[10px] text-gray-700"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1 mt-1">
                              <button
                                type="button"
                                onClick={() => startEdit(ex)}
                                className="rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(ex.id)}
                                disabled={deletingId === ex.id}
                                className="rounded bg-red-50 px-2 py-0.5 text-[10px] text-red-600"
                              >
                                {deletingId === ex.id ? "Eliminando..." : "Eliminar"}
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
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
