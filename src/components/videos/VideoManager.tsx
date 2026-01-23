"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { TeamVideoDTO } from "@/lib/videos";
import { VIDEO_TYPE_OPTIONS, getVideoTypeLabel } from "@/lib/videos";
import VideoList, { type VisibilityFilter } from "@/components/videos/VideoList";
import AudiencePicker, { type AudiencePlayer } from "@/components/videos/AudiencePicker";
import VisibilityBadges from "@/components/videos/VisibilityBadges";

type AudienceMode = "ALL" | "SELECTED";

type TeamPlayerOption = {
  id: string;
  name: string | null;
  email: string;
};

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
  visibleToDirectivo: boolean;
  audienceMode: AudienceMode;
  selectedUserIds: string[];
};

const initialForm: FormState = {
  title: "",
  url: "",
  type: VIDEO_TYPE_OPTIONS[0].value,
  notes: "",
  visibleToDirectivo: true,
  audienceMode: "ALL",
  selectedUserIds: [],
};

type Props = {
  initialVideos: TeamVideoDTO[];
};

export default function VideoManager({ initialVideos }: Props) {
  const [videos, setVideos] = useState<TeamVideoDTO[]>(initialVideos);
  const [selected, setSelected] = useState<TeamVideoDTO | null>(initialVideos[0] ?? null);
  const [mode, setMode] = useState<"create" | "edit">(initialVideos[0] ? "edit" : "create");
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<TeamPlayerOption[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<VisibilityFilter>("ALL");

  useEffect(() => {
    let active = true;
    async function loadPlayers() {
      setLoadingPlayers(true);
      try {
        const res = await fetch("/api/ct/team/players", { cache: "no-store" });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload?.error || "No se pudieron cargar los jugadores");
        const list = Array.isArray(payload?.data) ? (payload.data as TeamPlayerOption[]) : [];
        if (active) setPlayers(list);
      } catch {
        // Silencioso: si falla, igual se puede publicar ALL.
      } finally {
        if (active) setLoadingPlayers(false);
      }
    }
    loadPlayers();
    return () => {
      active = false;
    };
  }, []);

  const totalLabel = useMemo(() => {
    const total = videos.length;
    if (!total) return "Sin videos registrados";
    if (total === 1) return "1 video disponible";
    return `${total} videos disponibles`;
  }, [videos.length]);

  const playersForPicker = useMemo(() => players as AudiencePlayer[], [players]);

  const selectedVideoForBadges = useMemo(() => {
    if (mode === "edit") return selected;
    return {
      visibleToDirectivo: form.visibleToDirectivo,
      audienceMode: form.audienceMode,
      selectedUserIds: form.selectedUserIds,
    } as Pick<TeamVideoDTO, "visibleToDirectivo" | "audienceMode" | "selectedUserIds">;
  }, [mode, selected, form.visibleToDirectivo, form.audienceMode, form.selectedUserIds]);

  const baseline = useMemo(() => {
    if (mode === "create") return initialForm;
    if (!selected) return initialForm;
    return {
      title: selected.title,
      url: selected.url,
      type: selected.type,
      notes: selected.notes ?? "",
      visibleToDirectivo: selected.visibleToDirectivo,
      audienceMode: selected.audienceMode,
      selectedUserIds: selected.audienceMode === "ALL" ? [] : selected.selectedUserIds,
    } satisfies FormState;
  }, [mode, selected]);

  const dirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(baseline);
  }, [form, baseline]);

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
        headers: { "Content-Type": "application/json", "X-CT-CSRF": "1" },
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
        setMode("edit");
      }
      setForm(initialForm);
      setMessage("Video publicado correctamente");
    } catch (err: any) {
      setError(err?.message || "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/videos/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-CT-CSRF": "1" },
        body: JSON.stringify({
          ...form,
          // si es ALL, limpiamos selectedUserIds para que el backend borre audiencia
          selectedUserIds: form.audienceMode === "SELECTED" ? form.selectedUserIds : [],
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "No se pudo actualizar el video");
      const updated = payload?.data as TeamVideoDTO | undefined;
      if (updated) {
        setVideos((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
        setSelected(updated);
        setMessage("Video actualizado");
      }
    } catch (err: any) {
      setError(err?.message || "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    const ok = window.confirm("¿Borrar este video?");
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/videos/${selected.id}`, {
        method: "DELETE",
        headers: { "X-CT-CSRF": "1" },
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "No se pudo borrar el video");
      setVideos((prev) => prev.filter((v) => v.id !== selected.id));
      setSelected((prev) => {
        if (!prev) return null;
        if (prev.id !== selected.id) return prev;
        return null;
      });
      setForm(initialForm);
      setMode("create");
      setMessage("Video eliminado");
    } catch (err: any) {
      setError(err?.message || "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(video: TeamVideoDTO) {
    setSelected(video);
    setMode("edit");
    setForm((prev) => ({
      ...prev,
      title: video.title,
      url: video.url,
      type: video.type,
      notes: video.notes ?? "",
      visibleToDirectivo: video.visibleToDirectivo,
      audienceMode: video.audienceMode,
      selectedUserIds: video.audienceMode === "ALL" ? [] : video.selectedUserIds,
    }));
    setMessage("Editando: ajustá campos y guardá cambios");
  }

  function startCreate() {
    setSelected(null);
    setMode("create");
    setForm(initialForm);
    setError(null);
    setMessage(null);
  }

  function discardChanges() {
    setForm(baseline);
    setError(null);
    setMessage("Cambios descartados");
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
      const first = list[0] ?? null;
      if (first) {
        startEdit(first);
      } else {
        setSelected(null);
        setForm(initialForm);
        setMode("create");
      }
      setMessage("Listado actualizado");
    } catch (err: any) {
      setError(err?.message || "Error inesperado");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px,minmax(0,1fr)]">
      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <header className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Videos</p>
              <h2 className="text-xl font-semibold text-gray-900">{totalLabel}</h2>
            </div>
            <button
              type="button"
              onClick={startCreate}
              className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black"
            >
              Nuevo video
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Última actualización {longDateFormatter.format(new Date())}</span>
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="text-xs font-medium text-gray-700 hover:underline disabled:opacity-60"
            >
              {refreshing ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
        </header>

        <VideoList
          videos={videos}
          selectedId={mode === "edit" ? selected?.id ?? null : null}
          onSelect={(v) => startEdit(v)}
          query={query}
          onQueryChange={setQuery}
          filter={filter}
          onFilterChange={setFilter}
        />
      </section>

      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <header className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {mode === "create" ? "Crear" : "Editar"}
              </p>
              <h2 className="truncate text-2xl font-semibold text-gray-900">
                {mode === "create" ? "Nuevo video" : selected?.title ?? "Video"}
              </h2>
              <VisibilityBadges
                video={
                  selectedVideoForBadges as Pick<TeamVideoDTO, "visibleToDirectivo" | "audienceMode" | "selectedUserIds">
                }
                className="mt-2"
              />
            </div>

            <div className="flex flex-wrap gap-2 sm:justify-end">
              {mode === "edit" ? (
                <>
                  <button
                    type="button"
                    onClick={handleUpdate}
                    disabled={submitting || !selected || !dirty}
                    className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
                  >
                    Guardar cambios
                  </button>
                  <button
                    type="button"
                    onClick={discardChanges}
                    disabled={submitting || !dirty}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    Descartar
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={submitting || !selected}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
                  >
                    Eliminar
                  </button>
                </>
              ) : (
                <button
                  type="submit"
                  form="video-editor"
                  disabled={submitting}
                  className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
                >
                  {submitting ? "Guardando..." : "Publicar"}
                </button>
              )}
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),380px]">
          <div className="space-y-4">
            <form
              id="video-editor"
              className="space-y-4"
              onSubmit={mode === "create" ? handleSubmit : (e) => e.preventDefault()}
            >
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

              <div className="grid gap-3 sm:grid-cols-2">
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
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Visibilidad</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm text-gray-800">
                    <input
                      type="checkbox"
                      checked={form.visibleToDirectivo}
                      onChange={(e) => updateField("visibleToDirectivo", e.target.checked)}
                    />
                    Visible para directivos
                  </label>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Audiencia</label>
                    <select
                      value={form.audienceMode}
                      onChange={(e) => {
                        const next = e.target.value as AudienceMode;
                        updateField("audienceMode", next);
                        if (next === "ALL") updateField("selectedUserIds", []);
                      }}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                    >
                      <option value="ALL">Todo el plantel</option>
                      <option value="SELECTED">Jugadores seleccionados</option>
                    </select>
                  </div>
                </div>

                {form.audienceMode === "SELECTED" ? (
                  <div className="mt-3">
                    <label className="text-sm font-medium text-gray-700">Jugadores</label>
                    <div className="mt-2">
                      <AudiencePicker
                        players={playersForPicker}
                        value={form.selectedUserIds}
                        onChange={(next) => updateField("selectedUserIds", next)}
                        disabled={loadingPlayers}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        {loadingPlayers
                          ? "Cargando jugadores…"
                          : players.length
                            ? "La visibilidad se aplica solo a jugadores seleccionados."
                            : "No se pudo cargar el listado; podés publicar para todo el plantel."}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Notas</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                  placeholder="Contexto del video, puntos clave"
                />
              </div>
            </form>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            {mode === "edit" && selected ? <VideoPlayer video={selected} /> : <CreatePreview url={form.url} title={form.title} type={form.type} />}
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

type CreatePreviewProps = {
  url: string;
  title: string;
  type: string;
};

function CreatePreview({ url, title, type }: CreatePreviewProps) {
  const trimmed = url.trim();
  if (!trimmed) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center text-center text-gray-500">
        <p className="text-sm">Pegá una URL para ver la previsualización.</p>
      </div>
    );
  }
  const embed = resolveEmbed(trimmed);
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500">{getVideoTypeLabel(type)}</p>
      <h3 className="text-2xl font-semibold text-gray-900">{title || "Nuevo video"}</h3>
      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-black">
        {embed.kind === "iframe" ? (
          <iframe
            src={embed.src}
            className="aspect-video w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={title || "Nuevo video"}
          />
        ) : (
          <video controls playsInline className="aspect-video w-full bg-black" src={embed.src} />
        )}
      </div>
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
