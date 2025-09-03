// src/app/ct/plan-semanal/PlannerActionsBar.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchRowLabels,
  saveRowLabels,
  resetRowLabels,
  type RowLabels,
  fetchPlaces,
  savePlaces,
  clearPlaces,
} from "@/lib/planner-prefs";
import HelpTip from "@/components/HelpTip";

type Props = { onAfterChange?: () => void };

// Etiquetas por defecto que entiende el Editor
const DEFAULT_LABELS: RowLabels = {
  "PRE ENTREN0": "PRE ENTREN0",
  "FÍSICO": "FÍSICO",
  "TÉCNICO–TÁCTICO": "TÉCNICO–TÁCTICO",
  "COMPENSATORIO": "COMPENSATORIO",
  "LUGAR": "LUGAR",
  "HORA": "HORA",
  "VIDEO": "VIDEO",
  "NOMBRE SESIÓN": "NOMBRE SESIÓN",
};

export default function PlannerActionsBar({ onAfterChange }: Props) {
  const [loading, setLoading] = useState(false);

  // ---- Nombres de filas
  const [labels, setLabels] = useState<RowLabels>(DEFAULT_LABELS);
  const computed = useMemo<RowLabels>(() => ({ ...DEFAULT_LABELS, ...labels }), [labels]);

  useEffect(() => {
    (async () => {
      try {
        const server = await fetchRowLabels();
        setLabels((prev) => ({ ...prev, ...server }));
      } catch {
        // sigue con defaults
      }
    })();
  }, []);

  async function handleSaveLabels() {
    setLoading(true);
    try {
      await saveRowLabels(labels);
      window.dispatchEvent(new Event("planner-row-labels-updated"));
      onAfterChange?.();
      alert("Nombres guardados.");
    } catch (e: any) {
      alert(e?.message || "No se pudo guardar");
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
      window.dispatchEvent(new Event("planner-row-labels-updated"));
      onAfterChange?.();
      alert("Restaurado.");
    } catch (e: any) {
      alert(e?.message || "No se pudo resetear");
    } finally {
      setLoading(false);
    }
  }

  // ---- Lugares (sugerencias)
  const [placesText, setPlacesText] = useState("");
  const [placesCount, setPlacesCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchPlaces();
        setPlacesText(list.join("\n"));
        setPlacesCount(list.length);
      } catch {
        setPlacesText("");
        setPlacesCount(0);
      }
    })();
  }, []);

  async function handleSavePlaces() {
    const list = Array.from(
      new Set(
        placesText
          .split("\n")
          .map((s) => (s || "").trim())
          .filter(Boolean)
      )
    );
    setLoading(true);
    try {
      await savePlaces(list);
      setPlacesCount(list.length);
      window.dispatchEvent(new Event("planner-places-updated"));
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
      window.dispatchEvent(new Event("planner-places-updated"));
      onAfterChange?.();
      alert("Lista vaciada.");
    } catch (e: any) {
      alert(e?.message || "No se pudo vaciar la lista");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* --- Nombres de filas --- */}
      <section className="rounded-xl border p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Nombres de filas (tu preferencia)</h3>
            <HelpTip text="Cambia cómo querés que se vean las filas en el Editor. Afecta sólo a tu usuario." />
          </div>
          <div className="text-[11px] text-gray-500">Se aplican en el Editor.</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {([
            ["PRE ENTREN0", "Activación"],
            ["FÍSICO", "Entrada en calor"],
            ["TÉCNICO–TÁCTICO", "Principal"],
            ["COMPENSATORIO", "Post entreno"],
          ] as const).map(([key, placeholder]) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-[11px] text-gray-600">Actual: {key}</label>
              <input
                className="h-9 rounded-md border px-2 text-sm"
                value={computed[key]}
                onChange={(e) => setLabels((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
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

      {/* --- Lugares --- */}
      <section className="rounded-xl border p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Lugares</h3>
            <HelpTip text="Escribí uno por línea. Luego, en el Editor, te aparecen como sugerencias al escribir en 'Lugar'." />
          </div>
          <div className="text-[11px] text-gray-500">{placesCount} guardados</div>
        </div>

        <textarea
          className="min-h-[120px] w-full rounded-md border p-2 text-sm"
          placeholder={`Ejemplos (uno por línea):
Cancha 1
Complejo Deportivo
Gimnasio`}
          value={placesText}
          onChange={(e) => setPlacesText(e.target.value)}
        />

        <div className="mt-2 flex gap-2">
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
    </div>
  );
}
