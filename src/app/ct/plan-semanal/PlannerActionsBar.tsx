"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchRowLabels,
  saveRowLabels,
  resetRowLabels,
  fetchPlaces,
  savePlacesFromTextarea,
  clearPlaces,
  type RowLabels,
} from "@/lib/planner-prefs";
import HelpTip from "@/components/HelpTip";
import { DEFAULT_DAY_TYPES, type DayTypeDef, type DayTypeId } from "@/lib/planner-daytype";
import { getMonday, toYYYYMMDDUTC } from "@/lib/api/sessions";
import { CSRF_HEADER_NAME, getClientCsrfToken } from "@/lib/security/client-csrf";

const DEFAULT_LABELS: RowLabels = {
  "PRE ENTREN0": "PRE ENTREN0",
  "FÍSICO": "FÍSICO",
  "TÉCNICO–TÁCTICO": "TÉCNICO–TÁCTICO",
  "COMPENSATORIO": "COMPENSATORIO",
};

type Props = { onAfterChange?: () => void; dayTypeUsage?: Record<string, boolean> };

export default function PlannerActionsBar({ onAfterChange, dayTypeUsage = {} }: Props) {
  const [loading, setLoading] = useState(false);

  // lo que el usuario escribe (sin defaults)
  const [labels, setLabels] = useState<RowLabels>({});
  const [placesText, setPlacesText] = useState("");
  const [placesCount, setPlacesCount] = useState(0);

  // DayTypes
  const [dayTypes, setDayTypes] = useState<DayTypeDef[]>([]);
  const [savingDayTypes, setSavingDayTypes] = useState(false);

  // para mostrar “Actual: …”
  const [current, setCurrent] = useState<RowLabels>({});

  useEffect(() => {
    (async () => {
      try {
        const server = await fetchRowLabels();
        setCurrent(server || {});
      } catch {}
      try {
        const list = await fetchPlaces();
        setPlacesText((list || []).join("\n"));
        setPlacesCount(list.length);
      } catch {}
      try {
        const res = await fetch("/api/ct/planner/day-types", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          const items = Array.isArray(json.dayTypes) ? (json.dayTypes as any[]) : [];
          const mapped: DayTypeDef[] = items.map((t: any) => ({
            id: String(t.key || ""),
            label: String(t.label || ""),
            color: String(t.color || "bg-gray-50"),
          }));
          setDayTypes(mapped);
        } else {
          setDayTypes(DEFAULT_DAY_TYPES);
        }
      } catch {
        setDayTypes(DEFAULT_DAY_TYPES);
      }
    })();
  }, []);

  async function handleSaveLabels() {
    setLoading(true);
    try {
      // solo enviamos las claves que el usuario escribió (no vacíos)
      const payload: RowLabels = {};
      for (const k of Object.keys(DEFAULT_LABELS)) {
        const v = (labels[k] || "").trim();
        if (v) payload[k] = v;
      }
      await saveRowLabels(payload);
      window.dispatchEvent(new Event("planner-row-labels-updated"));
      setCurrent({ ...current, ...payload });
      setLabels({});
      onAfterChange?.();
      alert("Nombres guardados.");
    } catch (e: any) {
      alert(e?.message || "No se pudieron guardar los nombres");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetLabels() {
    const ok = confirm("¿Restaurar nombres originales?");
    if (!ok) return;
    setLoading(true);
    try {
      await resetRowLabels();
      setLabels({});
      setCurrent({});
      window.dispatchEvent(new Event("planner-row-labels-updated"));
      onAfterChange?.();
      alert("Restaurado.");
    } catch (e: any) {
      alert(e?.message || "No se pudo resetear");
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePlaces() {
    setLoading(true);
    try {
      const saved = await savePlacesFromTextarea(placesText);
      setPlacesText(saved.join("\n"));
      setPlacesCount(saved.length);
      onAfterChange?.();
      alert("Lugares guardados.");
    } catch (e: any) {
      alert(e?.message || "No se pudo guardar los lugares");
    } finally {
      setLoading(false);
    }
  }

  async function handleClearPlaces() {
    const ok = confirm("¿Vaciar la lista de lugares?");
    if (!ok) return;
    setLoading(true);
    try {
      await clearPlaces();
      setPlacesText("");
      setPlacesCount(0);
      onAfterChange?.();
      alert("Lista vaciada.");
    } catch (e: any) {
      alert(e?.message || "No se pudo vaciar");
    } finally {
      setLoading(false);
    }
  }

  function handleDayTypeLabelChange(id: DayTypeId, label: string) {
    setDayTypes((prev) => prev.map((t) => (t.id === id ? { ...t, label } : t)));
  }

  function handleDayTypeColorChange(id: DayTypeId, color: string) {
    setDayTypes((prev) => prev.map((t) => (t.id === id ? { ...t, color } : t)));
  }

  function handleMoveDayType(id: DayTypeId, dir: -1 | 1) {
    setDayTypes((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx === -1) return prev;
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[idx];
      next[idx] = next[swapIdx];
      next[swapIdx] = tmp;
      return next;
    });
  }

  function handleAddDayType() {
    const base = "NUEVO_TIPO";
    let candidate = base;
    let i = 1;
    const ids = new Set(dayTypes.map((t) => t.id));
    while (ids.has(candidate)) {
      candidate = `${base}_${i++}`;
    }
    setDayTypes((prev) => [
      ...prev,
      { id: candidate, label: "Nuevo tipo", color: "bg-sky-50" },
    ]);
  }

  function handleDeleteDayType(id: DayTypeId) {
    if (dayTypeUsage[id]) {
      alert("Este tipo está en uso en la semana actual. Primero quitá sus asignaciones.");
      return;
    }
    setDayTypes((prev) => prev.filter((t) => t.id !== id));
  }

  function handleRestoreDayTypes() {
    const ok = confirm("¿Restaurar tipos de trabajo por defecto?");
    if (!ok) return;
    setDayTypes(DEFAULT_DAY_TYPES);
  }

  async function handleSaveDayTypes() {
    setSavingDayTypes(true);
    try {
      const seen = new Set<string>();
      const cleaned: DayTypeDef[] = [];
      for (const t of dayTypes) {
        const key = (t.id || "").trim().toUpperCase().replace(/\s+/g, "_");
        const label = (t.label || "").trim();
        const color = (t.color || "bg-gray-50").trim();
        if (!key || !label || !color) continue;
        if (seen.has(key)) {
          alert("Hay claves de tipo de trabajo duplicadas. Revisá la lista.");
          return;
        }
        seen.add(key);
        cleaned.push({ id: key, label, color });
      }

      const payload = cleaned.map((t, idx) => ({
        key: t.id,
        label: t.label,
        color: t.color,
        order: idx,
        isDefault: DEFAULT_DAY_TYPES.some((d) => d.id === t.id),
      }));

      const token = getClientCsrfToken();
      if (!token) {
        alert("CSRF missing: recargá la página");
        return;
      }

      const res = await fetch("/api/ct/planner/day-types", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          [CSRF_HEADER_NAME]: token,
        },
        body: JSON.stringify({ dayTypes: payload }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(
          `No se pudieron guardar los tipos de trabajo (HTTP ${res.status}) ${txt}`,
        );
      }
      alert("Tipos de trabajo guardados.");
      onAfterChange?.();
    } catch (e: any) {
      alert(e?.message || "Error al guardar los tipos de trabajo");
    } finally {
      setSavingDayTypes(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* NOMBRES DE FILAS */}
      <section className="rounded-xl border p-3">
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-sm font-semibold">Nombres de filas (tu preferencia)</h3>
          <HelpTip text="Escribí solo si querés cambiar el nombre visible. Se guarda en tu usuario." />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {Object.keys(DEFAULT_LABELS).map((key) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-[11px] text-gray-600">Actual: {current[key] || key}</label>
              <input
                className="h-9 rounded-md border px-2 text-sm"
                value={labels[key] || ""}
                onChange={(e) => setLabels((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={
                  key === "PRE ENTREN0"
                    ? "Ej: Activación"
                    : key === "FÍSICO"
                    ? "Ej: Entrada en calor"
                    : key === "TÉCNICO–TÁCTICO"
                    ? "Ej: Principal"
                    : "Ej: Post entreno"
                }
              />
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={handleSaveLabels}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-black text-white text-xs hover:opacity-90"
          >
            Guardar
          </button>
          <button
            onClick={handleResetLabels}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg border text-xs hover:bg-gray-50"
          >
            Restaurar originales
          </button>
        </div>
      </section>

      {/* LUGARES */}
      <section className="rounded-xl border p-3">
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-sm font-semibold">Lugares</h3>
          <HelpTip text="Un lugar por línea. Se usan como sugerencias en el campo 'Lugar' del Editor." />
          <span className="ml-auto text-[11px] text-gray-500">{placesCount} guardados</span>
        </div>

        <div className="text-[11px] text-gray-500 mb-1">Ejemplos:</div>
        <div className="rounded-md border p-2 text-[12px] text-gray-600 bg-gray-50 mb-2">
          Cancha 1<br />
          Complejo Deportivo<br />
          Gimnasio
        </div>

        <textarea
          className="w-full min-h-[120px] rounded-md border p-2 text-sm"
          placeholder="Escribí los lugares (uno por línea)…"
          value={placesText}
          onChange={(e) => setPlacesText(e.target.value)}
        />

        <div className="mt-3 flex gap-2">
          <button
            onClick={handleSavePlaces}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-black text-white text-xs hover:opacity-90"
          >
            Guardar lugares
          </button>
          <button
            onClick={handleClearPlaces}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg border text-xs hover:bg-gray-50"
          >
            Vaciar lista
          </button>
        </div>
      </section>

      {/* TIPOS DE TRABAJO */}
      <section className="rounded-xl border p-3">
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-sm font-semibold">Tipos de trabajo</h3>
          <HelpTip text="Configura los tipos de día para colorear columnas en el plan semanal." />
        </div>

        <div className="space-y-1 max-h-72 overflow-auto mb-2">
          {dayTypes.map((t, idx) => (
            <div key={t.id} className="flex items-center gap-2 text-[11px]">
              <div className={`w-4 h-4 rounded-full border ${t.color}`} />
              <input
                className="flex-1 h-7 rounded border px-1 text-[11px]"
                value={t.label}
                onChange={(e) => handleDayTypeLabelChange(t.id, e.target.value)}
              />
              <select
                className="h-7 rounded border px-1 text-[11px]"
                value={t.color}
                onChange={(e) => handleDayTypeColorChange(t.id, e.target.value)}
              >
                {["bg-sky-50","bg-red-50","bg-amber-50","bg-emerald-50","bg-violet-50","bg-blue-50","bg-yellow-50","bg-gray-50"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="h-6 w-6 flex items-center justify-center rounded border hover:bg-gray-50"
                  onClick={() => handleMoveDayType(t.id, -1)}
                  disabled={idx === 0}
                  title="Subir"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="h-6 w-6 flex items-center justify-center rounded border hover:bg-gray-50"
                  onClick={() => handleMoveDayType(t.id, 1)}
                  disabled={idx === dayTypes.length - 1}
                  title="Bajar"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="h-6 w-6 flex items-center justify-center rounded border hover:bg-gray-50"
                  onClick={() => handleDeleteDayType(t.id)}
                  title={dayTypeUsage[t.id] ? "En uso" : "Eliminar"}
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
          <button
            type="button"
            onClick={handleAddDayType}
            className="px-3 py-1.5 rounded-lg border text-xs hover:bg-gray-50"
          >
            Agregar tipo
          </button>
          <button
            type="button"
            onClick={handleRestoreDayTypes}
            className="px-3 py-1.5 rounded-lg border text-xs hover:bg-gray-50"
          >
            Restaurar defaults
          </button>
          <button
            type="button"
            onClick={handleSaveDayTypes}
            disabled={savingDayTypes}
            className="px-3 py-1.5 rounded-lg bg-black text-white text-xs hover:opacity-90"
          >
            {savingDayTypes ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </section>
    </div>
  );
}
