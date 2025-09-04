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
  "LUGAR": "LUGAR",
  "HORA": "HORA",
  "VIDEO": "VIDEO",
  "NOMBRE SESIÓN": "NOMBRE SESIÓN",
};

type Props = { onAfterChange?: () => void };

export default function PlannerActionsBar({ onAfterChange }: Props) {
  const [loading, setLoading] = useState(false);

  // Nombres de filas
  const [labels, setLabels] = useState<RowLabels>({});
  const computed = useMemo<RowLabels>(() => ({ ...DEFAULT_LABELS, ...labels }), [labels]);

  // Lugares (textarea)
  const [placesText, setPlacesText] = useState("");
  const [placesCount, setPlacesCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const server = await fetchRowLabels();
        setLabels(server);
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
      await saveRowLabels({
        "PRE ENTREN0": computed["PRE ENTREN0"],
        "FÍSICO": computed["FÍSICO"],
        "TÉCNICO–TÁCTICO": computed["TÉCNICO–TÁCTICO"],
        "COMPENSATORIO": computed["COMPENSATORIO"],
      });
      window.dispatchEvent(new Event("planner-row-labels-updated"));
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
          <HelpTip text="Se guardan en tu usuario y se aplican en el Editor." />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-gray-600">Actual: PRE ENTREN0</label>
            <input
              className="h-9 rounded-md border px-2 text-sm"
              value={computed["PRE ENTREN0"]}
              onChange={(e) => setLabels((prev) => ({ ...prev, ["PRE ENTREN0"]: e.target.value }))}
              placeholder="Ej: Activación"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-gray-600">Actual: FÍSICO</label>
            <input
              className="h-9 rounded-md border px-2 text-sm"
              value={computed["FÍSICO"]}
              onChange={(e) => setLabels((prev) => ({ ...prev, ["FÍSICO"]: e.target.value }))}
              placeholder="Ej: Entrada en calor"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-gray-600">Actual: TÉCNICO–TÁCTICO</label>
            <input
              className="h-9 rounded-md border px-2 text-sm"
              value={computed["TÉCNICO–TÁCTICO"]}
              onChange={(e) =>
                setLabels((prev) => ({ ...prev, ["TÉCNICO–TÁCTICO"]: e.target.value }))
              }
              placeholder="Ej: Principal"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-gray-600">Actual: COMPENSATORIO</label>
            <input
              className="h-9 rounded-md border px-2 text-sm"
              value={computed["COMPENSATORIO"]}
              onChange={(e) =>
                setLabels((prev) => ({ ...prev, ["COMPENSATORIO"]: e.target.value }))
              }
              placeholder="Ej: Post entreno"
            />
          </div>
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

        <div className="space-y-2">
          <div className="text-[11px] text-gray-500">Ejemplos:</div>
          <div className="rounded-md border p-2 text-[12px] text-gray-600 bg-gray-50">
            Cancha 1<br />
            Complejo Deportivo<br />
            Gimnasio
          </div>

        <textarea
          className="mt-2 w-full min-h-[120px] rounded-md border p-2 text-sm"
          placeholder="Escribí los lugares (uno por línea)…"
          value={placesText}
          onChange={(e) => setPlacesText(e.target.value)}
        />
        </div>

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
