"use client";

import { useEffect, useMemo, useState } from "react";
import { toYYYYMMDDUTC, getMonday } from "@/lib/api/sessions";
import {
  fetchRowLabels,
  saveRowLabels,
  resetRowLabels,
  type RowLabels,
} from "@/lib/planner-prefs";

type Props = { onAfterChange?: () => void };

// valores por defecto de filas visibles
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
  const [weekRef, setWeekRef] = useState<string>(() => toYYYYMMDDUTC(getMonday(new Date())));
  const [loading, setLoading] = useState(false);

  // Etiquetas por usuario (servidor)
  const [labels, setLabels] = useState<RowLabels>(DEFAULT_LABELS);
  const computed = useMemo<RowLabels>(() => ({ ...DEFAULT_LABELS, ...labels }), [labels]);

  // cargar desde servidor
  useEffect(() => {
    (async () => {
      const server = await fetchRowLabels();
      setLabels((prev) => ({ ...prev, ...server }));
    })();
  }, []);

  // Exportar/Importar/Duplicar los dejás como ya los tenías si corresponde…
  // Acá nos enfocamos en la sección de “Nombres de filas”

  async function handleSaveLabels() {
    setLoading(true);
    try {
      await saveRowLabels(labels);
      // Notificar al editor para que se refresque las etiquetas
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
      alert(e?.message || "No se pudo restaurar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* --- Sección simple: Nombres de filas --- */}
      <section className="rounded-xl border p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Nombres de filas (tu preferencia)</h3>
          <div className="text-[11px] text-gray-500">
            Se guardan en tu usuario y se aplican en el Editor.
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(DEFAULT_LABELS).map(([key, _]) => {
            // mostramos sólo las filas que el editor usa
            const isEditable =
              key === "PRE ENTREN0" ||
              key === "FÍSICO" ||
              key === "TÉCNICO–TÁCTICO" ||
              key === "COMPENSATORIO";
            if (!isEditable) return null;

            return (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-[11px] text-gray-600">{key}</label>
                <input
                  className="h-9 rounded-md border px-2 text-sm"
                  value={computed[key]}
                  onChange={(e) =>
                    setLabels((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  placeholder={key}
                />
              </div>
            );
          })}
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

      {/* Podés mantener acá tus otras herramientas (exportar, duplicar, CSV, etc.) */}
    </div>
  );
}
