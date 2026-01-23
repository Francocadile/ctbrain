"use client";

import { useMemo, useState } from "react";

export type AudiencePlayer = {
  id: string;
  name: string | null;
  email: string;
};

type Props = {
  players: AudiencePlayer[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
};

export default function AudiencePicker({ players, value, onChange, disabled }: Props) {
  const [query, setQuery] = useState("");

  const selectedSet = useMemo(() => new Set(value), [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) => {
      const label = `${p.name ?? ""} ${p.email}`.trim().toLowerCase();
      return label.includes(q);
    });
  }, [query, players]);

  const selectedNames = useMemo(() => {
    const byId = new Map(players.map((p) => [p.id, p] as const));
    return value
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((p) => ((p!.name || p!.email).trim() ? (p!.name || p!.email).trim() : p!.email));
  }, [players, value]);

  function toggle(id: string) {
    if (disabled) return;
    onChange(selectedSet.has(id) ? value.filter((x) => x !== id) : [...value, id]);
  }

  function selectAllFiltered() {
    if (disabled) return;
    const merged = new Set(value);
    filtered.forEach((p) => merged.add(p.id));
    onChange(Array.from(merged));
  }

  function clear() {
    if (disabled) return;
    onChange([]);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700">Buscar jugador</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Apellido, nombre o email"
            disabled={disabled}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none disabled:bg-gray-50"
          />
        </div>
        <div className="flex gap-2 sm:pt-6">
          <button
            type="button"
            onClick={selectAllFiltered}
            disabled={disabled || filtered.length === 0}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Seleccionar todos
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={disabled || value.length === 0}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {value.length} seleccionados · {filtered.length} visibles
        </p>
      </div>

      <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-gray-100">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-sm text-gray-500">No hay resultados.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filtered.map((p) => {
              const label = (p.name || p.email).trim();
              const checked = selectedSet.has(p.id);
              return (
                <li key={p.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(p.id)}
                      className="h-4 w-4"
                    />
                    <span className="flex flex-col">
                      <span className="font-medium text-gray-900">{label}</span>
                      <span className="text-xs text-gray-500">{p.email}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selectedNames.length ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Seleccionados</p>
          <p className="mt-1 text-sm text-gray-700">{selectedNames.join(", ")}</p>
        </div>
      ) : null}
    </div>
  );
}
