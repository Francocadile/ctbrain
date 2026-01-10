"use client";

import { useEffect, useRef, useState } from "react";
import {
  saveRowLabels,
  resetRowLabels,
  fetchPlaces,
  savePlacesFromTextarea,
  clearPlaces,
  type RowLabels,
} from "@/lib/planner-prefs";
import HelpTip from "@/components/HelpTip";
import { DEFAULT_DAY_TYPES, normalizeDayTypeColor, type DayTypeDef, type DayTypeId } from "@/lib/planner-daytype";
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
  const [contentRowIds, setContentRowIds] = useState<string[]>([]);
  const [draftRowLabels, setDraftRowLabels] = useState<RowLabels>({});
  const contentRowInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/planner/labels", { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          const server = (j.rowLabels || {}) as RowLabels;
          const ids = Array.isArray(j.contentRowIds) && j.contentRowIds.length
            ? (j.contentRowIds as string[])
            : Object.keys(DEFAULT_LABELS);
          setCurrent(server || {});
          setContentRowIds(ids);
        }
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
            color: normalizeDayTypeColor(String(t.color || "")),
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

  function normalizeLabelMapForIds(ids: string[], labels: RowLabels): RowLabels {
    const out: RowLabels = {};
    for (const id of ids) {
      const raw = (labels[id] ?? "").trim();
      if (!raw) continue;
      if (raw === id) continue; // no persistir "default"
      out[id] = raw;
    }
    // por ahora no preservamos labels para ids que ya no están
    return out;
  }

  function mergePreservingNonContentLabels(nextIds: string[], mergedLabels: RowLabels): RowLabels {
    const next: RowLabels = {};
    const contentSet = new Set(contentRowIds);

    for (const key of Object.keys(current)) {
      if (!contentSet.has(key)) {
        const value = current[key];
        if (typeof value === "string" && value.trim()) {
          next[key] = value;
        }
      }
    }

    const normalized = normalizeLabelMapForIds(nextIds, mergedLabels);
    return { ...next, ...normalized };
  }

  function isBaseRowId(id: string): boolean {
    return Object.prototype.hasOwnProperty.call(DEFAULT_LABELS, id);
  }

  async function saveOneRowLabel(rowId: string) {
    const raw = (draftRowLabels[rowId] ?? current[rowId] ?? rowId).trim();

    const merged: RowLabels = { ...current };
    if (!raw || raw === rowId) delete merged[rowId];
    else merged[rowId] = raw;

    const nextLabels = mergePreservingNonContentLabels(contentRowIds, merged);
    const ok = await handleSaveContentRows(nextLabels, contentRowIds);
    if (!ok) return;

    setDraftRowLabels((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  }

  async function moveRow(rowId: string, dir: -1 | 1) {
    const idx = contentRowIds.indexOf(rowId);
    if (idx === -1) return;
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= contentRowIds.length) return;

    const nextIds = [...contentRowIds];
    const tmp = nextIds[idx];
    nextIds[idx] = nextIds[swapIdx];
    nextIds[swapIdx] = tmp;

    const mergedLabels: RowLabels = { ...current, ...draftRowLabels };
    const nextLabels = mergePreservingNonContentLabels(nextIds, mergedLabels);
    await handleSaveContentRows(nextLabels, nextIds);
  }

  async function deleteRow(rowId: string) {
    if (isBaseRowId(rowId)) return;
    const ok = confirm("¿Eliminar esta fila? No borra datos guardados, solo la oculta del editor.");
    if (!ok) return;

    const nextIds = contentRowIds.filter((x) => x !== rowId);
    const mergedLabels: RowLabels = { ...current };
    delete mergedLabels[rowId];
    const nextLabels = mergePreservingNonContentLabels(nextIds, mergedLabels);
    await handleSaveContentRows(nextLabels, nextIds);

    setDraftRowLabels((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  }

  async function handleSaveContentRows(nextLabels: RowLabels, nextIds: string[]): Promise<boolean> {
    setLoading(true);
    try {
      const token = getClientCsrfToken();
      if (!token) throw new Error("CSRF missing: recargá la página");

      const res = await fetch("/api/planner/labels", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          [CSRF_HEADER_NAME]: token,
        },
        body: JSON.stringify({ rowLabels: nextLabels, contentRowIds: nextIds }),
      });
      if (!res.ok) throw new Error("No se pudieron guardar las filas de contenido");

      setCurrent(nextLabels);
      setContentRowIds(nextIds);
      window.dispatchEvent(new Event("planner-row-labels-updated"));
      onAfterChange?.();
      return true;
    } catch (e: any) {
      alert(e?.message || "No se pudieron guardar las filas de contenido");
      return false;
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
      setContentRowIds(Object.keys(DEFAULT_LABELS));
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
      { id: candidate, label: "Nuevo tipo", color: "#f0f9ff" },
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
        const rawColor = (t.color || "").trim();
        if (!key || !label || !rawColor) continue;
        if (seen.has(key)) {
          alert("Hay claves de tipo de trabajo duplicadas. Revisá la lista.");
          return;
        }
        seen.add(key);
        const normalizedColor = normalizeDayTypeColor(rawColor, "");
        if (!/^#[0-9A-F]{6}$/.test(normalizedColor)) {
          alert("Hay colores inválidos. Usá un HEX tipo #AABBCC.");
          return;
        }
        cleaned.push({ id: key, label, color: normalizedColor });
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

      {/* FILAS DE CONTENIDO */}
      <section className="rounded-xl border p-3">
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-sm font-semibold">Filas de contenido</h3>
          <HelpTip text="Configura qué filas de contenido aparecen en el plan semanal y sus nombres visibles." />
        </div>

        <div className="space-y-2">
          {contentRowIds.map((id, index) => (
            <div key={id} className="flex items-center gap-2">
              <div className="w-40 text-xs text-gray-600 truncate" title={id}>
                {id}
              </div>
              <input
                className="flex-1 h-8 rounded-md border px-2 text-xs"
                placeholder="Nombre visible de la fila"
                value={draftRowLabels[id] ?? current[id] ?? id}
                ref={(el) => {
                  contentRowInputRefs.current[id] = el;
                }}
                onChange={(e) => {
                  const value = e.target.value;
                  setDraftRowLabels((prev) => ({ ...prev, [id]: value }));
                }}
                onBlur={() => {
                  saveOneRowLabel(id);
                }}
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="h-7 w-7 flex items-center justify-center rounded border text-[10px] hover:bg-gray-50"
                  disabled={index === 0}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => moveRow(id, -1)}
                  title="Subir"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="h-7 w-7 flex items-center justify-center rounded border text-[10px] hover:bg-gray-50"
                  disabled={index === contentRowIds.length - 1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => moveRow(id, 1)}
                  title="Bajar"
                >
                  ↓
                </button>
                {!isBaseRowId(id) && (
                  <button
                    type="button"
                    className="h-7 w-7 flex items-center justify-center rounded border text-[10px] hover:bg-gray-50"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => deleteRow(id)}
                    title="Eliminar fila personalizada"
                  >
                    🗑
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg border text-xs hover:bg-gray-50"
            disabled={loading}
            onClick={async () => {
              const id = `row-${Date.now()}`;
              const nextIds = [...contentRowIds, id];

              const merged: RowLabels = { ...current, [id]: "Nueva fila" };
              const nextLabels = mergePreservingNonContentLabels(nextIds, merged);

              await handleSaveContentRows(nextLabels, nextIds);
              setDraftRowLabels({});

              const input = contentRowInputRefs.current[id];
              if (input) {
                input.focus();
                input.select();
              }
            }}
          >
            + fila
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
              <div
                className="w-4 h-4 rounded-full border"
                style={{ backgroundColor: t.color || "#f9fafb" }}
              />
              <input
                className="flex-1 h-7 rounded border px-1 text-[11px]"
                value={t.label}
                onChange={(e) => handleDayTypeLabelChange(t.id, e.target.value)}
              />
              <input
                type="color"
                className="h-7 w-10 rounded border p-0"
                value={/^#?[0-9A-Fa-f]{6}$/.test(t.color || "") ? normalizeDayTypeColor(t.color) : "#ffffff"}
                onChange={(e) => handleDayTypeColorChange(t.id, e.target.value)}
              />
              <input
                className="h-7 w-20 rounded border px-1 text-[11px]"
                value={t.color}
                placeholder="#AABBCC"
                onChange={(e) => handleDayTypeColorChange(t.id, e.target.value)}
                onBlur={(e) => handleDayTypeColorChange(t.id, normalizeDayTypeColor(e.target.value))}
              />
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
