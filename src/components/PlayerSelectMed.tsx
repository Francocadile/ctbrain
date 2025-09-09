"use client";

import * as React from "react";
import usePlayersMed from "@/hooks/usePlayersMed";

type Props = {
  value: string;                 // id del jugador seleccionado
  onChange: (id: string) => void;
  className?: string;
  name?: string;
};

/**
 * Selector de jugadores para el parte médico.
 * Muestra estados: cargando / vacío / error + botón Recargar.
 */
export default function PlayerSelectMed({
  value,
  onChange,
  className,
  name = "player",
}: Props) {
  const { players, loading, error, reload } = usePlayersMed();

  // Si el value actual no existe en la lista (ej. cambió el rol), lo limpiamos
  React.useEffect(() => {
    if (!value) return;
    if (!players.some((p) => p.id === value)) onChange("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);

  const placeholder =
    loading
      ? "Cargando jugadores…"
      : error === "ERR"
      ? "Error cargando jugadores"
      : error === "EMPTY"
      ? "Sin jugadores disponibles"
      : "Jugador (nombre o email)";

  const disabled = loading || !!error;

  return (
    <div className="flex items-center gap-2">
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`rounded-md border px-2 py-1.5 text-sm min-w-64 ${className || ""}`}
      >
        {/* Placeholder */}
        <option value="" disabled>
          {placeholder}
        </option>

        {/* Opciones */}
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={reload}
        disabled={loading}
        className={`rounded-md border px-2 py-1.5 text-sm ${
          loading ? "opacity-60" : "hover:bg-gray-50"
        }`}
      >
        Recargar
      </button>

      {/* Mensajito fino si hay error o está vacío */}
      {error === "EMPTY" && (
        <span className="text-xs text-amber-600">
          No hay usuarios con rol <b>JUGADOR</b> en la base.
        </span>
      )}
      {error === "ERR" && (
        <span className="text-xs text-red-600">No se pudo cargar la lista.</span>
      )}
    </div>
  );
}
