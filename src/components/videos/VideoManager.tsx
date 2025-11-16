"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { TeamVideoDTO } from "@/lib/videos";
import { VIDEO_TYPE_OPTIONS, getVideoTypeLabel } from "@/lib/videos";

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

type FormState = {
  title: string;
  url: string;
  type: string;
  notes: string;
};

const initialForm: FormState = {
  title: "",
  url: "",
  type: VIDEO_TYPE_OPTIONS[0].value,
  notes: "",
};

type Props = {
  initialVideos: TeamVideoDTO[];
};

export default function VideoManager({ initialVideos }: Props) {
  const [videos, setVideos] = useState<TeamVideoDTO[]>(initialVideos);
  const [selected, setSelected] = useState<TeamVideoDTO | null>(initialVideos[0] ?? null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalLabel = useMemo(() => {
    const total = videos.length;
    if (!total) return "Sin videos registrados";
    if (total === 1) return "1 video disponible";
    return `${total} videos disponibles`;
  }, [videos.length]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "No se pudo guardar el video");
      }
      const created = payload?.data as TeamVideoDTO | undefined;
      if (created) {
        setVideos((prev) => [created, ...prev]);
        setSelected(created);
      }
      setForm(initialForm);
      setMessage("Video publicado correctamente");
    } catch (err: any) {
      setError(err?.message || "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/videos", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "No se pudieron obtener los videos");
      }
      const list = Array.isArray(payload?.data) ? (payload.data as TeamVideoDTO[]) : [];
      setVideos(list);
      setSelected(list[0] ?? null);
      setMessage("Listado actualizado");
    } catch (err: any) {
      setError(err?.message || "Error inesperado");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px,minmax(0,1fr)]">
      <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Nuevo video</p>
          <h2 className="text-xl font-semibold text-gray-900">Compartí material táctico</h2>
          <p className="text-xs text-gray-500">El video queda disponible para los directivos del equipo actual.</p>
        </header>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-medium text-gray-700">Título</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Tipo</label>
            <select
              value={form.type}
              onChange={(e) => updateField("type", e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            >
              {VIDEO_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">URL</label>
            <input
              type="url"
              value={form.url}
              onChange={(e) => updateField("url", e.target.value)}
              required
              placeholder="https://..."
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Notas</label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
              placeholder="Contexto del video, puntos clave"
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
          >
            {submitting ? "Guardando..." : "Publicar video"}
          </button>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {refreshing ? "Actualizando..." : "Actualizar listado"}
          </button>
        </form>
      </section>

      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <header className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Videos del equipo</p>
            <h2 className="text-xl font-semibold text-gray-900">{totalLabel}</h2>
          </div>
          <span className="text-xs text-gray-400">Última actualización {longDateFormatter.format(new Date())}</span>
        </header>
        <div className="grid gap-4 lg:grid-cols-[220px,minmax(0,1fr)]">
          <div className="max-h-[520px] space-y-2 overflow-auto pr-2">
            {videos.length === 0 ? (
              <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                Publicá tu primer video para compartirlo.
              </p>
            ) : (
              videos.map((video) => {
                const active = selected?.id === video.id;
                return (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => setSelected(video)}
                    className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                      active ? "border-gray-900 bg-gray-900/90 text-white" : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <p className={`text-xs uppercase tracking-wide ${active ? "text-gray-200" : "text-gray-500"}`}>
                      {getVideoTypeLabel(video.type)} · {shortDateFormatter.format(new Date(video.createdAt))}
                    </p>
                    <p className={`font-semibold ${active ? "text-white" : "text-gray-900"}`}>{video.title}</p>
                    {video.notes ? (
                      <p className={`mt-1 text-xs ${active ? "text-gray-100" : "text-gray-600"}`}>{video.notes}</p>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            {selected ? <VideoPlayer video={selected} /> : <EmptyPlayerState />}
          </div>
        </div>
      </section>
    </div>
  );
}

type PlayerProps = {
  video: TeamVideoDTO;
};

function VideoPlayer({ video }: PlayerProps) {
  const embed = resolveEmbed(video.url);
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500">
        {getVideoTypeLabel(video.type)} · {shortDateFormatter.format(new Date(video.createdAt))}
      </p>
      <h3 className="text-2xl font-semibold text-gray-900">{video.title}</h3>
      {video.notes ? <p className="mt-1 text-sm text-gray-600">{video.notes}</p> : null}
      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-black">
        {embed.kind === "iframe" ? (
          <iframe
            src={embed.src}
            className="aspect-video w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={video.title}
          />
        ) : (
          <video controls playsInline className="aspect-video w-full bg-black" src={embed.src} />
        )}
      </div>
    </div>
  );
}

function EmptyPlayerState() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center text-center text-gray-500">
      <p className="text-sm">Seleccioná un video para reproducirlo.</p>
    </div>
  );
}

type EmbedResult = { kind: "iframe"; src: string } | { kind: "video"; src: string };

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
