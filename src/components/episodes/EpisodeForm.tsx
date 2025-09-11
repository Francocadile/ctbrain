// src/components/episodes/EpisodeForm.tsx
"use client";

import * as React from "react";
import PlayerSelectMed from "@/components/PlayerSelectMed";
import HelpTip from "@/components/HelpTip";
import { useEpisodes, type Episode, todayYMD } from "@/hooks/useEpisodes";

type Status = "BAJA" | "REINTEGRO" | "LIMITADA" | "ALTA";
type LeaveStage = "PARTIDO" | "ENTRENAMIENTO" | "EXTRADEPORTIVO";
type LeaveKind = "LESION" | "ENFERMEDAD";
type Laterality = "IZQ" | "DER" | "BILATERAL" | "NA";
type Mechanism = "SOBRECARGA" | "IMPACTO" | "TORSION" | "ESTIRAMIENTO" | "RECIDIVA" | "OTRO";
type Severity = "LEVE" | "MODERADA" | "SEVERA";
type IllSystem = "RESPIRATORIO" | "GASTROINTESTINAL" | "OTORRINO" | "DERMATOLOGICO" | "GENERAL" | "OTRO";
type IllAptitude = "SOLO_GIMNASIO" | "AEROBICO_SUAVE" | "CHARLAS_TACTICO" | "NINGUNO";

