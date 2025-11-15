"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { FeedbackPayload, SuperadminTeam } from "./types";

type Props = {
  team: SuperadminTeam;
  onFeedback: (payload: FeedbackPayload) => void;
};

function slugify(input: string) {
  return (input || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "equipo";
}

export default function TeamRow({ team, onFeedback }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);
  const [slug, setSlug] = useState(team.slug);
  const [active, setActive] = useState(team.isActive);
  const [loading, setLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(team.name);
    setSlug(team.slug);
    setActive(team.isActive);
  }, [team.id, team.name, team.slug, team.isActive]);

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) {
      setError("Nombre y slug son obligatorios");
      return;
    }
    setLoading(true);
    setError(null);
    const normalizedSlug = slugify(slug.trim());
    setSlug(normalizedSlug);
    try {
      const res = await fetch("/api/superadmin/teams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: team.id, name: name.trim(), slug: normalizedSlug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = data?.error || "Error al actualizar";
        setError(message);
        onFeedback({ type: "error", message });
      } else {
        setEditing(false);
        onFeedback({ type: "success", message: "Equipo actualizado" });
      }
    } catch {
      const message = "Error de red o inesperado";
      setError(message);
      onFeedback({ type: "error", message });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    setToggleLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/superadmin/teams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: team.id, isActive: !active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = data?.error || "No se pudo actualizar el estado";
        setError(message);
        onFeedback({ type: "error", message });
      } else {
        setActive((prev) => !prev);
        onFeedback({
          type: "success",
          message: !active ? "Equipo activado" : "Equipo desactivado",
        });
      }
    } catch {
      const message = "Error de red o inesperado";
      setError(message);
      onFeedback({ type: "error", message });
    } finally {
      setToggleLoading(false);
    }
  };

  return (
    <>
      <tr className={`border-t ${active ? "bg-white" : "bg-gray-50"}`}>
        <td className="px-4 py-3 align-top">
          {editing ? (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                className="rounded-lg border px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          ) : (
            <div>
              <p className="font-medium text-gray-900">{name}</p>
            </div>
          )}
        </td>
        <td className="px-4 py-3 align-top">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
              <button
                type="button"
                className="rounded-lg border border-gray-200 px-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setSlug(slugify(name))}
                disabled={!name.trim()}
              >
                Auto
              </button>
            </div>
          ) : (
            <code className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">{slug}</code>
          )}
        </td>
        <td className="px-4 py-3 align-top">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"
            }`}
          >
            {active ? "Activo" : "Inactivo"}
          </span>
        </td>
        <td className="px-4 py-3 align-top">
          <code className="text-xs text-gray-500">{team.id}</code>
        </td>
        <td className="px-4 py-3 align-top">
          {editing ? (
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                className="rounded-lg bg-green-600 px-3 py-1 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? "Guardando" : "Guardar"}
              </button>
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-3 py-1 font-semibold text-gray-600 hover:bg-gray-50"
                onClick={() => {
                  setEditing(false);
                  setName(team.name);
                  setSlug(team.slug);
                  setError(null);
                }}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3 text-sm">
              <button
                type="button"
                className="text-blue-600 hover:underline"
                onClick={() => setEditing(true)}
              >
                Editar
              </button>
              <Link
                href={`/superadmin/teams/${team.id}/users`}
                className="text-indigo-600 hover:underline"
              >
                Gestionar usuarios
              </Link>
              <button
                type="button"
                className={`font-medium ${active ? "text-amber-600" : "text-green-600"}`}
                disabled={toggleLoading}
                onClick={handleToggle}
              >
                {toggleLoading ? "Actualizando..." : active ? "Desactivar" : "Activar"}
              </button>
            </div>
          )}
        </td>
      </tr>
      {error && (
        <tr>
          <td colSpan={5} className="px-4 pb-4 text-xs text-red-600">
            {error}
          </td>
        </tr>
      )}
    </>
  );
}
