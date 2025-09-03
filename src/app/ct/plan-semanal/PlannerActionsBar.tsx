// src/app/ct/plan-semanal/PlannerActionsBar.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Herramientas del planner.
 * En esta versión nos enfocamos en RENOMBRAR las filas visibles del editor semanal.
 * - Cambios solo afectan a tu dispositivo (se guardan localmente).
 * - Podés volver a los nombres iniciales cuando quieras.
 */

type Props = {
  onAfterChange?: () => void;
};

// IDs fijos de las filas de contenido en el editor (no cambian en BD)
const CONTENT_ROW_IDS = [
  "PRE ENTREN0",
  "FÍSICO",
  "TÉCNICO–TÁCTICO",
  "COMPENSATORIO",
] as const;

const STORAGE_KEY = "planner.rowLabels.v1";
const UPDATED_EVENT = "planner-row-labels-updated";

type RowLabels = Record<string, string>;

function loadLabels(): RowLabels {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveLabelsSafe(labels: RowLabels) {
  // Guardamos SOLO lo que sea distinto al nombre original
  const compact: RowLabels = {};
  for (const id of CONTENT_ROW_IDS) {
    const v = (labels[id] ?? "").trim();
    if (v && v !== id) compact[id] = v;
  }
  if (Object.keys(compact).length === 0) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
  }
  window.dispatchEvent(new CustomEvent(UPDATED_EVENT));
}

export default function PlannerActionsBar({ onAfterChange }: Props) {
  const [labels, setLabels] = useState<RowLabels>({});

  useEffect(() => {
    setLabels(loadLabels());
  }, []);

  const merged = useMemo(() => {
    // Lo que se ve: si no hay personalizado, se muestra el original
    const m: RowLabels = {};
    for (const id of CONTENT_ROW_IDS) {
      m[id] = labels[id] ?? id;
    }
    return m;
  }, [labels]);

  function handleChange(id: string, value: string) {
    setLabels((prev) => ({ ...prev, [id]: value }));
  }

  function handleSave() {
    saveLabelsSafe(labels);
    onAfterChange?.();
    alert("Listo. Los nombres se actualizaron en el editor.");
  }

  function handleReset() {
    setLabels({});
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(UPDATED_EVENT));
    onAfterChange?.();
    alert("Se restablecieron los nombres iniciales.");
  }

  return (
    <div className="space-y-4">
      {/* Encabezado simple */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Herramientas del editor semanal</h2>
          <p className="text-sm text-gray-500">
            Acá podés ajustar cómo se llaman las filas que ves en el editor.{" "}
            <span title="Los cambios son solo para tu dispositivo (se guardan localmente). Podés volver a los nombres iniciales cuando quieras.">
              ❓
            </span>
          </p>
        </div>
      </div>

      {/* Card: Renombrar filas */}
      <section className="rounded-xl border bg-white">
        <div className="border-b bg-gray-50 px-3 py-2 text-[12px] font-semibold uppercase">
          Nombres de filas del editor
        </div>

        <div className="p-3 space-y-3">
          <p className="text-sm text-gray-700">
            Cambiá los nombres para que se adapten a tu forma de trabajar. Si dejás un campo vacío,
            se usará el nombre original.
          </p>

          <div className="grid gap-2 md:grid-cols-2">
            {CONTENT_ROW_IDS.map((id) => (
              <div key={id} className="space-y-1">
                <label className="block text-xs text-gray-600">
                  Nombre para <b>{id}</b>
                </label>
                <input
                  className="w-full rounded-md border px-2 py-1.5 text-sm"
                  placeholder={id}
                  value={labels[id] ?? ""}
                  onChange={(e) => handleChange(id, e.target.value)}
                />
                <div className="text-[11px] text-gray-500">
                  Se verá en el editor como: <b>{(labels[id] ?? "").trim() || id}</b>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={handleSave}
              className="rounded-lg bg-black text-white px-3 py-1.5 text-sm hover:opacity-90"
            >
              Guardar nombres
            </button>
            <button
              onClick={handleReset}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Volver a los nombres iniciales
            </button>
            <span className="text-xs text-gray-500">
              (Solo cambia lo que ves en tu compu)
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
