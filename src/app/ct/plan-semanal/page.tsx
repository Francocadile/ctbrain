"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getSessionsWeek,
  createSession,
  deleteSession,
  updateSession,
  getMonday,
  toYYYYMMDDUTC,
  type SessionDTO,
  type SessionType,
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
// Combina un YYYY-MM-DD (UTC) con la hora/minuto de un ISO existente
function mergeDayWithTime(targetYmd: string, fromIso: string) {
  const t = new Date(fromIso);
  const hh = String(t.getUTCHours()).padStart(2, "0");
  const mi = String(t.getUTCMinutes()).padStart(2, "0");
  // construimos en UTC para mantener hora exacta
  return new Date(`${targetYmd}T${hh}:${mi}:00.000Z`).toISOString();
}

const TYPE_LABEL: Record<SessionType, string> = {
  GENERAL: "General",
  FUERZA: "Fuerza",
  TACTICA: "Táctica",
  AEROBICO: "Aeróbico",
  RECUPERACION: "Recuperación",
};
function typeBadgeCls(t: SessionType) {
  switch (t) {
    case "FUERZA": return "bg-red-100 text-red-700";
    case "TACTICA": return "bg-blue-100 text-blue-700";
    case "AEROBICO": return "bg-green-100 text-green-700";
    case "RECUPERACION": return "bg-purple-100 text-purple-700";
    default: return "bg-gray-100 text-gray-700";
  }
}

// --- Tipos para DnD payload ---
type DragPayload = {
  id: string;
  fromDay: string; // YYYY-MM-DD
  iso: string;     // fecha original ISO (para conservar hora)
};

