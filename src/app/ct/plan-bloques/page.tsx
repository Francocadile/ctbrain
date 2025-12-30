"use client";

import { useEffect, useMemo, useState } from "react";

// Helpers fecha (clonados del patrón server-safe)
function toYMDUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMondayUTC(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addDaysUTC(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function humanDayUTC(ymd: string) {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });
}

// Tipos DTO simples
interface BlockCategoryDTO {
  id: string;
  teamId: string;
  key: string;
  label: string;
  color: string | null;
  order: number;
  isActive: boolean;
}

interface BlockPlanBlockDTO {
  id: string;
  dayId: string;
  categoryId: string;
  order: number;
  title: string | null;
  notes: string | null;
  intensity: string | null;
  category?: BlockCategoryDTO;
}

interface BlockPlanDayDTO {
  id: string;
  weekId: string;
  date: string; // ISO
  blocks: BlockPlanBlockDTO[];
}

interface BlockPlanWeekDTO {
  id: string;
  teamId: string;
  weekStart: string; // ISO
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  days: BlockPlanDayDTO[];
}

interface WeekResponse {
  week: BlockPlanWeekDTO | null;
  categories: BlockCategoryDTO[];
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

function getCsrfHeaders() {
  return { "X-CT-CSRF": "1" };
}

export default function BlockPlannerPage() {
  const [baseMonday, setBaseMonday] = useState<Date>(() => getMondayUTC(new Date()));
  const [loading, setLoading] = useState(false);
  const [week, setWeek] = useState<BlockPlanWeekDTO | null>(null);
  const [categories, setCategories] = useState<BlockCategoryDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingBlockId, setSavingBlockId] = useState<string | null>(null);
  const [creatingForDayId, setCreatingForDayId] = useState<string | null>(null);

  const weekYMD = useMemo(() => toYMDUTC(baseMonday), [baseMonday]);

