// src/app/ct/plan-semanal/PlannerActionsBar.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { toYYYYMMDDUTC, getMonday } from "@/lib/api/sessions";
import {
  fetchRowLabels,
  saveRowLabels,
  resetRowLabels,
  type RowLabels,
} from "@/lib/planner-prefs";
import HelpTip from "@/components/HelpTip";

type Props = { onAfterChange?: () => void };

// Valores base (lo que muestra el editor si no hay preferencia)
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
  const [weekRef] = useState<string>(() => toYYYYMMDDUTC(getMonday(new Date())));
  const [loading, setLoading] = useState(false);

  // Preferencias actuales del servidor
  const [serverRowLabels, setServerRowLabels] = useState<RowLabels>({});
  const computed = useMemo<RowLabels>(
    () => ({ ...DEFAULT_LABELS, ...serverRowLabels }),
    [serverRowLabels]
  );

  // Entradas que escribe el usuario (vacías por defecto, con placeholder)
  const [typedRowLabels, setTypedRowLabels] = useState<RowLabels>({});

  // Lugares (lista editable)
  const [placesText, setPlacesText] = useState<string>(""); // 1 lugar por línea
  const [serverPlacesCount, setServerPlacesCount] = useState<number>(0);

  // Carga inicial (rowLabels + places)
  useEffect(() => {
    (async () => {
      // Row labels (módulo ya existente)
      const rl = await fetchRowLabels();
      setServerRowLabels(rl || {});

      // Places (mismo endpoint REST)
      try {
        const r = await fetch("/api/planner/labels", { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          const places: string[] = Array.isArray(j?.places) ? j.places : [];
          setPlacesText(places.join("\n"));
          setServerPlacesCount(places.length);
        }
      } catch {
        // si falla, dejamos vacío y seguimos
        setPlacesText("");
        setServerPlacesCount(0);
      }
    })();
  }, []);

  // --- Guardar nombres de filas ---
  async function handleSaveLabels() {
    // Tomamos sólo los campos donde el usuario escribió algo
    const patch: RowLabels = {};
    (["PRE ENTREN0", "FÍSICO", "TÉCNICO–TÁCTICO", "COMPENSATORIO"] as const).forEach((k) => {
      const v = (typedRowLabels[k] || "").trim();
      if (v) patch[k] = v;
    });

    if (Object.keys(patch).length === 0) {
      alert("Escribí al menos un nombre para guardar.");
      return;
    }

    setLoading(true);
    try {
      // Enviamos el merge (el helper ya guarda todo el objeto)
      const newLabels = { ...computed, ...patch };
      await saveRowLabels(newLabels);
      setServerRowLabels(newLabels);
      setTypedRowLabels({}); // limpiamos inputs
      window.dispatchEvent(new Event("planner-row-labels-updated"));
      onAfterChange?.();
      alert("Nombres guardados.");
    } catch (e: any) {
      alert(e?.message || "No se pudo guardar");
    } finally {
      setLoading(false);
    }
  }

  // --- Restaurar nombres base ---
  async function handleResetLabels() {
    const ok = confirm("¿Restaurar nombres originales?");
    if (!ok) return;
    setLoading(true);
    try {
      await resetRowLabels();
      setServerRowLabels({});
      setTypedRowLabels({});
      window.dispatchEvent(new Event("planner-row-labels-updated"));
      onAfterChange?.();
      alert("Restaurado.");
    } catch (e: any) {
      alert(e?.message || "No se pudo restaurar");
    } finally {
      setLoading(false);
    }
  }

  // --- Guardar lugares ---
  async function handleSavePlaces() {
    const list = placesText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    setLoading(true);
    try {
      const r = await fetch("/api/planner/labels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ places: list }),
      });
      if (!r.ok) throw new Error("No se pudo guardar los lugares");
      setServerPlacesCount(list.length);
      window.dispatchEvent(new Event("planner-places-updated"));
      onAfterChange?.();
      alert("Lugares guardados.");
    } catch (e: any) {
      alert(e?.message || "No se pudo guardar los lugares");
    } finally {
      setLoading(false);
    }
  }

  // --- Vaciar lista de lugares ---
  async function handleClearPlaces() {
    const ok = confirm("¿Vaciar la lista de lugares?");
    if (!ok) return;
    setLoading(true);
    try {
      const r = await fetch("/api/planner/labels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ places: [] }),
      });
      if (!r.ok) throw new Error("No se pudo vaciar los lugares");
      setPlacesText("");
      setServerPlacesCount(0);
      window.dispatchEvent(new Event("planner-places-updated"));
      onAfterChange?.();
      alert("Lista vaciada.");
    } catch (e: any) {
      alert(e?.message || "No se pudo vaciar los lugares");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* === Nombres de filas === */}
      <section className="rounded-xl border p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            Nombres de filas (tu preferencia)
            <HelpTip text="Si querés, cambiá los nombres de estas filas. Se guardan en tu usuario y se aplican en el Editor." />
          </h3>
          <div className="text-[11px] text-gray-500">Afecta sólo tu usuario.</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(
            [
              ["PRE ENTREN0", "Ej: Activación"],
              ["FÍSICO", "Ej: Fuerza + Aeróbico"],
              ["TÉCNICO–TÁCTICO", "Ej: Juego de posición"],
              ["COMPENSATORIO", "Ej: Movilidad y core"],
            ] as const
          ).map(([key, ph]) => (
            <div key={key} className="flex flex-col gap-1">
              <div className="text-[11px] text-gray-500">
                Actual: <span className="font-medium text-gray-700">{computed[key]}</span>
              </div>
              <input
                className="h-9 rounded-md border px-2 text-sm"
                value={typedRowLabels[key] || ""}
                onChange={(e) =>
                  setTypedRowLabels((prev) => ({ ...prev, [key]: e.target.value }))
                }
                placeholder={ph}
              />
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={handleSaveLabels}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-black text-white text-xs hover:opacity-90 disabled:opacity-60"
          >
            Guardar
          </button>
          <button
            onClick={handleResetLabels}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg border text-xs hover:bg-gray-50 disabled:opacity-60"
          >
            Restaurar originales
          </button>
        </div>
      </section>

      {/* === Lugares (sugerencias para el campo “LUGAR”) === */}
      <section className="rounded-xl border p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            Lugares
            <HelpTip text="Escribí 1 lugar por línea (Cancha 1, Complejo Deportivo, Gimnasio, etc.). Se sugieren luego en el campo LUGAR del Editor." />
          </h3>
          <div className="text-[11px] text-gray-500">
            {serverPlacesCount} guardados
          </div>
        </div>

        <textarea
          className="w-full min-h-[120px] rounded-md border p-2 text-sm"
          value={placesText}
          onChange={(e) => setPlacesText(e.target.value)}
          placeholder={`Ejemplos:\nCancha 1\nComplejo Deportivo\nGimnasio`}
        />

        <div className="mt-3 flex gap-2">
          <button
            onClick={handleSavePlaces}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-black text-white text-xs hover:opacity-90 disabled:opacity-60"
          >
            Guardar lugares
          </button>
          <button
            onClick={handleClearPlaces}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg border text-xs hover:bg-gray-50 disabled:opacity-60"
          >
            Vaciar lista
          </button>
        </div>
      </section>

      {/* Dejás acá cualquier otra herramienta que ya tenías (exportar, duplicar, etc.) */}
    </div>
  );
}
