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
} from "@/lib/api/sessions";
import { useSearchParams } from "next/navigation";

/** Utilidades de fecha en UTC */
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
    month: "2-digit",
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

/** Resaltado simple (case-insensitive) para búsqueda local */
function highlight(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);
  return (
    <>
      {before}
      <mark className="bg-yellow-200 px-0.5 rounded">{match}</mark>
      {after}
    </>
  );
}

export default function PlanSemanalPage() {
  // Flag para ocultar encabezado grande (pero SIEMPRE mantenemos la barra de semana)
  const search = useSearchParams();
  const hideHeader = search.get("hideHeader") === "1";

  /** Semana base (lunes) */
  const [base, setBase] = useState<Date>(() => getMonday(new Date()));

  /** Datos de la semana */
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState<Record<string, SessionDTO[]>>({});
  const [weekStart, setWeekStart] = useState<string>("");
  const [weekEnd, setWeekEnd] = useState<string>("");

  /** Crear / editar (CON BOTÓN GUARDAR — sin autoguardado) */
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SessionDTO | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState<string | null>("");
  const [dateLocal, setDateLocal] = useState(toLocalInputValue());

  /** Búsqueda local */
  const [query, setQuery] = useState("");

  /** Cargar datos de la semana (Lun→Dom) */
  async function loadWeek(d: Date) {
    setLoading(true);
    try {
      const monday = getMonday(d);
      const startYYYYMMDD = toYYYYMMDDUTC(monday);
      const res = await getSessionsWeek({ start: startYYYYMMDD });
      // Normalizamos 7 días (incluye Domingo)
      const start = new Date(`${res.weekStart}T00:00:00.000Z`);
      const normalized: Record<string, SessionDTO[]> = {};
      for (let i = 0; i < 7; i++) {
        const key = toYYYYMMDDUTC(addDaysUTC(start, i));
        normalized[key] = res.days[key] || [];
      }
      setDays(normalized);
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

  /** Navegación de semanas — SIEMPRE disponible */
  const goPrevWeek = () => setBase((d) => addDaysUTC(d, -7));
  const goNextWeek = () => setBase((d) => addDaysUTC(d, 7));
  const goTodayWeek = () => setBase(getMonday(new Date()));

  /** Días de la semana (YYYY-MM-DD) en orden Lun→Dom */
  const orderedDays = useMemo(() => {
    if (!weekStart) return [];
    const start = new Date(`${weekStart}T00:00:00.000Z`);
    return Array.from({ length: 7 }).map((_, i) =>
      toYYYYMMDDUTC(addDaysUTC(start, i))
    );
  }, [weekStart]);

  /** Abrir modal crear */
  function openCreate(dayKey?: string) {
    setEditing(null);
    setTitle("");
    setDescription("");
    if (dayKey) {
      const d = new Date(`${dayKey}T09:00:00.000Z`);
      setDateLocal(toLocalInputValue(d.toISOString()));
    } else {
      setDateLocal(toLocalInputValue());
    }
    setFormOpen(true);
  }

  /** Abrir modal editar */
  function openEdit(s: SessionDTO) {
    setEditing(s);
    setTitle(s.title || "");
    setDescription(s.description ?? "");
    setDateLocal(toLocalInputValue(s.date));
    setFormOpen(true);
  }

  /** Guardar (crear o editar) — NO refresca toda la página */
  async function saveSession() {
    try {
      const iso = new Date(dateLocal).toISOString();

      if (!editing) {
        const createdRes = await createSession({
          title: title.trim(),
          description: (description ?? "") || null,
          date: iso,
        });
        const created = createdRes.data; // <— fijate el .data
        const k = created.date.slice(0, 10);
        setDays((prev) => ({
          ...prev,
          [k]: [...(prev[k] || []), created],
        }));
      } else {
        const updatedRes = await updateSession(editing.id, {
          title: title.trim() || undefined,
          description: description === "" ? null : (description ?? undefined),
          date: iso,
        });
        const updated = updatedRes.data; // <— fijate el .data
        const oldKey = editing.date.slice(0, 10);
        const newKey = updated.date.slice(0, 10);
        setDays((prev) => {
          const next = { ...prev };
          next[oldKey] = (next[oldKey] || []).filter((x) => x.id !== editing.id);
          next[newKey] = [...(next[newKey] || []), updated];
          return next;
        });
      }

      setFormOpen(false);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Error al guardar la sesión");
    }
  }

  /** Borrar (con confirmación) — actualiza sólo memoria */
  async function remove(id: string) {
    if (!confirm("¿Eliminar esta sesión?")) return;
    try {
      await deleteSession(id);
      setDays((prev) => {
        const next: typeof prev = {};
        for (const k of Object.keys(prev)) {
          next[k] = prev[k].filter((s) => s.id !== id);
        }
        return next;
      });
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Error al borrar la sesión");
    }
  }

  /** Filtrado por búsqueda (solo frontend) */
  function matches(s: SessionDTO) {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (s.title?.toLowerCase().includes(q) ?? false) ||
      (s.description?.toLowerCase().includes(q) ?? false)
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Encabezado (titulo opcional) + barra de semana SIEMPRE visible */}
      <header className="space-y-2">
        {!hideHeader && (
          <div className="flex items-center justify-between">
            <h1 className="text-lg md:text-xl font-semibold">
              Plan semanal — Editor en tabla
            </h1>
          </div>
        )}

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="text-xs md:text-sm text-gray-500">
            Semana {weekStart || "—"} → {weekEnd || "—"} (Lun→Dom)
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Búsqueda */}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar sesiones… (título o descripción)"
              className="px-3 py-2 rounded-xl border min-w-[240px]"
            />
            <div className="w-px h-6 bg-gray-200 mx-1" />
            <button onClick={goPrevWeek} className="px-3 py-2 rounded-xl border hover:bg-gray-50 text-sm">
              ◀ Semana anterior
            </button>
            <button onClick={goTodayWeek} className="px-3 py-2 rounded-xl border hover:bg-gray-50 text-sm">
              Hoy
            </button>
            <button onClick={goNextWeek} className="px-3 py-2 rounded-xl border hover:bg-gray-50 text-sm">
              Semana siguiente ▶
            </button>
            <button onClick={() => openCreate()} className="ml-1 px-4 py-2 rounded-xl bg-black text-white hover:opacity-90 text-sm">
              + Nueva sesión
            </button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="text-gray-500">Cargando semana…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 md:gap-4">
          {orderedDays.map((key) => {
            const listAll = days[key] || [];
            const list = listAll.filter(matches);
            const isToday = new Date().toISOString().slice(0, 10) === key;

            return (
              <div
                key={key}
                className={`rounded-2xl border p-3 bg-white ${isToday ? "ring-2 ring-emerald-400" : ""}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-sm">
                    {new Date(`${key}T00:00:00Z`).toLocaleDateString(
                      undefined,
                      { weekday: "short", day: "2-digit", month: "short" }
                    )}
                  </div>
                  <span className="text-[11px] text-gray-400">{key}</span>
                </div>

                <div className="mb-2">
                  <button
                    onClick={() => openCreate(key)}
                    className="w-full text-xs px-2 py-1 rounded-lg border hover:bg-gray-50"
                  >
                    + Agregar en este día
                  </button>
                </div>

                {list.length === 0 ? (
                  <div className="text-sm text-gray-400">
                    {query ? "Sin coincidencias" : "Sin sesiones"}
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {list.map((s) => (
                      <li key={s.id} className="rounded-xl border p-2 hover:bg-gray-50">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-medium">
                              {highlight(s.title, query)}
                            </div>
                            {s.description ? (
                              <div className="text-sm text-gray-600">
                                {typeof s.description === "string"
                                  ? highlight(s.description, query)
                                  : s.description}
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

      {/* Modal de creación/edición — Guarda SOLO con botón */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5 space-y-4">
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
                  rows={3}
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
