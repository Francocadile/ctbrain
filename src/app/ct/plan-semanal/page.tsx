"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getSessionsWeek,
  createSession,
  deleteSession,
  updateSession,
  listPlayers,
  getMonday,
  toYYYYMMDDUTC,
  type SessionDTO,
  type UserLite,
} from "@/lib/api/sessions";

// Helpers de fecha
function addDaysUTC(date: Date, days: number) {
  const x = new Date(date);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}
function formatHuman(dateISO: string) {
  const d = new Date(dateISO);
  return d.toLocaleString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function toLocalInputValue(dateISO?: string) {
  const d = dateISO ? new Date(dateISO) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function PlanSemanalPage() {
  // Semana base (lunes)
  const [base, setBase] = useState<Date>(() => getMonday(new Date()));

  // Datos de la semana
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState<Record<string, SessionDTO[]>>({});
  const [weekStart, setWeekStart] = useState<string>("");
  const [weekEnd, setWeekEnd] = useState<string>("");

  // Crear / editar
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SessionDTO | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState<string | null>("");
  const [dateLocal, setDateLocal] = useState(toLocalInputValue());

  // Players
  const [allPlayers, setAllPlayers] = useState<UserLite[]>([]);
  const [playerIds, setPlayerIds] = useState<string[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  // Cargar datos de la semana
  async function loadWeek(d: Date) {
    setLoading(true);
    try {
      const monday = getMonday(d);
      const startYYYYMMDD = toYYYYMMDDUTC(monday);
      const res = await getSessionsWeek({ start: startYYYYMMDD });
      setDays(res.days);
      setWeekStart(res.weekStart);
      setWeekEnd(res.weekEnd);
    } catch (e) {
      console.error(e);
      alert("No se pudo cargar la semana.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWeek(base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  // Navegación de semanas
  const goPrevWeek = () => setBase((d) => addDaysUTC(d, -7));
  const goNextWeek = () => setBase((d) => addDaysUTC(d, 7));
  const goTodayWeek = () => setBase(getMonday(new Date()));

  // Días de la semana (YYYY-MM-DD) en orden
  const orderedDays = useMemo(() => {
    if (!weekStart) return [];
    const start = new Date(`${weekStart}T00:00:00.000Z`);
    return Array.from({ length: 7 }).map((_, i) =>
      toYYYYMMDDUTC(addDaysUTC(start, i))
    );
  }, [weekStart]);

  // Abrir modal crear
  async function openCreate() {
    setEditing(null);
    setTitle("");
    setDescription("");
    setDateLocal(toLocalInputValue());
    setPlayerIds([]);
    setFormOpen(true);
    await ensurePlayersLoaded();
  }

  // Abrir modal editar
  async function openEdit(s: SessionDTO) {
    setEditing(s);
    setTitle(s.title || "");
    setDescription(s.description ?? "");
    setDateLocal(toLocalInputValue(s.date));
    setPlayerIds((s.players ?? []).map((p) => p.id));
    setFormOpen(true);
    await ensurePlayersLoaded();
  }

  async function ensurePlayersLoaded() {
    if (allPlayers.length > 0) return;
    setLoadingPlayers(true);
    try {
      const list = await listPlayers();
      setAllPlayers(list);
    } catch (e) {
      console.error(e);
      alert("No se pudieron cargar los jugadores");
    } finally {
      setLoadingPlayers(false);
    }
  }

  // Guardar (crear o editar)
  async function saveSession() {
    try {
      const iso = new Date(dateLocal).toISOString();
      if (!editing) {
        await createSession({
          title: title.trim(),
          description: (description ?? "") || null,
          date: iso,
          playerIds,
        });
      } else {
        await updateSession(editing.id, {
          title: title.trim() || undefined,
          description: description === "" ? null : (description ?? undefined),
          date: iso,
          playerIds,
        });
      }
      setFormOpen(false);
      await loadWeek(base);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Error al guardar la sesión");
    }
  }

  // Borrar
  async function remove(id: string) {
    if (!confirm("¿Eliminar esta sesión?")) return;
    try {
      await deleteSession(id);
      await loadWeek(base);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Error al borrar la sesión");
    }
  }

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plan semanal</h1>
          <p className="text-sm text-gray-500">
            Semana {weekStart || "—"} → {weekEnd || "—"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goPrevWeek}
            className="px-3 py-2 rounded-xl border hover:bg-gray-50"
          >
            ◀ Semana anterior
          </button>
          <button
            onClick={goTodayWeek}
            className="px-3 py-2 rounded-xl border hover:bg-gray-50"
          >
            Hoy
          </button>
          <button
            onClick={goNextWeek}
            className="px-3 py-2 rounded-xl border hover:bg-gray-50"
          >
            Semana siguiente ▶
          </button>
          <button
            onClick={openCreate}
            className="ml-3 px-4 py-2 rounded-xl bg-black text-white hover:opacity-90"
          >
            + Nueva sesión
          </button>
        </div>
      </header>

      {loading ? (
        <div className="text-gray-500">Cargando semana…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {orderedDays.map((key) => {
            const list = days[key] || [];
            const isToday =
              new Date().toISOString().slice(0, 10) === key;

            return (
              <div
                key={key}
                className={`rounded-2xl border p-3 bg-white ${
                  isToday ? "ring-2 ring-amber-400" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">
                    {new Date(`${key}T00:00:00Z`).toLocaleDateString(
                      undefined,
                      { weekday: "short", day: "2-digit", month: "short" }
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{key}</span>
                </div>

                {list.length === 0 ? (
                  <div className="text-sm text-gray-400">
                    Sin sesiones
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {list.map((s) => (
                      <li
                        key={s.id}
                        className="rounded-xl border p-2 hover:bg-gray-50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{s.title}</div>
                            {s.description ? (
                              <div className="text-sm text-gray-600">
                                {s.description}
                              </div>
                            ) : null}
                            <div className="text-xs text-gray-500 mt-1">
                              {formatHuman(s.date)}
                            </div>
                            {s.user ? (
                              <div className="text-xs text-gray-400">
                                by {s.user.name || s.user.email || "CT"}
                              </div>
                            ) : null}
                            {/* Chips de jugadores */}
                            {s.players && s.players.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {s.players.map((p) => (
                                  <span
                                    key={p.id}
                                    className="text-xs rounded-full border px-2 py-0.5 text-gray-600"
                                    title={p.email || undefined}
                                  >
                                    {p.name || p.email || "Jugador"}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => openEdit(s)}
                              className="text-xs px-2 py-1 rounded-lg border hover:bg-gray-50"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => remove(s.id)}
                              className="text-xs px-2 py-1 rounded-lg border hover:bg-gray-50"
                            >
                              Borrar
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal simple */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editing ? "Editar sesión" : "Nueva sesión"}
              </h2>
              <button
                onClick={() => setFormOpen(false)}
                className="text-gray-500 hover:text-black"
              >
                ✕
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Título</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    placeholder="Ej: Fuerza + Aceleraciones"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Descripción</label>
                  <textarea
                    value={description ?? ""}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    rows={4}
                    placeholder="Objetivos, bloques, notas…"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Fecha y hora</label>
                  <input
                    type="datetime-local"
                    value={dateLocal}
                    onChange={(e) => setDateLocal(e.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Se guarda en UTC (tu hora local se convierte a ISO).
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Jugadores</label>
                <div className="rounded-xl border p-2 max-h-64 overflow-auto">
                  {loadingPlayers ? (
                    <div className="text-sm text-gray-500 p-2">Cargando jugadores…</div>
                  ) : allPlayers.length === 0 ? (
                    <div className="text-sm text-gray-400 p-2">
                      No hay jugadores cargados.
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {allPlayers.map((p) => {
                        const checked = playerIds.includes(p.id);
                        return (
                          <li key={p.id} className="flex items-center gap-2">
                            <input
                              id={`p-${p.id}`}
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const on = e.target.checked;
                                setPlayerIds((prev) =>
                                  on ? [...prev, p.id] : prev.filter((x) => x !== p.id)
                                );
                              }}
                            />
                            <label htmlFor={`p-${p.id}`} className="text-sm cursor-pointer">
                              {p.name || p.email || "Jugador"}
                              {p.email ? <span className="text-xs text-gray-400"> · {p.email}</span> : null}
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                {playerIds.length > 0 && (
                  <div className="text-xs text-gray-600">
                    {playerIds.length} jugador{playerIds.length > 1 ? "es" : ""} seleccionado{playerIds.length > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setFormOpen(false)}
                className="px-4 py-2 rounded-xl border hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={saveSession}
                className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
