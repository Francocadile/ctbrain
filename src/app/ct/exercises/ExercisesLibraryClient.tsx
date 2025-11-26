"use client";

import React, { useMemo, useState } from "react";
import VideoPlayerModal from "@/components/training/VideoPlayerModal";

type ExerciseClientDTO = {
  id: string;
  name: string;
  zone: string | null;
  videoUrl: string | null;
  isTeamExercise: boolean;
  createdAt: string;
};

type Props = {
  exercises: ExerciseClientDTO[];
};

type ExerciseGroup = "Warmup" | "Campo" | "Gym";

type DerivedExercise = ExerciseClientDTO & {
  group: ExerciseGroup;
  primaryZone: string;
  tags: string[];
};

function deriveExerciseMeta(zoneRaw: string | null): {
  group: ExerciseGroup;
  primaryZone: string;
  tags: string[];
} {
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

  if (raw.toLowerCase().startsWith("warmup")) {
    const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
    return {
      group: "Warmup",
      primaryZone: parts[0] || "Warmup",
      tags: parts.slice(1),
    };
  }

  if (raw.toLowerCase().startsWith("drills campo") || raw.toLowerCase().includes("campo")) {
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

export default function ExercisesLibraryClient({ exercises }: Props) {
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<"all" | ExerciseGroup>("all");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [videoPreview, setVideoPreview] = useState<{
    title: string;
    zone?: string | null;
    videoUrl?: string | null;
  } | null>(null);

  const derived: DerivedExercise[] = useMemo(
    () =>
      exercises.map((e) => {
        const meta = deriveExerciseMeta(e.zone);
        return { ...e, ...meta };
      }),
    [exercises],
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
        if (groupFilter !== "all" && ex.group !== groupFilter) return false;
        if (zoneFilter !== "all" && ex.primaryZone !== zoneFilter) return false;
        if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [derived, groupFilter, zoneFilter, search],
  );

  const totalCount = exercises.length;

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
            {/* Filtro por grupo */}
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

            {/* Filtro por zona */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-500">Zona:</span>
              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                className="rounded-lg border px-2 py-1 text-[11px] md:text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">Todas</option>
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
                      <p className="font-medium text-gray-900 truncate">{ex.name}</p>
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
                    </div>
                  </div>
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
