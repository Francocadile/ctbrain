"use client";
import { useEffect, useState } from "react";
import type { FeedbackPayload } from "./types";

const DEFAULT_SLUG = "equipo";

function slugify(input: string) {
  return (input || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || DEFAULT_SLUG;
}

type Props = {
  onFeedback?: (payload: FeedbackPayload) => void;
};

export default function CreateTeamForm({ onFeedback }: Props) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugDirty, setSlugDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slugDirty) {
      setSlug(name.trim() ? slugify(name) : "");
    }
  }, [name, slugDirty]);

  const resetForm = () => {
    setName("");
    setSlugDirty(false);
  setSlug("");
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    if (!slug.trim()) {
      setError("El slug es obligatorio");
      return;
    }

    setLoading(true);
    const normalizedSlug = slugify(slug.trim());
    setSlug(normalizedSlug);
    try {
      const res = await fetch("/api/superadmin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: normalizedSlug }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message = data?.error || `Error ${res.status}`;
        setError(message);
        onFeedback?.({ type: "error", message });
      } else {
        resetForm();
        onFeedback?.({ type: "success", message: "Equipo creado correctamente" });
      }
    } catch {
      const message = "Error de red o inesperado";
      setError(message);
      onFeedback?.({ type: "error", message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Nombre del equipo</label>
        <input
          type="text"
          className="rounded-lg border px-4 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Selección Mayor"
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Slug público</label>
        <div className="flex gap-2">
          <input
            type="text"
            className="w-full rounded-lg border px-4 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={slug}
            onChange={(e) => {
              setSlugDirty(true);
              setSlug(e.target.value);
            }}
            placeholder="seleccion-mayor"
          />
          <button
            type="button"
            className="rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => {
              if (!name.trim()) return;
              setSlug(slugify(name));
              setSlugDirty(false);
            }}
            disabled={!name.trim()}
          >
            Auto
          </button>
        </div>
        <p className="text-xs text-gray-500">Solo minúsculas, números y guiones.</p>
      </div>

      {error && (
        <div className="col-span-full rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="col-span-full">
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Creando equipo..." : "Crear equipo"}
        </button>
      </div>
    </form>
  );
}

