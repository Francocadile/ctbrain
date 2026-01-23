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
  const [criterion, setCriterion] = useState<"name" | "surname">("surname");

  // Defensa: nunca asumimos que el valor viene como array.
  const ids = Array.isArray(value) ? value : [];

  const selectedSet = useMemo(() => new Set(ids), [ids]);

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
    return ids
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((p) => ((p!.name || p!.email).trim() ? (p!.name || p!.email).trim() : p!.email));
  }, [players, ids]);

  function toggle(id: string) {
    if (disabled) return;
    onChange(selectedSet.has(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  }

  function selectAllFiltered() {
    if (disabled) return;
    const merged = new Set(ids);
    filtered.forEach((p) => merged.add(p.id));
    onChange(Array.from(merged));
  }

  function clear() {
    if (disabled) return;
    onChange([]);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-xs text-gray-500">Jugadores</p>

      {/* Fila 1: búsqueda */}
      <div className="mt-2 grid grid-cols-[1fr_160px] items-end gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar jugador…"
          disabled={disabled}
          className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-gray-900 focus:outline-none disabled:bg-gray-50"
        />
        <select
          value={criterion}
          onChange={(e) => setCriterion(e.target.value as "name" | "surname")}
          disabled={disabled}
          className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-gray-900 focus:outline-none disabled:bg-gray-50"
        >
          <option value="surname">Apellido</option>
          <option value="name">Nombre</option>
        </select>
      </div>

      {/* Fila 2: acciones */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={selectAllFiltered}
          disabled={disabled || filtered.length === 0 || ids.length >= filtered.length}
          className="inline-flex min-h-10 w-full items-center justify-center whitespace-nowrap rounded-lg border border-gray-300 px-2 text-[11px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          Seleccionar todos
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={disabled || ids.length === 0}
          className="inline-flex min-h-10 w-full items-center justify-center whitespace-nowrap rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          Limpiar
        </button>
      </div>

      {/* Fila 3: estado */}
      <p className="mt-2 text-xs text-gray-500">
        {ids.length} seleccionados · {filtered.length} visibles
      </p>

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
