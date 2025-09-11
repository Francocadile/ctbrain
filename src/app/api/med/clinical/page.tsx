// src/app/med/clinical/page.tsx
"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import RoleGate from "@/components/auth/RoleGate";

type ClinicalRow = {
  id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  status: "BAJA" | "REINTEGRO" | "LIMITADA" | "ALTA";

  // BAJA
  leaveStage?: "PARTIDO" | "ENTRENAMIENTO" | "EXTRADEPORTIVO" | null;
  leaveKind?: "LESION" | "ENFERMEDAD" | null;

  // LESION
  diagnosis?: string | null;
  bodyPart?: string | null;
  laterality?: "IZQ" | "DER" | "BILATERAL" | "NA" | null;
  mechanism?:
    | "SOBRECARGA"
    | "IMPACTO"
    | "TORSION"
    | "ESTIRAMIENTO"
    | "RECIDIVA"
    | "OTRO"
    | null;
  severity?: "LEVE" | "MODERADA" | "SEVERA" | null;

  // ENFERMEDAD
  illSystem?:
    | "RESPIRATORIO"
    | "GASTROINTESTINAL"
    | "OTORRINO"
    | "DERMATOLOGICO"
    | "GENERAL"
    | "OTRO"
    | null;
  illSymptoms?: string | null;
  illContagious?: boolean | null;
  illIsolationDays?: number | null;
  illAptitude?:
    | "SOLO_GIMNASIO"
    | "AEROBICO_SUAVE"
    | "CHARLAS_TACTICO"
    | "NINGUNO"
    | null;
  feverMax?: number | null;

  // Cronología
  startDate?: string | null; // YYYY-MM-DD
  daysMin?: number | null;
  daysMax?: number | null;
  expectedReturn?: string | null; // YYYY-MM-DD
  expectedReturnManual?: boolean | null;

  // Restricciones
  capMinutes?: number | null;
  noSprint?: boolean;
  noChangeOfDirection?: boolean;
  gymOnly?: boolean;
  noContact?: boolean;

  // Docs/plan
  notes?: string | null;
  medSignature?: string | null;
  protocolObjectives?: string | null;
  protocolTasks?: string | null;
  protocolControls?: string | null;
  protocolCriteria?: string | null;
};

