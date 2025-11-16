"use client";

import { useState } from "react";
import type { TeamVideoDTO } from "@/lib/videos";
import { getVideoTypeLabel } from "@/lib/videos";

const shortDateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
});

const longDateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type Props = {
  initialVideos: TeamVideoDTO[];
};

export default function VideoViewer({ initialVideos }: Props) {
  const [videos, setVideos] = useState<TeamVideoDTO[]>(initialVideos);
  const [selected, setSelected] = useState<TeamVideoDTO | null>(initialVideos[0] ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/videos", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "No se pudieron cargar los videos");
      }
      const items = Array.isArray(payload?.data) ? (payload.data as TeamVideoDTO[]) : [];
      setVideos(items);
      setSelected(items[0] ?? null);
    } catch (err: any) {
      setError(err?.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px,minmax(0,1fr)]">
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <header className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Videos del cuerpo técnico</p>
            <h2 className="text-xl font-semibold text-gray-900">{videos.length || "Sin"} registros</h2>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </header>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <div className="mt-4 max-h-[520px] space-y-2 overflow-auto pr-2">
          {videos.length === 0 ? (
            <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
              Todavía no hay videos publicados para este equipo.
            </p>
          ) : (
            videos.map((video) => {
              const active = selected?.id === video.id;
              return (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => setSelected(video)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    active ? "border-gray-900 bg-gray-900/90 text-white" : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <p className={`text-xs uppercase tracking-wide ${active ? "text-gray-200" : "text-gray-500"}`}>
                    {getVideoTypeLabel(video.type)} · {shortDateFormatter.format(new Date(video.createdAt))}
                  </p>
                  <p className={`text-sm font-semibold ${active ? "text-white" : "text-gray-900"}`}>{video.title}</p>
                  {video.notes ? (
                    <p className={`mt-1 text-xs ${active ? "text-gray-100" : "text-gray-600"}`}>{video.notes}</p>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {selected ? (
          <article>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {getVideoTypeLabel(selected.type)} · {longDateFormatter.format(new Date(selected.createdAt))}
            </p>
            <h2 className="text-2xl font-semibold text-gray-900">{selected.title}</h2>
            {selected.notes ? <p className="mt-2 text-sm text-gray-600">{selected.notes}</p> : null}
            <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-black">
              <VideoPlayer url={selected.url} title={selected.title} />
            </div>
          </article>
        ) : (
          <div className="flex min-h-[320px] flex-col items-center justify-center text-center text-gray-500">
            <p className="text-sm">Seleccioná un video para reproducirlo.</p>
          </div>
        )}
      </section>
    </div>
  );
}

type VideoPlayerProps = {
  url: string;
  title: string;
};

type EmbedResult = { kind: "iframe"; src: string } | { kind: "video"; src: string };

function VideoPlayer({ url, title }: VideoPlayerProps) {
  const embed = resolveEmbed(url);
  if (embed.kind === "iframe") {
    return (
      <iframe
        src={embed.src}
        className="aspect-video w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title={title}
      />
    );
  }
  return <video controls playsInline className="aspect-video w-full bg-black" src={embed.src} />;
}

function resolveEmbed(rawUrl: string): EmbedResult {
  const url = rawUrl.trim();
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
  if (ytMatch) {
    return { kind: "iframe", src: `https://www.youtube.com/embed/${ytMatch[1]}` };
  }
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/i);
  if (vimeoMatch) {
    return { kind: "iframe", src: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }
  return { kind: "video", src: url };
}
