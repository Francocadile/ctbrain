// src/app/ct/sessions/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

type Role = "ADMIN" | "CT" | "MEDICO" | "JUGADOR" | "DIRECTIVO";
type TurnKey = "morning" | "afternoon";

type User = {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
};

type Session = {
  id: string;
  title: string;
  description?: string | null;
  date: string; // ISO
  createdAt: string; // ISO
  updatedAt: string; // ISO
  createdBy: Pick<User, "id" | "name" | "email">;
  players: User[];
  type?: string | null;
};

// ---- helpers -------------------------------------------------------
function ymdUTCFromISO(iso: string) {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

/** Marca de turno/bloque dentro de description:
 *  [GRID:morning:PRE ENTREN0] | YYYY-MM-DD
 *  [DAYFLAG:afternoon] | YYYY-MM-DD
 */
function parseTurnAndRow(description?: string | null): {
  turn?: TurnKey;
  row?: string;
} {
  const text = (description || "").trim();
  if (!text) return {};
  let m = text.match(/^\[GRID:(morning|afternoon):(.+?)\]/i);
  if (m) return { turn: m[1] as TurnKey, row: (m[2] || "").trim() };
  m = text.match(/^\[DAYFLAG:(morning|afternoon)\]/i);
  if (m) return { turn: m[1] as TurnKey };
  return {};
}

/** Si no hay marcador, inferir por hora UTC */
function inferTurnFromISO(iso: string): TurnKey {
  const h = new Date(iso).getUTCHours();
  return h < 12 ? "morning" : "afternoon";
}

export default function CTSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [players, setPlayers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtro por fecha (YYYY-MM-DD). Vacío => mostrar todas
  const [dateFilter, setDateFilter] = useState<string>("");

  // Modal (crear/editar)
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [description, setDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [playerSearch, setPlayerSearch] = useState("");

  // Helpers
  const filteredPlayers = useMemo(() => {
    const q = playerSearch.trim().toLowerCase();
    if (!q) return players;
    return players.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q)
    );
  }, [players, playerSearch]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/sessions", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudieron cargar las sesiones");
      setSessions(json.data as Session[]);
    } catch (e: any) {
      setError(e.message || "Error cargando sesiones");
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayers = async () => {
    try {
      const res = await fetch("/api/users?role=JUGADOR", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudieron cargar jugadores");
      setPlayers(json.data as User[]);
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchPlayers();
  }, []);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSelectedIds([]);
    setDate(new Date().toISOString().slice(0, 16));
    setPlayerSearch("");
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (s: Session) => {
    setEditingId(s.id);
    setTitle(s.title);
    setDescription(s.description || "");
    const dt = new Date(s.date);
    const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setDate(local);
    setSelectedIds(s.players?.map((p) => p.id) || []);
    setPlayerSearch("");
    setOpen(true);
  };

  const handleSubmit = async () => {
    try {
      setCreating(true);
      setError(null);

      const iso = new Date(date).toISOString();
      const payload = {
        title,
        description: description || undefined,
        date: iso,
        playerIds: selectedIds.length ? selectedIds : undefined,
      };

      let res: Response;
      if (editingId) {
        res = await fetch(`/api/sessions/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "No se pudo guardar la sesión");

      setOpen(false);
      resetForm();
      await fetchSessions();
    } catch (e: any) {
      setError(e.message || "Error guardando sesión");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta sesión?")) return;
    try {
      setError(null);
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "No se pudo eliminar la sesión");
      await fetchSessions();
    } catch (e: any) {
      setError(e.message || "Error eliminando sesión");
    }
  };

  // Ordenar todas por fecha (desc)
  const sortedAll = useMemo(
    () => [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [sessions]
  );

  // Aplicar filtro por fecha si se eligió un día
  const visible = useMemo(() => {
    if (!dateFilter) return sortedAll;
    return sortedAll.filter((s) => ymdUTCFromISO(s.date) === dateFilter);
  }, [sortedAll, dateFilter]);

  const togglePlayer = (id: string) => {
    setSelectedIds((curr) =>
      curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sesiones</h1>
          <p className="text-sm text-gray-500">Listado cronológico · “Ver sesión” abre el día/turno</p>
        </div>

        {/* Filtro por fecha (opcional) */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-lg border px-2 py-1.5 text-sm"
            placeholder="YYYY-MM-DD"
            title="Filtrar por fecha"
          />
          <button
            onClick={() => setDateFilter("")}
            className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50"
            disabled={!dateFilter}
            title="Quitar filtro"
          >
            Limpiar
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-xl shadow border text-sm font-medium hover:shadow-md"
          >
            Nueva sesión
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Cargando sesiones…</div>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border p-6 text-sm text-gray-600">
          No hay sesiones para mostrar.
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((s, idx) => {
            const { turn: parsedTurn, row } = parseTurnAndRow(s.description);
            const turn = parsedTurn ?? inferTurnFromISO(s.date);
            const ymd = ymdUTCFromISO(s.date);
            const byDayHref =
              `/ct/sessions/by-day/${ymd}/${turn}` +
              (row ? `?focus=${encodeURIComponent(row)}` : "");

            // Título visual: si no hay, generamos "Sesión N TM/TT"
            const hasTitle = (s.title || "").trim().length > 0;
            const displayTitle = hasTitle
              ? (s.title || "").trim()
              : `Sesión ${idx + 1} ${turn === "morning" ? "TM" : "TT"}`;

            return (
              <li key={s.id} className="rounded-xl border p-3 shadow-sm flex items-start justify-between bg-white">
                <div>
                  <h3 className="font-semibold text-[15px]">
                    <a href={byDayHref} className="hover:underline" title="Abrir sesión (día/turno)">
                      {displayTitle}
                    </a>
                  </h3>

                  <div className="text-xs text-gray-500 mt-1">
                    <span className="inline-block mr-3">📅 {new Date(s.date).toLocaleString()}</span>
                    <span className="inline-block mr-3">🕑 {turn === "morning" ? "Mañana" : "Tarde"}</span>
                    <span className="inline-block">👤 {s.createdBy?.name || s.createdBy?.email || "CT"}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <a
                    href={byDayHref}
                    className="text-xs px-3 py-1.5 rounded-lg border hover:bg-gray-50"
                    title="Ver sesión (día/turno)"
                  >
                    Ver sesión
                  </a>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(s)}
                      className="text-xs px-3 py-1 rounded-lg border hover:bg-gray-50"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-xs px-3 py-1 rounded-lg border hover:bg-gray-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Modal crear/editar (igual que tenías) */}
      {open && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">
                {editingId ? "Editar sesión" : "Nueva sesión"}
              </h2>
              <button
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
                className="text-sm px-3 py-1 rounded-lg border hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Título</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="Ej: Sesión 12 · MD-3 · Alta intensidad"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Si lo dejás vacío, en el listado se mostrará “Sesión N TM/TT”.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Fecha y hora</label>
                  <input
                    type="datetime-local"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Descripción (opcional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm min-h-[80px]"
                    placeholder="Objetivos, bloques, cargas, observaciones…"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Jugadores</label>
                <input
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                  placeholder="Buscar por nombre o email…"
                  className="w-full rounded-lg border px-3 py-2 text-sm mb-2"
                />
                <div className="max-h-48 overflow-auto rounded-lg border divide-y">
                  {filteredPlayers.map((p) => {
                    const checked = selectedIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
                        title={p.email || undefined}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePlayer(p.id)}
                        />
                        <span>{p.name || p.email || p.id}</span>
                      </label>
                    );
                  })}
                  {filteredPlayers.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500">Sin resultados</div>
                  )}
                </div>

                {selectedIds.length > 0 && (
                  <div className="text-xs text-gray-600">Seleccionados: {selectedIds.length}</div>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
                className="text-sm px-4 py-2 rounded-lg border hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={creating || !title.trim()}
                className="text-sm px-4 py-2 rounded-lg border shadow hover:shadow-md disabled:opacity-60"
              >
                {creating ? "Guardando…" : editingId ? "Guardar cambios" : "Crear sesión"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