export default function PlanSemanalPage() {
  // Semana base (lunes)
  const [base, setBase] = useState<Date>(() => getMonday(new Date()));

  // Datos de la semana
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState<Record<string, SessionDTO[]>>({});
  const [weekStart, setWeekStart] = useState<string>("");
  const [weekEnd, setWeekEnd] = useState<string>("");

  // Filtro por tipo
  const [filterType, setFilterType] = useState<SessionType | "ALL">("ALL");

  // Crear / editar
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SessionDTO | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState<string | null>("");
  const [dateLocal, setDateLocal] = useState(toLocalInputValue());
  const [type, setType] = useState<SessionType>("GENERAL");

  // Estado visual para drop targets
  const [overDay, setOverDay] = useState<string | null>(null);

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
  function openCreate() {
    setEditing(null);
    setTitle("");
    setDescription("");
    setDateLocal(toLocalInputValue());
    setType("GENERAL");
    setFormOpen(true);
  }

  // Abrir modal editar
  function openEdit(s: SessionDTO) {
    setEditing(s);
    setTitle(s.title || "");
    setDescription(s.description ?? "");
    setDateLocal(toLocalInputValue(s.date));
    setType((s.type as SessionType) ?? "GENERAL");
    setFormOpen(true);
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
          type,
        });
      } else {
        await updateSession(editing.id, {
          title: title.trim() || undefined,
          description:
            description === "" ? null : (description ?? undefined),
          date: iso,
          type,
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

  // ------------------------------
  // Drag & Drop (HTML5)
  // ------------------------------
  function onDragStart(ev: React.DragEvent<HTMLLIElement>, s: SessionDTO, dayKey: string) {
    const payload: DragPayload = { id: s.id, fromDay: dayKey, iso: s.date };
    ev.dataTransfer.setData("application/json", JSON.stringify(payload));
    ev.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(ev: React.DragEvent<HTMLDivElement>, targetDay: string) {
    ev.preventDefault(); // necesario para permitir drop
    ev.dataTransfer.dropEffect = "move";
    setOverDay(targetDay);
  }

  function onDragLeave(_ev: React.DragEvent<HTMLDivElement>, targetDay: string) {
    // quitar highlight si realmente se sale
    if (overDay === targetDay) setOverDay(null);
  }

  async function onDrop(ev: React.DragEvent<HTMLDivElement>, targetDay: string) {
    ev.preventDefault();
    setOverDay(null);

    let payload: DragPayload | null = null;
    try {
      payload = JSON.parse(ev.dataTransfer.getData("application/json"));
    } catch {
      return;
    }
    if (!payload) return;

    const { id, fromDay, iso } = payload;
    if (fromDay === targetDay) return; // no-op si mismo día

    // 1) Optimistic UI: mover en memoria
    setDays((prev) => {
      const copy: typeof prev = { ...prev };
      const fromList = (copy[fromDay] || []).filter((x) => x.id !== id);
      const moved = (copy[fromDay] || []).find((x) => x.id === id);
      const toList = [...(copy[targetDay] || [])];

      if (!moved) return prev;

      const newIso = mergeDayWithTime(targetDay, iso);
      const updated: SessionDTO = { ...moved, date: newIso };

      copy[fromDay] = fromList;
      copy[targetDay] = [...toList, updated].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      return copy;
    });

    // 2) Persistir en backend
    try {
      const newIso = mergeDayWithTime(targetDay, iso);
      await updateSession(id, { date: newIso });
    } catch (e) {
      // 3) Si falla, revertimos recargando semana
      console.error(e);
      alert("No se pudo actualizar la fecha. Se recargará la semana.");
      await loadWeek(base);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plan semanal</h1>
          <p className="text-sm text-gray-500">
            Semana {weekStart || "—"} → {weekEnd || "—"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro tipo */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-2 rounded-xl border"
            title="Filtrar por tipo"
          >
            <option value="ALL">Todos los tipos</option>
            <option value="GENERAL">General</option>
            <option value="FUERZA">Fuerza</option>
            <option value="TACTICA">Táctica</option>
            <option value="AEROBICO">Aeróbico</option>
            <option value="RECUPERACION">Recuperación</option>
          </select>

          <div className="w-px h-6 bg-gray-200 mx-1" />

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
            className="ml-1 px-4 py-2 rounded-xl bg-black text-white hover:opacity-90"
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
            const all = days[key] || [];
            const list =
              filterType === "ALL" ? all : all.filter((s) => s.type === filterType);
            const isToday = new Date().toISOString().slice(0, 10) === key;

            return (
              <div
                key={key}
                className={`rounded-2xl border p-3 bg-white transition-shadow ${
                  isToday ? "ring-2 ring-amber-400" : ""
                } ${overDay === key ? "shadow-[0_0_0_3px_rgba(59,130,246,0.4)]" : ""}`}
                onDragOver={(e) => onDragOver(e, key)}
                onDragLeave={(e) => onDragLeave(e, key)}
                onDrop={(e) => onDrop(e, key)}
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
                        draggable
                        onDragStart={(e) => onDragStart(e, s, key)}
                        className="rounded-xl border p-2 hover:bg-gray-50 cursor-grab active:cursor-grabbing"
                        title="Arrastrá para mover a otro día"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium flex items-center gap-2 truncate">
                              <span className={`text-[11px] px-2 py-0.5 rounded-full ${typeBadgeCls(s.type as SessionType)}`}>
                                {TYPE_LABEL[s.type as SessionType] ?? s.type}
                              </span>
                              <span className="truncate">{s.title}</span>
                            </div>
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
                  <label className="text-sm font-medium">
                    Fecha y hora
                  </label>
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
                <label className="text-sm font-medium">Tipo</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as SessionType)}
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                >
                  <option value="GENERAL">General</option>
                  <option value="FUERZA">Fuerza</option>
                  <option value="TACTICA">Táctica</option>
                  <option value="AEROBICO">Aeróbico</option>
                  <option value="RECUPERACION">Recuperación</option>
                </select>
                <div className="text-xs text-gray-500">
                  Usa el tipo para clasificar y filtrar sesiones como en Notion.
                </div>
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