function toYMD(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export default function MedClinicalViewerPage() {
  const [date, setDate] = React.useState<string>(toYMD());
  const [rows, setRows] = React.useState<ClinicalRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const load = React.useCallback(async (d: string) => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/med/clinical?date=${encodeURIComponent(d)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ClinicalRow[] = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.message || "Error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load(date);
  }, [date, load]);

  return (
    <RoleGate allow={["MEDICO"]}>
      <main className="min-h-[70vh] px-6 py-10">
        <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Partes clínicos — Visor diario</h1>
            <p className="mt-1 text-sm text-gray-600">
              Solo lectura de lo cargado por el cuerpo médico para el día seleccionado.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Fecha</label>
            <input
              type="date"
              className="h-10 rounded-md border px-3 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <button
              onClick={() => load(date)}
              className="h-10 rounded-md border px-3 text-sm"
              disabled={loading}
              title="Recargar"
            >
              {loading ? "Cargando..." : "Recargar"}
            </button>
          </div>
        </header>

        {/* Estado de carga / error */}
        {err && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            No se pudo cargar el listado ({err}). Verifique permisos y vuelva a intentar.
          </div>
        )}

        {/* Tabla simple */}
        <div className="overflow-auto rounded-xl border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <Th>Jugador</Th>
                <Th>Estado</Th>
                <Th>Tipo</Th>
                <Th>Resumen</Th>
                <Th>Restricciones</Th>
                <Th>ETR</Th>
                <Th>Firma</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className="p-5 text-center text-gray-500">
                    {date ? `Sin partes cargados para ${date}.` : "Sin resultados."}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t align-top">
                    <Td>
                      <div className="font-medium">{r.userName}</div>
                      <div className="text-xs text-gray-500">{r.date}</div>
                    </Td>
                    <Td>
                      <StatusBadge status={r.status} />
                      {r.status === "BAJA" && r.leaveStage ? (
                        <div className="mt-1 text-[11px] text-gray-500">
                          Estadio: {fmtLeaveStage(r.leaveStage)}
                        </div>
                      ) : null}
                    </Td>
                    <Td>{r.leaveKind ? fmtLeaveKind(r.leaveKind) : "—"}</Td>
                    <Td>
                      {r.leaveKind === "LESION" ? (
                        <div className="space-y-1">
                          <div className="font-medium">
                            {r.diagnosis || "Diagnóstico no informado"}
                          </div>
                          <div className="text-xs text-gray-600">
                            {[
                              r.bodyPart ? `Zona: ${r.bodyPart}` : null,
                              r.laterality ? `Lat: ${fmtLaterality(r.laterality)}` : null,
                              r.mechanism ? `Mec: ${fmtMechanism(r.mechanism)}` : null,
                              r.severity ? `Grav: ${fmtSeverity(r.severity)}` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        </div>
                      ) : r.leaveKind === "ENFERMEDAD" ? (
                        <div className="space-y-1">
                          <div className="font-medium">
                            {r.diagnosis || "Diagnóstico no informado"}
                          </div>
                          <div className="text-xs text-gray-600">
                            {[
                              r.illSystem ? `Sistema: ${fmtSystem(r.illSystem)}` : null,
                              r.illSymptoms ? `Sx: ${r.illSymptoms}` : null,
                              r.illContagious != null
                                ? `Contagioso: ${r.illContagious ? "Sí" : "No"}`
                                : null,
                              typeof r.feverMax === "number"
                                ? `Fiebre máx: ${r.feverMax.toFixed(1)}°C`
                                : null,
                              r.illIsolationDays
                                ? `Aislamiento: ${r.illIsolationDays}d`
                                : null,
                              r.illAptitude ? `Aptitud: ${fmtAptitude(r.illAptitude)}` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {r.capMinutes != null && Chip(`Tope ${r.capMinutes}′`)}
                        {r.noSprint && Chip("Sin sprint")}
                        {r.noChangeOfDirection && Chip("Sin cambios dir.")}
                        {r.gymOnly && Chip("Solo gimnasio")}
                        {r.noContact && Chip("Sin contacto")}
                        {!r.capMinutes &&
                          !r.noSprint &&
                          !r.noChangeOfDirection &&
                          !r.gymOnly &&
                          !r.noContact && <span className="text-gray-500">—</span>}
                      </div>
                    </Td>
                    <Td>
                      {r.expectedReturn ? (
                        <div className="font-medium">{r.expectedReturn}</div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                      {r.startDate && (
                        <div className="mt-1 text-[11px] text-gray-500">
                          Inicio: {r.startDate}
                          {r.daysMin != null || r.daysMax != null ? (
                            <>
                              {" · "}
                              {fmtDaysRange(r.daysMin, r.daysMax)}
                            </>
                          ) : null}
                        </div>
                      )}
                    </Td>
                    <Td>
                      {r.medSignature ? (
                        <span className="whitespace-nowrap">{r.medSignature}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </RoleGate>
  );
}

/* ------- UI helpers ------- */

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3">{children}</td>;
}

function StatusBadge({ status }: { status: ClinicalRow["status"] }) {
  const cfg =
    status === "ALTA"
      ? { bg: "bg-green-100", text: "text-green-700", label: "ALTA" }
      : status === "REINTEGRO" || status === "LIMITADA"
      ? { bg: "bg-amber-100", text: "text-amber-800", label: status }
      : { bg: "bg-red-100", text: "text-red-700", label: "BAJA" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs ${cfg.bg} ${cfg.text} font-medium`}>
      {cfg.label}
    </span>
  );
}

function Chip(label: string) {
  return (
    <span
      key={label}
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] text-gray-700"
    >
      {label}
    </span>
  );
}

function fmtLeaveStage(v: NonNullable<ClinicalRow["leaveStage"]>) {
  switch (v) {
    case "PARTIDO":
      return "Partido";
    case "ENTRENAMIENTO":
      return "Entrenamiento";
    case "EXTRADEPORTIVO":
      return "Extra deportivo";
  }
}

function fmtLeaveKind(v: NonNullable<ClinicalRow["leaveKind"]>) {
  return v === "LESION" ? "Lesión" : "Enfermedad";
}

function fmtLaterality(v: NonNullable<ClinicalRow["laterality"]>) {
  switch (v) {
    case "IZQ":
      return "Izq";
    case "DER":
      return "Der";
    case "BILATERAL":
      return "Bilateral";
    case "NA":
      return "N/A";
  }
}

function fmtMechanism(v: NonNullable<ClinicalRow["mechanism"]>) {
  switch (v) {
    case "SOBRECARGA":
      return "Sobrecarga";
    case "IMPACTO":
      return "Impacto";
    case "TORSION":
      return "Torsión";
    case "ESTIRAMIENTO":
      return "Estiramiento";
    case "RECIDIVA":
      return "Recidiva";
    case "OTRO":
      return "Otro";
  }
}

function fmtSeverity(v: NonNullable<ClinicalRow["severity"]>) {
  switch (v) {
    case "LEVE":
      return "Leve";
    case "MODERADA":
      return "Moderada";
    case "SEVERA":
      return "Severa";
  }
}

function fmtSystem(v: NonNullable<ClinicalRow["illSystem"]>) {
  switch (v) {
    case "RESPIRATORIO":
      return "Respiratorio";
    case "GASTROINTESTINAL":
      return "Gastrointestinal";
    case "OTORRINO":
      return "Otorrino";
    case "DERMATOLOGICO":
      return "Dermatológico";
    case "GENERAL":
      return "General";
    case "OTRO":
      return "Otro";
  }
}

function fmtAptitude(v: NonNullable<ClinicalRow["illAptitude"]>) {
  switch (v) {
    case "SOLO_GIMNASIO":
      return "Solo gimnasio";
    case "AEROBICO_SUAVE":
      return "Aeróbico suave";
    case "CHARLAS_TACTICO":
      return "Charlas–táctico";
    case "NINGUNO":
      return "Ninguno";
  }
}

function fmtDaysRange(min: number | null | undefined, max: number | null | undefined) {
  if (min != null && max != null) return `Estimado: ${min}–${max} días`;
  if (max != null) return `Estimado: ${max} días`;
  if (min != null) return `Estimado: ${min} días`;
  return "";
}
