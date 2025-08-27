"use client";

import React, { useEffect, useMemo, useState } from "react";

type User = {
  id: string;
  name: string | null;
  email: string | null;
  role: "ADMIN" | "CT" | "MEDICO" | "JUGADOR" | "DIRECTIVO";
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
};

export default function CTSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form modal state
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 16)); // local datetime-local
  const [description, setDescription] = useState("");
  const [rawPlayerIds, setRawPlayerIds] = useState(""); // coma/separado por saltos de línea

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

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleCreate = async () => {
    try {
      setCreating(true);
      setError(null);

      // Parseo de playerIds (opcional): admite separados por coma o líneas
      const playerIds = rawPlayerIds
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      // date viene en local datetime-local → convertir a ISO “real”
      const iso = new Date(date).toISOString();

      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          date: iso,
          playerIds: playerIds.length ? playerIds : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo crear la sesión");

      // Reset
      setTitle("");
      setDescription("");
      setRawPlayerIds("");
      setDate(new Date().toISOString().slice(0, 16));
      setOpen(false);

      // Refresh list
      await fetchSessions();
    } catch (e: any) {
      setError(e.message || "Error creando sesión");
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
    () =>
      [...sessions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [sessions]
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sesiones</h1>
          <p className="text-sm text-gray-500">
            Planificación semanal · Crear, listar y gestionar sesiones
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
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
          {sorted.map((s) => (
            <li key={s.id} className="rounded-xl border p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{s.title}</h3>
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
                <button
                  onClick={() => handleDelete(s.id)}
                  className="text-xs px-3 py-1 rounded-lg border hover:bg-gray-50"
                >
                  Eliminar
                </button>
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
          ))}
        </ul>
      )}

      {/* Modal simple */}
      {open && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Nueva sesión</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-sm px-3 py-1 rounded-lg border hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Título</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="Ej: MD-3 · Tareas de alta intensidad"
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

              <div>
                <label className="block text-sm font-medium mb-1">
                  Player IDs (opcional)
                </label>
                <textarea
                  value={rawPlayerIds}
                  onChange={(e) => setRawPlayerIds(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm min-h-[60px]"
                  placeholder="Pega IDs de jugadores separados por coma o por línea"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tip: luego agregamos selector de jugadores por nombre; por ahora
                  acepta IDs (role=JUGADOR).
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="text-sm px-4 py-2 rounded-lg border hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !title.trim()}
                className="text-sm px-4 py-2 rounded-lg border shadow hover:shadow-md disabled:opacity-60"
              >
                {creating ? "Creando…" : "Crear sesión"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