  async function loadWeekAndCategories(currentMonday: Date) {
    setLoading(true);
    setError(null);
    try {
      const ymd = toYMDUTC(currentMonday);
      const data = await fetchJson<WeekResponse>(`/api/ct/block-planner/week?start=${ymd}`);
      setWeek(data.week);
      setCategories(data.categories || []);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "No se pudo cargar el plan por bloques");
      setWeek(null);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWeekAndCategories(baseMonday);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseMonday]);

  const orderedDays = useMemo(() => {
    if (!week) return [] as BlockPlanDayDTO[];
    return [...(week.days || [])].sort((a, b) => a.date.localeCompare(b.date));
  }, [week]);

  const activeCategories = useMemo(
    () => categories.filter((c) => c.isActive).sort((a, b) => a.order - b.order),
    [categories],
  );

  async function ensureWeekExists() {
    setLoading(true);
    setError(null);
    try {
      const ymd = weekYMD;
      await fetchJson<{ week: BlockPlanWeekDTO }>("/api/ct/block-planner/week", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getCsrfHeaders(),
        },
        body: JSON.stringify({ start: ymd }),
      });
      await loadWeekAndCategories(baseMonday);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "No se pudo crear la semana");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateBlock(day: BlockPlanDayDTO) {
    if (!activeCategories.length) {
      alert("No hay categorías activas. Creá al menos una primero.");
      return;
    }
    const defaultCategory = activeCategories[0];
    setCreatingForDayId(day.id);
    try {
      const res = await fetchJson<{ data: BlockPlanBlockDTO }>(
        "/api/ct/block-planner/blocks",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getCsrfHeaders(),
          },
          body: JSON.stringify({
            dayId: day.id,
            categoryId: defaultCategory.id,
          }),
        },
      );

      // Recargar por simplicidad (sin estado optimista)
      await loadWeekAndCategories(baseMonday);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "No se pudo crear el bloque");
    } finally {
      setCreatingForDayId(null);
    }
  }

  async function handleUpdateBlock(block: BlockPlanBlockDTO, patch: Partial<BlockPlanBlockDTO>) {
    setSavingBlockId(block.id);
    try {
      const payload: any = {};
      if (patch.categoryId !== undefined) payload.categoryId = patch.categoryId;
      if (patch.title !== undefined) payload.title = patch.title;
      if (patch.notes !== undefined) payload.notes = patch.notes;
      if (patch.intensity !== undefined) payload.intensity = patch.intensity;
      if (patch.order !== undefined) payload.order = patch.order;

      await fetchJson<{ data: BlockPlanBlockDTO }>(
        `/api/ct/block-planner/blocks/${block.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getCsrfHeaders(),
          },
          body: JSON.stringify(payload),
        },
      );

      await loadWeekAndCategories(baseMonday);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "No se pudo actualizar el bloque");
    } finally {
      setSavingBlockId(null);
    }
  }

  const hasWeek = !!week;

  return (
    <div className="p-4 space-y-4">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-bold">Planificador por bloques</h1>
          <p className="text-xs md:text-sm text-gray-500">
            Semana base: {weekYMD} (lunes UTC)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs"
            onClick={() => setBaseMonday((d) => getMondayUTC(addDaysUTC(d, -7)))}
          >
            844 Semana anterior
          </button>
          <button
            type="button"
            className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs"
            onClick={() => setBaseMonday(getMondayUTC(new Date()))}
          >
            Hoy
          </button>
          <button
            type="button"
            className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs"
            onClick={() => setBaseMonday((d) => getMondayUTC(addDaysUTC(d, 7)))}
          >
            Semana siguiente 846
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && <div className="text-sm text-gray-500">Cargando...</div>}

      {!loading && !hasWeek && (
        <div className="rounded-lg border bg-white p-4 flex flex-col gap-2 max-w-md">
          <p className="text-sm text-gray-700">
            Todavía no hay un plan de bloques para esta semana.
          </p>
          <button
            type="button"
            className="px-3 py-1.5 rounded-md bg-black text-white text-sm hover:opacity-90 self-start"
            onClick={ensureWeekExists}
          >
            Crear esta semana
          </button>
        </div>
      )}

      {hasWeek && (
        <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-7">
          {orderedDays.map((day) => {
            const ymd = toYMDUTC(new Date(day.date));
            const blocks = [...(day.blocks || [])].sort((a, b) => a.order - b.order);
            return (
              <div key={day.id} className="rounded-lg border bg-white p-3 flex flex-col gap-2">
                <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  {humanDayUTC(ymd)}
                </div>

                <div className="flex flex-col gap-2">
                  {blocks.map((block) => {
                    const isSaving = savingBlockId === block.id;
                    return (
                      <div
                        key={block.id}
                        className="rounded-md border border-gray-200 bg-gray-50 p-2 flex flex-col gap-1"
                      >
                        <select
                          className="h-7 w-full rounded-md border px-1.5 text-xs bg-white"
                          value={block.categoryId}
                          onChange={(e) =>
                            handleUpdateBlock(block, { categoryId: e.target.value })
                          }
                          disabled={isSaving}
                        >
                          {activeCategories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.label}
                            </option>
                          ))}
                        </select>

                        <input
                          className="h-7 w-full rounded-md border px-1.5 text-xs bg-white"
                          placeholder="Título del bloque"
                          defaultValue={block.title ?? ""}
                          onBlur={(e) =>
                            handleUpdateBlock(block, { title: e.target.value })
                          }
                          disabled={isSaving}
                        />

                        <textarea
                          className="min-h-[60px] w-full rounded-md border px-1.5 py-1 text-xs bg-white"
                          placeholder="Notas..."
                          defaultValue={block.notes ?? ""}
                          onBlur={(e) =>
                            handleUpdateBlock(block, { notes: e.target.value })
                          }
                          disabled={isSaving}
                        />

                        <input
                          className="h-7 w-full rounded-md border px-1.5 text-xs bg-white"
                          placeholder="Intensidad (ej: MD-2, Alta, Media)"
                          defaultValue={block.intensity ?? ""}
                          onBlur={(e) =>
                            handleUpdateBlock(block, { intensity: e.target.value })
                          }
                          disabled={isSaving}
                        />
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="mt-1 inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                  onClick={() => handleCreateBlock(day)}
                  disabled={creatingForDayId === day.id}
                >
                  {creatingForDayId === day.id ? "Creando..." : "+ Bloque"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
