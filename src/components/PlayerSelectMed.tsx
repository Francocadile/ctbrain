"use client";

import * as React from "react";
import { usePlayersMed } from "@/hooks/usePlayers"; // 👈 ruta correcta

type Props = {
  value: string;                    // id del jugador seleccionado
  onChange: (v: string) => void;    // setter desde el padre
  label?: string;
  disabled?: boolean;
  className?: string;
};

export default function PlayerSelectMed({
  value,
  onChange,
  label = "Jugador",
  disabled,
  className,
}: Props) {
  const { players, loading, error, reload } = usePlayersMed();

  const isDisabled = disabled || loading || !!error;

  return (
    <div className={className ?? ""}>
      <label className="text-sm font-medium">{label}</label>
      <div className="mt-1 flex items-center gap-2">
        <select
          className="h-10 w-full rounded-md border px-3 text-sm"
          disabled={isDisabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">
            {loading
              ? "Cargando jugadores..."
              : error
              ? "Error al cargar"
              : players.length === 0
              ? "Sin jugadores"
              : "Seleccionar jugador"}
          </option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>

        {error && (
          <button
            type="button"
            onClick={reload}
            className="h-10 rounded-md border px-3 text-sm"
          >
            Reintentar
          </button>
        )}
      </div>

      {!loading && !error && players.length === 0 && (
        <p className="mt-1 text-xs text-amber-600">
          No hay usuarios con rol <b>JUGADOR</b>.
        </p>
      )}
    </div>
  );
}
