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

// Nombres por defecto
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

  // Etiquetas
  const [labels, setLabels] = useState<RowLabels>(DEFAULT_LABELS);
  const computed = useMemo<RowLabels>(() => ({ ...DEFAULT_LABELS, ...labels }), [labels]);

  // Lugares
  const [placesText, setPlacesText] = useState<string>("");
  const [placesCount, setPlacesCount] = useState<number>(0);

  // Carga inicial desde API
  useEffect(() => {
    (async () => {
      try {
        const server = await fetchRowLabels(); // mantiene compatibilidad
        setLabels((prev) => ({ ...prev, ...server }));
      } catch {}
      try {
        const r = await fetch("/api/planner/labels", { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          const arr: string[] = Array.isArray(j.places) ? j.places : [];
          setPlacesText(arr.join("\n"));
          setPlacesCount(arr.length);
        }
      } catch {}
    })();
  }, []);

  // Guardar etiquetas
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

  // Restaurar etiquetas
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

  // Guardar lugares
  async function handleSavePlaces() {
    setLoading(true);
    try {
      const list = Array.from(
        new Set(
          placesText
            .split("\n")
            .map((s) => (s || "").trim())
            .filter(Boolean)
        )
      );
      const r = await fetch("/api/planner/labels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ places: list }),
      });
      if (!r.ok) throw new Error("No se pudo guardar los lugares");
      const j = await r.json();
      const arr: string[] = Array.isArray(j.places) ? j.places : [];
      setPlacesText(arr.join("\n"));
      setPlacesCount(arr.length);
      window.dispatchEvent(new Event("planner-places-updated"));
      onAfterChange?.();
      alert("Lugares guardados.");
    } catch (e: any) {
      alert(e?.message || "No se pudo guardar los lugares");
    } finally {
      setLoading(false);
    }
  }

  // Vaciar lugares
  async function handleClearPlaces() {
    const ok = confirm("¿Vaciar toda la lista de lugares?");
    if (!ok) return;
    setLoading(true);
    try {
      const r = await fetch("/api/planner/labels?target=places", { method: "DELETE" });
      if (!r.ok) throw new Error("No se pudo vaciar");
      setPlacesText("");
      setPlacesCount(0);
      window.dispatchEvent(new Event("planner-places-updated"));
      onAfterChange?.();
      alert("Lista de lugares vaciada.");
    } catch (e: any) {
      alert(e?.message || "No se pudo vaciar la lista");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Nombres de filas */}
      <section className="rounded-xl border p-3">
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-sm font-semibold">Nombres de filas (tu preferencia)</h3>
          <HelpTip text="Personalizá cómo llamás a cada bloque. Afecta solo a tu usuario." />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-gray-600">PRE ENTREN0</label>
            <input
              className="h-9 rounded-md border px-2 text-sm"
              value={computed["PRE ENTREN0"]}
              onChange={(e) => setLabels((prev) => ({ ...prev, ["PRE ENTREN0"]: e.target.value }))}
              placeholder="Ej: Activación"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-gray-600">FÍSICO</label>
            <input
              className="h-9 rounded-md border px-2 text-sm"
              value={computed["FÍSICO"]}
              onChange={(e) => setLabels((prev) => ({ ...prev, ["FÍSICO"]: e.target.value }))}
              placeholder="Ej: Entrada en calor"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-gray-600">TÉCNICO–TÁCTICO</label>
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
            <label className="text-[11px] text-gray-600">COMPENSATORIO</label>
            <input
              className="h-9 rounded-md border px-2 text-sm"
              value={computed["COMPENSATORIO"]}
              onChange={(e) => setLabels((prev) => ({ ...prev, ["COMPENSATORIO"]: e.target.value }))}
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

      {/* Lugares */}
      <section className="rounded-xl border p-3">
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-sm font-semibold">Lugares</h3>
          <HelpTip text="Escribí un lugar por línea. Luego aparecerán como sugerencias en el campo LUGAR del Editor." />
          <span className="ml-auto text-[11px] text-gray-500">{placesCount} guardados</span>
        </div>

        <textarea
          className="w-full min-h-[120px] rounded-md border p-2 text-sm"
          value={placesText}
          onChange={(e) => setPlacesText(e.target.value)}
          placeholder={"Ejemplos:\nCancha 1\nComplejo Deportivo\nGimnasio"}
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
