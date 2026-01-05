// src/app/ct/plan-semanal/PlannerConfigPanel.tsx
// LEGACY / no usado en el flujo actual
"use client";

import { useEffect, useState } from "react";
import HelpTip from "@/components/HelpTip";

const STORAGE_KEY = "planner.rowLabels.v1";

/** IDs estables (no cambiar): deben matchear lo que usa el marcador [GRID:turn:rowId] */
export const DEFAULT_CONTENT_IDS = [
  "PRE ENTREN0",
  "FÍSICO",
  "TÉCNICO–TÁCTICO",
  "COMPENSATORIO",
] as const;

export const DEFAULT_META_IDS = [
  "LUGAR",
  "HORA",
  "VIDEO",
  "NOMBRE SESIÓN",
] as const;

type LabelMap = Record<string, string>;

function loadLabels(): LabelMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveLabels(m: LabelMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
    window.dispatchEvent(new CustomEvent("planner-row-labels-updated"));
  } catch {}
}

export default function PlannerConfigPanel() {
  const [labels, setLabels] = useState<LabelMap>({});

  useEffect(() => {
    setLabels(loadLabels());
  }, []);

  const allIds = [...DEFAULT_META_IDS, ...DEFAULT_CONTENT_IDS];

  const setOne = (id: string, value: string) => {
    const next = { ...labels, [id]: value };
    if (!value.trim()) delete next[id];
    setLabels(next);
    saveLabels(next);
  };

  const resetAll = () => {
    setLabels({});
    saveLabels({});
  };

  return (
    <section className="rounded-xl border bg-white p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-semibold uppercase">
          Configuración de tabla (nombres visibles){" "}
          <HelpTip text="Renombrá cómo se muestran las filas en el editor sin cambiar los IDs internos. Ej.: “PRE ENTREN0” → “Activación”. Esto no rompe datos existentes." />
        </div>
        <button
          onClick={resetAll}
          className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
          title="Volver a los nombres por defecto"
        >
          Restaurar por defecto
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-lg border">
          <div className="bg-gray-50 px-3 py-2 text-[12px] font-semibold uppercase">
            Meta
          </div>
          <div className="p-3 space-y-2">
            {DEFAULT_META_IDS.map((id) => (
              <div key={id} className="flex items-center gap-2">
                <div className="w-40 text-xs text-gray-600">{id}</div>
                <input
                  className="flex-1 rounded-md border px-2 py-1.5 text-sm"
                  placeholder={`Etiqueta visible (ej.: ${id})`}
                  value={labels[id] ?? ""}
                  onChange={(e) => setOne(id, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border">
          <div className="bg-gray-50 px-3 py-2 text-[12px] font-semibold uppercase">
            Contenido
          </div>
          <div className="p-3 space-y-2">
            {DEFAULT_CONTENT_IDS.map((id) => (
              <div key={id} className="flex items-center gap-2">
                <div className="w-40 text-xs text-gray-600">{id}</div>
                <input
                  className="flex-1 rounded-md border px-2 py-1.5 text-sm"
                  placeholder={`Etiqueta visible (ej.: ${id})`}
                  value={labels[id] ?? (id === "PRE ENTREN0" ? "Activación" : "")}
                  onChange={(e) => setOne(id, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500">
        Nota: Esta preferencia se guarda en tu navegador (local). Luego lo
        moveremos a “configuración de club” para compartirlo con todo el staff.
      </div>
    </section>
  );
}
