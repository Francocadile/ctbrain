// src/hooks/useEpisodes.ts
"use client";

import * as React from "react";

/** YYYY-MM-DD de hoy en local */
export function todayYMD(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** Enums front (alineados a Prisma) */
export type ClinicalStatus = "BAJA" | "REINTEGRO" | "LIMITADA" | "ALTA";

/** Estructura que devuelve tu GET /api/med/clinical (ya mapeada en el backend) */
export type Episode = {
  id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  status: ClinicalStatus;

  // BAJA
  leaveStage?: "PARTIDO" | "ENTRENAMIENTO" | "EXTRADEPORTIVO" | null;
  leaveKind?: "LESION" | "ENFERMEDAD" | null;

  // Lesión
  diagnosis?: string | null;
  bodyPart?: string | null;
  laterality?: "IZQ" | "DER" | "BILATERAL" | "NA" | null;
  mechanism?: "SOBRECARGA" | "IMPACTO" | "TORSION" | "ESTIRAMIENTO" | "RECIDIVA" | "OTRO" | null;
  severity?: "LEVE" | "MODERADA" | "SEVERA" | null;

  // Enfermedad
  illSystem?: "RESPIRATORIO" | "GASTROINTESTINAL" | "OTORRINO" | "DERMATOLOGICO" | "GENERAL" | "OTRO" | null;
  illSymptoms?: string | null;
  illContagious?: boolean | null;
  illIsolationDays?: number | null;
  illAptitude?: "SOLO_GIMNASIO" | "AEROBICO_SUAVE" | "CHARLAS_TACTICO" | "NINGUNO" | null;
  feverMax?: number | null;

  // Cronología
  startDate?: string | null; // YYYY-MM-DD | null
  daysMin?: number | null;
  daysMax?: number | null;
  expectedReturn?: string | null; // YYYY-MM-DD | null
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

type ErrorKind = null | "EMPTY" | "ERR";

/** Hook para listar episodios por fecha y guardar (POST upsert) */
export function useEpisodes(initialDate?: string) {
  const [date, setDate] = React.useState<string>(initialDate || todayYMD());
  const [items, setItems] = React.useState<Episode[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<ErrorKind>(null);

  const reload = React.useCallback(async (d: string = date) => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (d) q.set("date", d);
      const res = await fetch(`/api/med/clinical?${q.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Episode[];
      setItems(Array.isArray(data) ? data : []);
      if (!data || data.length === 0) setError("EMPTY");
    } catch {
      setItems([]);
      setError("ERR");
    } finally {
      setLoading(false);
    }
  }, [date]);

  React.useEffect(() => {
    reload(date);
  }, [date, reload]);

  /** Guarda/actualiza un episodio (upsert por userId+date en backend) */
  async function saveEpisode(payload: Partial<Episode> & { userId: string; date?: string }) {
    const body = { ...payload };
    // Asegurar date
    if (!body.date) body.date = date;

    const res = await fetch("/api/med/clinical", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Error guardando episodio (${res.status}) ${txt}`);
    }
    await reload(body.date);
    return res.json();
  }

  return {
    date,
    setDate,
    items,
    loading,
    error,
    reload,
    saveEpisode,
  };
}