function addDays(ymd: string, days: number) {
  const [y, m, d] = ymd.split("-").map((n) => Number(n));
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  dt.setDate(dt.getDate() + days);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function diffDays(aYMD?: string | null, bYMD?: string | null) {
  if (!aYMD || !bYMD) return null;
  const [ay, am, ad] = aYMD.split("-").map(Number);
  const [by, bm, bd] = bYMD.split("-").map(Number);
  const a = new Date(ay, (am || 1) - 1, ad || 1);
  const b = new Date(by, (bm || 1) - 1, bd || 1);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

type Props = {
  /** Si viene, estamos editando; si no, es nuevo */
  initial?: Partial<Episode>;
  /** Fecha por defecto del parte (YYYY-MM-DD). Si no viene, hoy. */
  defaultDate?: string;
  /** Cerrar formulario sin guardar */
  onCancel?: () => void;
  /** Callback tras guardar */
  onSaved?: () => void;
};

export default function EpisodeForm({ initial, defaultDate, onCancel, onSaved }: Props) {
  const { saveEpisode } = useEpisodes(defaultDate || todayYMD());

  // --------- estado base ---------
  const [date, setDate] = React.useState<string>(initial?.date ?? (defaultDate || todayYMD()));
  const [userId, setUserId] = React.useState(initial?.userId ?? "");
  const [status, setStatus] = React.useState<Status>((initial?.status as Status) ?? "LIMITADA");

  // BAJA
  const [leaveStage, setLeaveStage] = React.useState<LeaveStage | "">((initial?.leaveStage as LeaveStage) ?? "");
  const [leaveKind, setLeaveKind] = React.useState<LeaveKind | "">((initial?.leaveKind as LeaveKind) ?? "");

  // Lesión
  const [diagnosis, setDiagnosis] = React.useState<string>(initial?.diagnosis ?? "");
  const [bodyPart, setBodyPart] = React.useState<string>(initial?.bodyPart ?? "");
  const [laterality, setLaterality] = React.useState<Laterality | "">(
    (initial?.laterality as Laterality) ?? ""
  );
  const [mechanism, setMechanism] = React.useState<Mechanism | "">(
    (initial?.mechanism as Mechanism) ?? ""
  );
  const [severity, setSeverity] = React.useState<Severity | "">(
    (initial?.severity as Severity) ?? ""
  );

  // Enfermedad
  const [illSystem, setIllSystem] = React.useState<IllSystem | "">(
    (initial?.illSystem as IllSystem) ?? ""
  );
  const [illSymptoms, setIllSymptoms] = React.useState<string>(initial?.illSymptoms ?? "");
  const [illContagious, setIllContagious] = React.useState<boolean>(!!initial?.illContagious);
  const [illIsolationDays, setIllIsolationDays] = React.useState<number | "">(
    initial?.illIsolationDays ?? ""
  );
  const [illAptitude, setIllAptitude] = React.useState<IllAptitude | "">(
    (initial?.illAptitude as IllAptitude) ?? ""
  );
  const [feverMax, setFeverMax] = React.useState<number | "">(initial?.feverMax ?? "");

  // Cronología — ahora usamos “días estimados” único
  const initialDaysEstimated =
    diffDays(initial?.startDate ?? date, initial?.expectedReturn ?? null) ?? "";

  const [startDate, setStartDate] = React.useState<string>(initial?.startDate ?? date);
  const [daysEstimated, setDaysEstimated] = React.useState<number | "">(initialDaysEstimated);
  const [expectedReturnManual, setExpectedReturnManual] = React.useState<boolean>(
    !!initial?.expectedReturnManual
  );
  const [expectedReturn, setExpectedReturn] = React.useState<string>(
    initial?.expectedReturn ??
      (startDate && Number(daysEstimated) ? addDays(startDate, Number(daysEstimated)) : "")
  );

  // Restricciones (REINTEGRO/LIMITADA)
  const [capMinutes, setCapMinutes] = React.useState<number | "">(initial?.capMinutes ?? "");
  const [noSprint, setNoSprint] = React.useState<boolean>(!!initial?.noSprint);
  const [noChangeOfDirection, setNoChangeOfDirection] = React.useState<boolean>(
    !!initial?.noChangeOfDirection
  );
  const [gymOnly, setGymOnly] = React.useState<boolean>(!!initial?.gymOnly);
  const [noContact, setNoContact] = React.useState<boolean>(!!initial?.noContact);

  // Documentación
  const [notes, setNotes] = React.useState<string>(initial?.notes ?? "");
  const [medSignature, setMedSignature] = React.useState<string>(initial?.medSignature ?? "");

  // Plan / Protocolo
  const [protocolObjectives, setProtocolObjectives] = React.useState<string>(
    initial?.protocolObjectives ?? ""
  );
  const [protocolTasks, setProtocolTasks] = React.useState<string>(initial?.protocolTasks ?? "");
  const [protocolControls, setProtocolControls] = React.useState<string>(
    initial?.protocolControls ?? ""
  );
  const [protocolCriteria, setProtocolCriteria] = React.useState<string>(
    initial?.protocolCriteria ?? ""
  );

  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // --------- reglas UI ---------
  const isBAJA = status === "BAJA";
  const isLimitOrRTP = status === "LIMITADA" || status === "REINTEGRO";

  // ETR automático si no está manual y hay startDate + daysEstimated
  React.useEffect(() => {
    if (!expectedReturnManual) {
      if (startDate && Number(daysEstimated)) {
        setExpectedReturn(addDays(startDate, Number(daysEstimated)));
      } else {
        setExpectedReturn("");
      }
    }
  }, [startDate, daysEstimated, expectedReturnManual]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    // Validaciones mínimas
    if (!userId) return setErr("Seleccioná un jugador.");
    if (!status) return setErr("Seleccioná el estado.");

    if (isBAJA) {
      if (!leaveKind) return setErr("Indicá si es LESIÓN o ENFERMEDAD.");
      if (leaveKind === "LESION" && !diagnosis.trim()) return setErr("Para lesión, el diagnóstico es obligatorio.");
      if (leaveKind === "ENFERMEDAD" && !illSymptoms.trim() && !diagnosis.trim()) {
        return setErr("Para enfermedad, indicá síntomas o diagnóstico breve.");
      }
    }

    setSaving(true);
    try {
      const payload: Partial<Episode> & { userId: string; date: string } = {
        userId,
        date,
        status,
        // BAJA
        leaveStage: isBAJA && leaveStage ? leaveStage : null,
        leaveKind: isBAJA && leaveKind ? leaveKind : null,
        // LESIÓN
        diagnosis: isBAJA && leaveKind === "LESION" ? (diagnosis || null) : null,
        bodyPart: isBAJA && leaveKind === "LESION" ? (bodyPart || null) : null,
        laterality: isBAJA && leaveKind === "LESION" ? (laterality || null) : null,
        mechanism: isBAJA && leaveKind === "LESION" ? (mechanism || null) : null,
        severity: isBAJA && leaveKind === "LESION" ? (severity || null) : null,
        // ENFERMEDAD
        illSystem: isBAJA && leaveKind === "ENFERMEDAD" ? (illSystem || null) : null,
        illSymptoms: isBAJA && leaveKind === "ENFERMEDAD" ? (illSymptoms || null) : null,
        illContagious: isBAJA && leaveKind === "ENFERMEDAD" ? !!illContagious : null,
        illIsolationDays:
          isBAJA && leaveKind === "ENFERMEDAD" && illIsolationDays !== "" ? Number(illIsolationDays) : null,
        illAptitude: isBAJA && leaveKind === "ENFERMEDAD" ? (illAptitude || null) : null,
        feverMax: isBAJA && leaveKind === "ENFERMEDAD" && feverMax !== "" ? Number(feverMax) : null,
        // Cronología (min=max=días estimados)
        startDate: startDate || null,
        expectedReturn: expectedReturn || null,
        expectedReturnManual: expectedReturnManual || false,
        // Restricciones
        capMinutes: isLimitOrRTP && capMinutes !== "" ? Number(capMinutes) : null,
        noSprint: isLimitOrRTP ? noSprint : false,
        noChangeOfDirection: isLimitOrRTP ? noChangeOfDirection : false,
        gymOnly: isLimitOrRTP ? gymOnly : false,
        noContact: isLimitOrRTP ? noContact : false,
        // Documentación
        notes: notes || null,
        medSignature: medSignature || null,
        // Plan
        protocolObjectives: protocolObjectives || null,
        protocolTasks: protocolTasks || null,
        protocolControls: protocolControls || null,
        protocolCriteria: protocolCriteria || null,
      };

      await saveEpisode(payload);
      onSaved?.();
    } catch (e: any) {
      setErr(e?.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Jugador + Fecha */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Jugador</label>
          <div className="mt-1">
            <PlayerSelectMed value={userId} onChange={setUserId} disabled={!!initial?.id} />
          </div>
          <p className="mt-1 text-xs text-gray-500">El CT lo verá en lectura.</p>
        </div>

        <div>
          <label className="text-sm font-medium">Fecha del parte</label>
          <input
            type="date"
            className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {/* Estado */}
      <div className="grid gap-2">
        <label className="text-sm font-medium">Estado</label>
        <select
          className="h-10 w-full rounded-md border px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
        >
          <option value="BAJA">BAJA</option>
          <option value="REINTEGRO">REINTEGRO (RTP)</option>
          <option value="LIMITADA">LIMITADA</option>
          <option value="ALTA">ALTA</option>
        </select>
      </div>

      {/* Si BAJA => Estadio + Tipo */}
      {isBAJA && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Estadio de la baja</label>
            <select
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
              value={leaveStage}
              onChange={(e) => setLeaveStage(e.target.value as LeaveStage)}
            >
              <option value="">—</option>
              <option value="PARTIDO">Partido (competencia)</option>
              <option value="ENTRENAMIENTO">Entrenamiento</option>
              <option value="EXTRADEPORTIVO">Extra deportivo</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Condición</label>
            <select
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
              value={leaveKind}
              onChange={(e) => setLeaveKind(e.target.value as LeaveKind)}
            >
              <option value="">—</option>
              <option value="LESION">Lesión</option>
              <option value="ENFERMEDAD">Enfermedad</option>
            </select>
          </div>
        </div>
      )}

      {/* Lesión */}
      {isBAJA && leaveKind === "LESION" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Diagnóstico breve</label>
            <input
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder='Ej: "Distensión isquiotibial grado I"'
            />
          </div>

          <div>
            <label className="text-sm font-medium">Zona / Parte del cuerpo</label>
            <input
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
              value={bodyPart}
              onChange={(e) => setBodyPart(e.target.value)}
              placeholder="Ej: Isquiotibiales, tobillo..."
            />
          </div>

          <div>
            <label className="text-sm font-medium">Lateralidad</label>
            <select
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
              value={laterality}
              onChange={(e) => setLaterality(e.target.value as Laterality)}
            >
              <option value="">—</option>
              <option value="IZQ">Izq</option>
              <option value="DER">Der</option>
              <option value="BILATERAL">Bilateral</option>
              <option value="NA">N/A</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Mecanismo</label>
            <select
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
              value={mechanism}
              onChange={(e) => setMechanism(e.target.value as Mechanism)}
            >
              <option value="">—</option>
              <option value="SOBRECARGA">Sobrecarga</option>
              <option value="IMPACTO">Impacto</option>
              <option value="TORSION">Torsión</option>
              <option value="ESTIRAMIENTO">Estiramiento brusco</option>
              <option value="RECIDIVA">Recidiva</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Gravedad</label>
            <select
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as Severity)}
            >
              <option value="">—</option>
              <option value="LEVE">Leve</option>
              <option value="MODERADA">Moderada</option>
              <option value="SEVERA">Severa</option>
            </select>
          </div>
        </div>
      )}

      {/* Enfermedad */}
      {isBAJA && leaveKind === "ENFERMEDAD" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Sistema afectado</label>
            <select
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
              value={illSystem}
              onChange={(e) => setIllSystem(e.target.value as IllSystem)}
            >
              <option value="">—</option>
              <option value="RESPIRATORIO">Respiratorio</option>
              <option value="GASTROINTESTINAL">Gastrointestinal</option>
              <option value="OTORRINO">Otorrino</option>
              <option value="DERMATOLOGICO">Dermatológico</option>
              <option value="GENERAL">General</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Síntomas / Dx breve</label>
            <input
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
              value={illSymptoms}
              onChange={(e) => setIllSymptoms(e.target.value)}
              placeholder="Ej: fiebre, tos, malestar..."
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">¿Contagioso?</label>
            <input
              type="checkbox"
              checked={illContagious}
              onChange={(e) => setIllContagious(e.target.checked)}
            />
            {illContagious && (
              <input
                type="number"
                min={0}
                className="h-10 w-36 rounded-md border px-3 text-sm"
                placeholder="Días aislamiento"
                value={illIsolationDays}
                onChange={(e) => setIllIsolationDays(e.target.value === "" ? "" : Number(e.target.value))}
              />
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Apto para</label>
            <select
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
              value={illAptitude}
              onChange={(e) => setIllAptitude(e.target.value as IllAptitude)}
            >
              <option value="">—</option>
              <option value="SOLO_GIMNASIO">Solo gimnasio</option>
              <option value="AEROBICO_SUAVE">Aeróbico suave</option>
              <option value="CHARLAS_TACTICO">Charlas–táctico</option>
              <option value="NINGUNO">Ninguno</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Fiebre máxima (°C)</label>
            <input
              type="number"
              step="0.1"
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
              value={feverMax}
              onChange={(e) => setFeverMax(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
        </div>
      )}

      {/* Cronología */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-sm font-medium">Fecha de inicio</label>
          <input
            type="date"
            className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Días estimados</label>
          <input
            type="number"
            min={0}
            className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            placeholder="p.ej. 7"
            value={daysEstimated}
            onChange={(e) =>
              setDaysEstimated(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))
            }
          />
          <p className="mt-1 text-xs text-gray-500">
            Control: se usa como estimado único (min=max implícito).
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">ETR (fecha de retorno)</label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={expectedReturnManual}
                onChange={(e) => setExpectedReturnManual(e.target.checked)}
              />
              Editar manual
            </label>
          </div>
          <input
            type="date"
            className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            value={expectedReturn || ""}
            onChange={(e) => setExpectedReturn(e.target.value)}
            disabled={!expectedReturnManual}
          />
        </div>
      </div>

      {/* Restricciones (solo REINTEGRO / LIMITADA) */}
      {isLimitOrRTP && (
        <div className="grid gap-3 sm:grid-cols-5">
          <div>
            <label className="text-sm font-medium">Tope de minutos</label>
            <input
              type="number"
              min={0}
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
              value={capMinutes}
              onChange={(e) => setCapMinutes(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
            />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={noSprint} onChange={(e) => setNoSprint(e.target.checked)} />
            <span className="text-sm">Sin sprint</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={noChangeOfDirection}
              onChange={(e) => setNoChangeOfDirection(e.target.checked)}
            />
            <span className="text-sm">Sin cambios de dirección</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={gymOnly} onChange={(e) => setGymOnly(e.target.checked)} />
            <span className="text-sm">Solo gimnasio</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={noContact} onChange={(e) => setNoContact(e.target.checked)} />
            <span className="text-sm">Sin contacto</span>
          </label>
        </div>
      )}

      {/* Documentación */}
      <div className="grid gap-3">
        <div>
          <label className="text-sm font-medium">Informe médico</label>
          <textarea
            className="mt-1 w-full rounded-md border p-3 text-sm"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Evolución, tratamientos, observaciones…"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Firma médica (iniciales)</label>
          <input
            className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            value={medSignature}
            onChange={(e) => setMedSignature(e.target.value)}
            placeholder="Ej: Dr. XX"
          />
        </div>
      </div>

      {/* Plan semanal */}
      <div className="grid gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Plan / Protocolo semanal</label>
          <HelpTip text="Texto estructurado: Objetivos, Tareas clave, Controles d3/d7 y Criterios de progresión. Solo editable por Médico." />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-gray-600">Objetivos</label>
            <textarea
              className="mt-1 w-full rounded-md border p-2 text-sm"
              rows={3}
              value={protocolObjectives}
              onChange={(e) => setProtocolObjectives(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Tareas clave</label>
            <textarea
              className="mt-1 w-full rounded-md border p-2 text-sm"
              rows={3}
              value={protocolTasks}
              onChange={(e) => setProtocolTasks(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Controles (d3/d7)</label>
            <textarea
              className="mt-1 w-full rounded-md border p-2 text-sm"
              rows={3}
              value={protocolControls}
              onChange={(e) => setProtocolControls(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Criterios de progresión</label>
            <textarea
              className="mt-1 w-full rounded-md border p-2 text-sm"
              rows={3}
              value={protocolCriteria}
              onChange={(e) => setProtocolCriteria(e.target.value)}
            />
          </div>
        </div>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-10 rounded-md border px-4 text-sm hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="h-10 rounded-md bg-black px-4 text-sm text-white disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
