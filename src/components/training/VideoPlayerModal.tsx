"use client";

import React from "react";

export type VideoPlayerModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  zone?: string | null;
  videoUrl?: string | null;
};

function resolveYoutubeEmbedUrl(url: string): string {
  // Usamos la URL original para no romper el case del ID
  const shortMatch = /youtu\.be\/([^?&#]+)/i.exec(url);
  if (shortMatch?.[1]) {
    return `https://www.youtube.com/embed/${shortMatch[1]}`;
  }

  const watchMatch = /youtube\.com\/watch\?[^#]*v=([^&]+)/i.exec(url);
  if (watchMatch?.[1]) {
    return `https://www.youtube.com/embed/${watchMatch[1]}`;
  }

  // Ya es un embed u otra variante de YouTube
  return url;
}

function isVimeoUrl(url: string): boolean {
  return /vimeo\.com/i.test(url);
}

const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  open,
  onClose,
  title,
  zone,
  videoUrl,
}) => {
  if (!open || !videoUrl) return null;

  const trimmedUrl = (videoUrl || "").trim();

  const isYoutube = /youtube\.com|youtu\.be/i.test(trimmedUrl);
  const isVimeo = isVimeoUrl(trimmedUrl);

  let finalUrl = trimmedUrl;
  if (isYoutube) {
    finalUrl = resolveYoutubeEmbedUrl(trimmedUrl);
  } else if (isVimeo) {
    // si ya viene como https://player.vimeo.com/... lo usamos tal cual
    finalUrl = trimmedUrl;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-lg p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            {zone && (
              <p className="text-[11px] text-gray-500 mt-0.5">Zona: {zone}</p>
            )}
          </div>
          <button
            type="button"
            className="text-xs rounded-md border px-2 py-1 hover:bg-gray-50"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>

        <div className="w-full rounded-md bg-black max-h-64 overflow-hidden aspect-video">
          {(isYoutube || isVimeo) ? (
            <iframe
              src={finalUrl}
              title={title}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <video src={finalUrl} controls className="h-full w-full" />
          )}
        </div>

        <p className="text-[11px] text-gray-500">
          Cuando este ejercicio tenga descripción y puntos clave en el modelo, se mostrarán acá.
        </p>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerModal;
