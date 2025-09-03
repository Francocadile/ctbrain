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
  onAfterChange?: () => void;
}) {
  const today = new Date();
  const [exportStart, setExportStart] = useState<string>(toYMD(today));

  // Import JSON
  const fileRefJSON = useRef<HTMLInputElement>(null);
  const [importTargetStart, setImportTargetStart] = useState<string>("");
  const [importAlign, setImportAlign] = useState<boolean>(false);
  const [importBusy, setImportBusy] = useState<boolean>(false);

  // Duplicate
  const [dupFrom, setDupFrom] = useState<string>(toYMD(today));
  const [dupTo, setDupTo] = useState<string>(toYMD(today));
  const [dupOverwrite, setDupOverwrite] = useState<boolean>(true);
  const [dupBusy, setDupBusy] = useState<boolean>(false);

  // CSV
  const fileRefCSV = useRef<HTMLInputElement>(null);
  const [csvTargetStart, setCsvTargetStart] = useState<string>("");
  const [csvAlign, setCsvAlign] = useState<boolean>(false);
  const [csvOverwrite, setCsvOverwrite] = useState<boolean>(true);
  const [csvBusy, setCsvBusy] = useState<boolean>(false);
  const [csvPreview, setCsvPreview] = useState<{counts?: any; warnings?: string[]} | null>(null);

  async function doExport() {
    try {
      const res = await fetch(`/api/sessions/export?start=${exportStart}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
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
        sessions: Array.isArray(json.sessions) ? json.sessions : json,
      };
      if (importAlign && importTargetStart) {
        payload.targetStart = importTargetStart;
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
      if (fileRefJSON.current) fileRefJSON.current.value = "";
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
        body: JSON.stringify({ fromStart: dupFrom, toStart: dupTo, overwrite: dupOverwrite }),
      });
      if (!res.ok) throw new Error(await res.text());
      const out = await res.json();
      alert(`Duplicado OK • desde ${out.fromWeek} a ${out.toWeek} • borrado previo: ${out.deleted} • creadas: ${out.created}`);
      onAfterChange?.();
    } catch (e: any) {
      alert(e?.message || "Error al duplicar");
    } finally {
      setDupBusy(false);
    }
  }

  /** ---------- CSV ---------- */
  function downloadCSVTemplate() {
    const header = [
      "date","turn","row","title","place","time","video_label","video_url","day_flag","flag_rival","flag_logo"
    ].join(",");
    const sample = [
      '2025-09-01,morning,PRE ENTREN0,"Calentamiento y movilidad",,,,,,',
      '2025-09-01,morning,NOMBRE SESIÓN,"Sesión 1",,,,,,',
      '2025-09-01,morning,VIDEO,,,"","Clip activación",https://youtu.be/xxxx,,',
      '2025-09-01,morning,,,,"",,,"PARTIDO","Rivales FC","https://logo.png"',
      '2025-09-03,afternoon,LUGAR,"Complejo Deport",,,,,,',
      '2025-09-03,afternoon,HORA,,"",17:00,,,,,',
    ].join("\n");
    const blob = new Blob([header+"\n"+sample], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_planner.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function csvValidateOrImport(file: File, apply: boolean) {
    setCsvBusy(true);
    try {
      const text = await file.text();
      const payload: any = {
        csvText: text,
        dryRun: !apply,
        overwrite: csvOverwrite,
      };
      if (csvAlign && csvTargetStart) payload.targetStart = csvTargetStart;

      const res = await fetch("/api/sessions/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const out = await res.json();
      if (!res.ok) {
        const msg = out?.errors?.length ? out.errors.join("\n") : (out?.error || "Error");
        alert(msg);
        setCsvPreview(null);
        return;
      }

      if (!apply) {
        setCsvPreview({ counts: out.counts, warnings: out.warnings || [] });
      } else {
        alert(`CSV aplicado • creadas: ${out.created} • actualizadas: ${out.updated} • eliminadas: ${out.deleted}`);
        setCsvPreview(null);
        onAfterChange?.();
        if (fileRefCSV.current) fileRefCSV.current.value = "";
      }
    } catch (e: any) {
      alert(e?.message || "Error procesando CSV");
      setCsvPreview(null);
    } finally {
      setCsvBusy(false);
    }
  }

  return (
    <section className="rounded-xl border bg-white p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-semibold uppercase">
          Planner — Acciones de semana{" "}
          <HelpTip text="Exportar para respaldo/plantillas; Importar (JSON o CSV) para pegar contenido; Duplicar para copiar de una semana a otra (incluye domingo por lt: nextMonday)." />
        </div>
      </div>

      {/* Exportar JSON */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
        <div className="text-sm font-medium w-28">Exportar</div>
        <input
          type="date"
          className="rounded-md border px-2 py-1.5 text-sm"
          value={exportStart}
          onChange={(e) => setExportStart(e.target.value)}
          title="Cualquier día de la semana a exportar"
        />
        <button onClick={doExport} className="rounded-lg bg-black text-white px-3 py-1.5 text-sm hover:opacity-90 w-full md:w-auto">
          Exportar JSON
        </button>
        <div className="text-xs text-gray-500">Usa <code>start</code> como referencia; el backend alinea al lunes.</div>
      </div>

      <hr className="border-gray-200" />

      {/* Importar JSON */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium w-28">Importar</div>
          <input
            ref={fileRefJSON}
            type="file"
            accept="application/json"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void doImport(f); }}
            disabled={importBusy}
            className="rounded-md border px-2 py-1.5 text-sm w-full md:w-auto"
          />
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={importAlign} onChange={(e) => setImportAlign(e.target.checked)} />
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
          El archivo puede ser el JSON exportado o una lista <code>sessions[]</code>. Si activás “Alinear”, se reubica la semana al destino.
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* CSV Import */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium w-28">CSV</div>
          <input
            ref={fileRefCSV}
            type="file"
            accept=".csv,text/csv"
            disabled={csvBusy}
            className="rounded-md border px-2 py-1.5 text-sm w-full md:w-auto"
            onChange={() => setCsvPreview(null)}
          />
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={csvAlign} onChange={(e) => setCsvAlign(e.target.checked)} />
            Alinear a semana destino
          </label>
          <input
            type="date"
            className="rounded-md border px-2 py-1.5 text-sm"
            value={csvTargetStart}
            onChange={(e) => setCsvTargetStart(e.target.value)}
            disabled={!csvAlign || csvBusy}
            title="Lunes destino (o cualquier día de esa semana)"
          />
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={csvOverwrite} onChange={(e) => setCsvOverwrite(e.target.checked)} />
            Limpiar celdas del archivo antes de aplicar
          </label>
          <button onClick={downloadCSVTemplate} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
            Descargar plantilla
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 ml-28">
          <button
            onClick={async () => {
              const f = fileRefCSV.current?.files?.[0];
              if (!f) return alert("Elegí un CSV");
              await csvValidateOrImport(f, false);
            }}
            disabled={csvBusy}
            className={`rounded-lg px-3 py-1.5 text-sm ${csvBusy ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"}`}
          >
            Validar CSV (dry-run)
          </button>
          <button
            onClick={async () => {
              const f = fileRefCSV.current?.files?.[0];
              if (!f) return alert("Elegí un CSV");
              if (!csvPreview) {
                const ok = confirm("¿Aplicar sin validar? Recomendado validar primero.");
                if (!ok) return;
              }
              await csvValidateOrImport(f, true);
            }}
            disabled={csvBusy}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Importar CSV
          </button>
        </div>

        {csvPreview && (
          <div className="ml-28 rounded-lg border bg-gray-50 p-2 text-xs text-gray-700">
            <div className="font-semibold mb-1">Resultado de validación:</div>
            <div>Setear celdas: <b>{csvPreview.counts?.cell_set ?? 0}</b> • Borrar celdas: <b>{csvPreview.counts?.cell_clear ?? 0}</b></div>
            <div>Setear flags: <b>{csvPreview.counts?.flag_set ?? 0}</b> • Borrar flags: <b>{csvPreview.counts?.flag_clear ?? 0}</b></div>
            {(csvPreview.warnings?.length ?? 0) > 0 && (
              <details className="mt-1">
                <summary className="cursor-pointer">Ver advertencias ({csvPreview.warnings?.length})</summary>
                <ul className="list-disc pl-5">
                  {csvPreview.warnings!.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}

        <div className="text-xs text-gray-500 ml-28">
          Columnas: <code>date</code>, <code>turn</code>, <code>row</code>, <code>title</code>, <code>place</code>, <code>time</code>, <code>video_label</code>, <code>video_url</code>, <code>day_flag</code>, <code>flag_rival</code>, <code>flag_logo</code>.
          <br />
          <b>row</b> admite: PRE ENTREN0, FÍSICO, TÉCNICO–TÁCTICO, COMPENSATORIO, LUGAR, HORA, VIDEO, NOMBRE SESIÓN.  
          <b>day_flag</b>: NONE | LIBRE | PARTIDO.
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Duplicar */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="text-sm font-medium w-28">Duplicar</div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">De</span>
            <input type="date" className="rounded-md border px-2 py-1.5 text-sm" value={dupFrom} onChange={(e) => setDupFrom(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">A</span>
            <input type="date" className="rounded-md border px-2 py-1.5 text-sm" value={dupTo} onChange={(e) => setDupTo(e.target.value)} />
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={dupOverwrite} onChange={(e) => setDupOverwrite(e.target.checked)} />
            Limpiar destino
          </label>
          <button
            onClick={doDuplicate}
            disabled={dupBusy}
            className={`rounded-lg px-3 py-1.5 text-sm ${dupBusy ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"}`}
          >
            Duplicar semana
          </button>
        </div>
        <div className="text-xs text-gray-500 ml-28">
          Copia todas las sesiones de la semana fuente a la semana destino. Si “Limpiar destino” está activo, borra previamente las existentes.
        </div>
      </div>
    </section>
  );
}
