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

// util
function addDays(ymd: string, days: number) {
  const [y, m, d] = ymd.split("-").map((n) => Number(n));
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + days);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function diffDays(toYmd: string, fromYmd: string): number {
  const [y1, m1, d1] = toYmd.split("-").map(Number);
  const [y0, m0, d0] = fromYmd.split("-").map(Number);
  const a = new Date(y1, (m1 || 1) - 1, d1 || 1);
  const b = new Date(y0, (m0 || 1) - 1, d0 || 1);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24)));
}

type Props = {
  initial?: Partial<Episode>;
  defaultDate?: string;
  onCancel?: () => void;
  onSaved?: () => void;
};

export default function EpisodeForm({ initial, defaultDate, onCancel, onSaved }: Props) {
  const { saveEpisode } = useEpisodes(defaultDate || todayYMD());

  // --------- estado base ---------
  const [userId, setUserId] = React.useState(initial?.userId ?? "");
  const [status, setStatus] = React.useState<Status>((initial?.status as Status) ?? "LIMITADA");
  const [date, setDate] = React.useState<string>(initial?.date ?? (defaultDate || todayYMD()));

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

  // Cronología — “días estimados” solo UI (min/max ya no existen en DB)
  const [startDate, setStartDate] = React.useState<string>(initial?.startDate ?? date);
  const initialEstimated =
    initial?.expectedReturn && (initial?.startDate ?? startDate)
      ? diffDays(initial.expectedReturn, initial.startDate ?? startDate)
      : "";
  const [daysEstimated, setDaysEstimated] = React.useState<number | "">(initialEstimated);
  const [expectedReturn, setExpectedReturn] = React.useState<string>(
    initial?.expectedReturn ??
      (startDate && Number(daysEstimated) ? addDays(startDate, Number(daysEstimated)) : "")
  );
  const [expectedReturnManual, setExpectedReturnManual] = React.useState<boolean>(
    !!initial?.expectedReturnManual
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
  const [msg, setMsg] = React.useState<{ kind: "ok" | "err"; text: string } | null>(null);
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

  // ---------- Submit ----------
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    // Validaciones mínimas
    if (!userId) return setErr("Seleccioná un jugador.");
    if (!status) return setErr("Seleccioná el estado.");
    if (!medSignature.trim()) return setErr("La firma del médico es obligatoria.");

    if (isBAJA) {
      if (!leaveKind) return setErr("Indicá si es LESIÓN o ENFERMEDAD.");
      if (leaveKind === "LESION" && !diagnosis.trim())
        return setErr("Para lesión, el diagnóstico es obligatorio.");
      if (leaveKind === "ENFERMEDAD" && !illSymptoms.trim() && !diagnosis.trim())
        return setErr("Para enfermedad, indicá síntomas o diagnóstico breve.");
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
        // Cronología (ya sin daysMin/daysMax)
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
      setMsg({ kind: "ok", text: "Parte clínico guardado correctamente." });
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
            <PlayerSelectMed value={userId} onChange={setUserId} disabled={!!initial?.id || saving} />
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
            disabled={saving}
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
          disabled={saving}
        >
          <option value="BAJA">BAJA</option>
          <option value="REINTEGRO">REINTEGRO (RTP)</option>
          <option value="LIMITADA">LIMITADA</option>
          <option value="ALTA">ALTA</option>
        </select>
      </div>

      {/* Si BAJA => Estadio + Tipo */}
      {status === "BAJA" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Estadio de la baja</label>
            <select
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
              value={leaveStage}
              onChange={(e) => setLeaveStage(e.target.value as LeaveStage)}
              disabled={saving}
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
              disabled={saving}
            >
              <option value="">—</option>
              <option value="LESION">Lesión</option>
              <option value="ENFERMEDAD">Enfermedad</option>
            </select>
          </div>
        </div>
      )}

      {/* Lesión */}
      {status === "BAJA" && leaveKind === "LESION" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Diagnóstico breve</label>
            <input
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder='Ej: "Distensión isquiotibial grado I"'
              disabled={saving}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Zona / Parte del cuerpo</label>
            <input
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
              value={bodyPart}
              onChange={(e) => setBodyPart(e.target.value)}
              placeholder="Ej: Isquiotibiales, tobillo..."
              disabled={saving}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Lateralidad</label>
            <select
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
              value={laterality}
              onChange={(e) => setLaterality(e.target.value as Laterality)}
              disabled={saving}
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
              disabled={saving}
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
              disabled={saving}
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
      {status === "BAJA" && leaveKind === "ENFERMEDAD" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Sistema afectado</label>
            <select
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
              value={illSystem}
              onChange={(e) => setIllSystem(e.target.value as IllSystem)}
              disabled={saving}
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
              disabled={saving}
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">¿Contagioso?</label>
            <input
              type="checkbox"
              checked={illContagious}
              onChange={(e) => setIllContagious(e.target.checked)}
              disabled={saving}
            />
            {illContagious && (
              <input
                type="number"
                min={0}
                className="h-10 w-36 rounded-md border px-3 text-sm"
                placeholder="Días aislamiento"
                value={illIsolationDays}
                onChange={(e) => setIllIsolationDays(e.target.value === "" ? "" : Number(e.target.value))}
                disabled={saving}
              />
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Apto para</label>
            <select
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
              value={illAptitude}
              onChange={(e) => setIllAptitude(e.target.value as IllAptitude)}
              disabled={saving}
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
              disabled={saving}
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
            disabled={saving}
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
            disabled={saving}
          />
          <p className="mt-1 text-xs text-gray-500">
            Se usa para calcular el ETR. (min/max ya no se guardan).
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
                disabled={saving}
              />
              Editar manual
            </label>
          </div>
          <input
            type="date"
            className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            value={expectedReturn || ""}
            onChange={(e) => setExpectedReturn(e.target.value)}
            disabled={!expectedReturnManual || saving}
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
              disabled={saving}
            />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={noSprint} onChange={(e) => setNoSprint(e.target.checked)} disabled={saving} />
            <span className="text-sm">Sin sprint</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={noChangeOfDirection}
              onChange={(e) => setNoChangeOfDirection(e.target.checked)}
              disabled={saving}
            />
            <span className="text-sm">Sin cambios de dirección</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={gymOnly} onChange={(e) => setGymOnly(e.target.checked)} disabled={saving} />
            <span className="text-sm">Solo gimnasio</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={noContact} onChange={(e) => setNoContact(e.target.checked)} disabled={saving} />
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
            disabled={saving}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Firma médica (iniciales)</label>
          <input
            className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            value={medSignature}
            onChange={(e) => setMedSignature(e.target.value)}
            placeholder="Ej: Dr. XX"
            disabled={saving}
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
              disabled={saving}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Tareas clave</label>
            <textarea
              className="mt-1 w-full rounded-md border p-2 text-sm"
              rows={3}
              value={protocolTasks}
              onChange={(e) => setProtocolTasks(e.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Controles (d3/d7)</label>
            <textarea
              className="mt-1 w-full rounded-md border p-2 text-sm"
              rows={3}
              value={protocolControls}
              onChange={(e) => setProtocolControls(e.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Criterios de progresión</label>
            <textarea
              className="mt-1 w-full rounded-md border p-2 text-sm"
              rows={3}
              value={protocolCriteria}
              onChange={(e) => setProtocolCriteria(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
      {msg && (
        <div
          className={`rounded-md p-3 text-sm ${
            msg.kind === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-10 rounded-md border px-4 text-sm hover:bg-gray-50"
          disabled={saving}
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
