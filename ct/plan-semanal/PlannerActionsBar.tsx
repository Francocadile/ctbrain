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

const DEFAULT_LABELS: RowLabels = {
  "PRE ENTREN0": "PRE ENTREN0",
  "FÍSICO": "FÍSICO",
  "TÉCNICO–TÁCTICO": "TÉCNICO–TÁCTICO",
  "COMPENSATORIO": "COMPENSATORIO",
};

type Props = { onAfterChange?: () => void };

export default function PlannerActionsBar({ onAfterChange }: Props) {
  const [loading, setLoading] = useState(false);

  // lo que el usuario escribe (sin defaults)
  const [labels, setLabels] = useState<RowLabels>({});
  const [placesText, setPlacesText] = useState("");
  const [placesCount, setPlacesCount] = useState(0);

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
    </div>
  );
}
