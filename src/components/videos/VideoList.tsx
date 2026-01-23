"use client";

import { useMemo } from "react";
import type { TeamVideoDTO } from "@/lib/videos";
import { getVideoTypeLabel } from "@/lib/videos";
import VisibilityBadges from "@/components/videos/VisibilityBadges";

const shortDateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
});

type VisibilityFilter = "ALL" | "DIRECTIVO" | "AUD_ALL" | "AUD_SELECTED";

type Props = {
  videos: TeamVideoDTO[];
  selectedId: string | null;
  onSelect: (video: TeamVideoDTO) => void;
  query: string;
  onQueryChange: (next: string) => void;
  filter: VisibilityFilter;
  onFilterChange: (next: VisibilityFilter) => void;
};

function chipClass(active: boolean) {
  return `rounded-full border px-3 py-1 text-xs font-medium transition ${
    active ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
  }`;
}

export default function VideoList({
  videos,
  selectedId,
  onSelect,
  query,
  onQueryChange,
  filter,
  onFilterChange,
}: Props) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return videos.filter((v) => {
      if (filter === "DIRECTIVO" && !v.visibleToDirectivo) return false;
      if (filter === "AUD_ALL" && v.audienceMode !== "ALL") return false;
      if (filter === "AUD_SELECTED" && v.audienceMode !== "SELECTED") return false;

      if (!q) return true;
      const haystack = `${v.title} ${v.notes ?? ""} ${v.type}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [videos, query, filter]);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700">Buscar</label>
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Título, notas…"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={chipClass(filter === "ALL")} onClick={() => onFilterChange("ALL")}>Todas</button>
        <button
          type="button"
          className={chipClass(filter === "DIRECTIVO")}
          onClick={() => onFilterChange("DIRECTIVO")}
        >
          Directivos
        </button>
        <button type="button" className={chipClass(filter === "AUD_ALL")} onClick={() => onFilterChange("AUD_ALL")}>
          Todos
        </button>
        <button
          type="button"
          className={chipClass(filter === "AUD_SELECTED")}
          onClick={() => onFilterChange("AUD_SELECTED")}
        >
          Seleccionados
        </button>
      </div>

      <div className="text-xs text-gray-500">
        {filtered.length === 0 ? "Sin resultados" : `${filtered.length} resultados`}
      </div>

      <div className="max-h-[70vh] space-y-2 overflow-auto pr-2">
        {filtered.length === 0 ? (
          <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">No hay videos para mostrar.</p>
        ) : (
          filtered.map((video) => {
            const active = selectedId === video.id;
            return (
              <button
                key={video.id}
                type="button"
                onClick={() => onSelect(video)}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                  active ? "border-gray-900 bg-gray-900/90 text-white" : "border-gray-200 hover:border-gray-400"
                }`}
              >
                <p className={`text-xs uppercase tracking-wide ${active ? "text-gray-200" : "text-gray-500"}`}>
                  {getVideoTypeLabel(video.type)} · {shortDateFormatter.format(new Date(video.createdAt))}
                </p>
                <p className={`font-semibold ${active ? "text-white" : "text-gray-900"}`}>{video.title}</p>
                {video.notes ? (
                  <p className={`mt-1 line-clamp-2 text-xs ${active ? "text-gray-100" : "text-gray-600"}`}>{video.notes}</p>
                ) : null}

                <VisibilityBadges video={video} active={active} className="mt-2" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export type { VisibilityFilter };
