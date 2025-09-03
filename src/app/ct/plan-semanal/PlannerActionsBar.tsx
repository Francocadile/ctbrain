// src/app/ct/plan-semanal/PlannerActionsBar.tsx
"use client";

import { useRef, useState } from "react";
import HelpTip from "@/components/HelpTip";

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function PlannerActionsBar({
  onAfterChange,
}: {
  /** opcional: recargar planner luego de importar/duplicar */
  onAfterChange?: () => void;
}) {
  const today = new Date();
  const [exportStart, setExportStart] = useState<string>(toYMD(today));

  // Import
  const fileRef = useRef<HTMLInputElement>(null);
  const [importTargetStart, setImportTargetStart] = useState<string>("");
  const [importAlign, setImportAlign] = useState<boolean>(false);
  const [importBusy, setImportBusy] = useState<boolean>(false);

  // Duplicate
  const [dupFrom, setDupFrom] = useState<string>(toYMD(today));
  const [dupTo, setDupTo] = useState<string>(toYMD(today));
  const [dupOverwrite, setDupOverwrite] = useState<boolean>(true);
  const [dupBusy, setDupBusy] = useState<boolean>(false);

  async function doExport() {
    try {
      const res = await fetch(`/api/sessions/export?start=${exportStart}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `planner_semana_${data.weekStart}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message || "Error al exportar");
    }
  }

  async function doImport(file: File) {
    setImportBusy(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const payload: any = {
        sessions: Array.isArray(json.sessions) ? json.sessions : json, // permite pegar lista "cruda"
      };
      if (importAlign && importTargetStart) {
        payload.targetStart = importTargetStart;
        // si vino weekStart en el archivo, lo mandamos (ayuda a alinear mejor)
        if (json.weekStart) payload.weekStart = json.weekStart;
      }
      const res = await fetch("/api/sessions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const out = await res.json();
      alert(`Importado OK • creadas ${out.created} sesiones`);
      onAfterChange?.();
    } catch (e: any) {
      alert(e?.message || "Error al importar");
    } finally {
      setImportBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function doDuplicate() {
    if (!dupFrom || !dupTo) {
      alert("Completá 'De' y 'A'");
      return;
    }
    setDupBusy(true);
    try {
      const res = await fetch("/api/sessions/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromStart: dupFrom,
          toStart: dupTo,
          overwrite: dupOverwrite,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const out = await res.json();
      alert(
        `Duplicado OK • desde ${out.fromWeek} a ${out.toWeek} • borrado previo: ${out.deleted} • creadas: ${out.created}`
      );
      onAfterChange?.();
    } catch (e: any) {
      alert(e?.message || "Error al duplicar");
    } finally {
      setDupBusy(false);
    }
  }

  return (
    <section className="rounded-xl border bg-white p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-semibold uppercase">
          Planner — Acciones de semana{" "}
          <HelpTip text="Exportar para respaldo/plantillas; Importar para pegar una semana; Duplicar para copiar de una semana a otra (incluye domingo gracias al fin exclusivo lt: nextMonday)." />
        </div>
      </div>

      {/* Exportar */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
        <div className="text-sm font-medium w-28">Exportar</div>
        <input
          type="date"
          className="rounded-md border px-2 py-1.5 text-sm"
          value={exportStart}
          onChange={(e) => setExportStart(e.target.value)}
          title="Cualquier día de la semana a exportar"
        />
        <button
          onClick={doExport}
          className="rounded-lg bg-black text-white px-3 py-1.5 text-sm hover:opacity-90 w-full md:w-auto"
        >
          Exportar JSON
        </button>
        <div className="text-xs text-gray-500">
          Usa <code>start</code> como referencia; el backend alinea al lunes.
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Importar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium w-28">Importar</div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doImport(f);
            }}
            disabled={importBusy}
            className="rounded-md border px-2 py-1.5 text-sm w-full md:w-auto"
          />
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={importAlign}
              onChange={(e) => setImportAlign(e.target.checked)}
            />
            Alinear a semana destino
          </label>
          <input
            type="date"
            className="rounded-md border px-2 py-1.5 text-sm"
            value={importTargetStart}
            onChange={(e) => setImportTargetStart(e.target.value)}
            disabled={!importAlign || importBusy}
            title="Lunes destino (o cualquier día de esa semana)"
          />
        </div>
        <div className="text-xs text-gray-500 ml-28">
          El archivo puede ser el JSON exportado o una lista <code>sessions[]</code>. Si activás
          “Alinear”, se reubica la semana al destino.
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Duplicar */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="text-sm font-medium w-28">Duplicar</div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">De</span>
            <input
              type="date"
              className="rounded-md border px-2 py-1.5 text-sm"
              value={dupFrom}
              onChange={(e) => setDupFrom(e.target.value)}
              title="Semana fuente (cualquier día)"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">A</span>
            <input
              type="date"
              className="rounded-md border px-2 py-1.5 text-sm"
              value={dupTo}
              onChange={(e) => setDupTo(e.target.value)}
              title="Semana destino (cualquier día)"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={dupOverwrite}
              onChange={(e) => setDupOverwrite(e.target.checked)}
            />
            Limpiar destino
          </label>
          <button
            onClick={doDuplicate}
            disabled={dupBusy}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              dupBusy ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"
            }`}
          >
            Duplicar semana
          </button>
        </div>
        <div className="text-xs text-gray-500 ml-28">
          Copia todas las sesiones de la semana fuente a la semana destino. Si “Limpiar destino”
          está activo, borra previamente las existentes.
        </div>
      </div>
    </section>
  );
}
