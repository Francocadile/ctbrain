// src/hooks/useEpisodes.ts
"use client";

import * as React from "react";

/* ============
   Tipos front
   ============ */
export type ClinicalStatus = "BAJA" | "REINTEGRO" | "LIMITADA" | "ALTA";
export type LeaveStage = "PARTIDO" | "ENTRENAMIENTO" | "EXTRADEPORTIVO";
export type LeaveKind = "LESION" | "ENFERMEDAD";
export type Laterality = "IZQ" | "DER" | "BILATERAL" | "NA";
export type Severity = "LEVE" | "MODERADA" | "SEVERA";
export type Mechanism =
  | "SOBRECARGA"
  | "IMPACTO"
  | "TORSION"
  | "ESTIRAMIENTO"
  | "RECIDIVA"
  | "OTRO";
export type SystemAffected =
  | "RESPIRATORIO"
  | "GASTROINTESTINAL"
  | "OTORRINO"
  | "DERMATOLOGICO"
  | "GENERAL"
  | "OTRO";
export type IllAptitude =
  | "SOLO_GIMNASIO"
  | "AEROBICO_SUAVE"
  | "CHARLAS_TACTICO"
  | "NINGUNO";

export type ClinicalRow = {
  id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  status: ClinicalStatus;

  // BAJA
  leaveStage?: LeaveStage | null;
  leaveKind?: LeaveKind | null;

  // LESION
  diagnosis?: string | null;
  bodyPart?: string | null;
  laterality?: Laterality | null;
  mechanism?: Mechanism | null;
  severity?: Severity | null;

  // ENFERMEDAD
  illSystem?: SystemAffected | null;
  illSymptoms?: string | null;
  illContagious?: boolean | null;
  illIsolationDays?: number | null;
  illAptitude?: IllAptitude | null;
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

export type UpsertPayload = {
  userId: string;
  date?: string; // YYYY-MM-DD (default hoy del server si se omite)
  status: ClinicalStatus;

  // BAJA
  leaveStage?: LeaveStage | null;
  leaveKind?: LeaveKind | null;

  // LESION
  diagnosis?: string | null;
  bodyPart?: string | null;
  laterality?: Laterality | null;
  mechanism?: Mechanism | null;
  severity?: Severity | null;

  // ENFERMEDAD
  illSystem?: SystemAffected | null;
  illSymptoms?: string | null;
  illContagious?: boolean | null;
  illIsolationDays?: number | null;
  illAptitude?: IllAptitude | null;
  feverMax?: number | null;

  // Cronología
  startDate?: string | null;
  daysMin?: number | null;
  daysMax?: number | null;
  expectedReturn?: string | null;
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

type State<T> = {
  data: T;
  loading: boolean;
  error: string | null;
};

/* ========================
   Hook: listar por fecha
   ======================== */
export function useEpisodesList(initialDate?: string) {
  const [date, setDate] = React.useState<string>(
    initialDate || new Date().toISOString().slice(0, 10)
  );
  const [state, setState] = React.useState<State<ClinicalRow[]>>({
    data: [],
    loading: false,
    error: null,
  });

  const load = React.useCallback(
    async (d?: string) => {
      const q = d || date;
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await fetch(
          `/api/med/clinical?date=${encodeURIComponent(q)}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rows: ClinicalRow[] = await res.json();
        setState({ data: rows ?? [], loading: false, error: null });
      } catch (e: any) {
        setState({ data: [], loading: false, error: e?.message || "Error" });
      }
    },
    [date]
  );

  React.useEffect(() => {
    load(date);
  }, [date, load]);

  return {
    date,
    setDate,
    ...state,
    reload: () => load(date),
  };
}

/* ========================
   Hook: crear/actualizar
   ======================== */
export function useEpisodeUpsert() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ id?: string; date?: string } | null>(null);

  const upsert = React.useCallback(async (payload: UpsertPayload) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/med/clinical", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setResult({ id: data?.id, date: data?.date });
      return data;
    } catch (e: any) {
      setError(e?.message || "Error");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { upsert, loading, error, result };
}
