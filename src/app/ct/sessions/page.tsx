"use client";

import React, { useEffect, useMemo, useState } from "react";

type Role = "ADMIN" | "CT" | "MEDICO" | "JUGADOR" | "DIRECTIVO";

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

type TurnKey = "morning" | "afternoon";

function ymdUTCFromISO(iso: string) {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function inferTurn(s: Session): TurnKey {
  // 1) Intentar por marcador en description: [GRID:turn:...] o [DAYFLAG:turn]
  const desc = s.description || "";
  let m = desc.match(/^\[(?:GRID|DAYFLAG):(morning|afternoon)/i);
  if (m && (m[1] === "morning" || m[1] === "afternoon")) return m[1] as TurnKey;

  // 2) Fallback por hora UTC (si fue creada con 9:00/15:00 desde el editor)
  const h = new Date(s.date).getUTCHours();
  return h >= 12 ? "afternoon" : "morning";
}

export default function CTSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [players, setPlayers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal (crear/editar)
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form
  const [title, setTitle] = useState("");
  thead
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
    // convertir ISO -> datetime-local (YYYY-MM-DDTHH:mm)
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

  const sorted = useMemo(
    () => [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [sessions]
  );

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
          <p className="text-sm text-gray-500">Planificación · Crear, editar y gestionar</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-xl shadow border text-sm font-medium hover:shadow-md"
        >
          Nueva sesión
        </button>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Cargando sesiones…</div>
      ) : sorted.length === 0 ? (
        <div className="rounded-lg border p-6 text-sm text-gray-600">
          No hay sesiones creadas aún.
        </div>
      ) : (
        <ul className="grid md:grid-cols-2 gap-4">
          {sorted.map((s) => {
            const ymd = ymdUTCFromISO(s.date);
            const turn = inferTurn(s);
            const byDayHref = `/ct/sessions/by-day/${ymd}/${turn}`;

            return (
              <li key={s.id} className="rounded-xl border p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">
                      <a href={byDayHref} className="hover:underline" title="Ver sesión por día/turno">
                        {s.title}
                      </a>
                    </h3>
                    {s.description ? (
                      <p className="text-sm text-gray-600 mt-1">{s.description}</p>
                    ) : null}
                    <div className="text-xs text-gray-500 mt-2">
                      <span className="inline-block mr-3">
                        📅 {new Date(s.date).toLocaleString()}
                      </span>
                      <span className="inline-block">
                        👤 {s.createdBy?.name || s.createdBy?.email || "CT"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`/ct/sessions/${s.id}`}
                      className="text-xs px-3 py-1 rounded-lg border hover:bg-gray-50"
                      title="Ver detalle por ID"
                    >
                      Ver detalle
                    </a>
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
                {s.players?.length ? (
                  <div className="mt-3">
                    <div className="text-xs font-medium mb-1">Jugadores asignados</div>
                    <div className="flex flex-wrap gap-2">
                      {s.players.map((p) => (
                        <span
                          key={p.id}
                          className="text-xs rounded-full border px-2 py-0.5"
                          title={p.email || undefined}
                        >
                          {p.name || p.email || p.id}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {/* Modal */}
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
                    placeholder="Ej: MD-3 · Alta intensidad"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Fecha y hora
                  </label>
                  <input
                    type="datetime-local"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Descripción (opcional)
                  </label>
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
                    <div className="px-3 py-2 text-sm text-gray-500">
                      Sin resultados
                    </div>
                  )}
                </div>

                {selectedIds.length > 0 && (
                  <div className="text-xs text-gray-600">
                    Seleccionados: {selectedIds.length}
                  </div>
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
