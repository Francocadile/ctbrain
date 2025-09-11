// src/app/med/injuries/page.tsx
"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import PlayerSelectMed from "@/components/PlayerSelectMed";
import HelpTip from "@/components/HelpTip"; // ✅ default export

type Status = "BAJA" | "REINTEGRO" | "LIMITADA" | "ALTA";
type LeaveStage = "PARTIDO" | "ENTRENAMIENTO" | "EXTRADEPORTIVO";
type LeaveKind = "LESION" | "ENFERMEDAD";
type Laterality = "IZQ" | "DER" | "BILATERAL" | "NA";
type Mechanism = "SOBRECARGA" | "IMPACTO" | "TORSION" | "ESTIRAMIENTO" | "RECIDIVA" | "OTRO";
type Severity = "LEVE" | "MODERADA" | "SEVERA";

// util fecha YYYY-MM-DD
function todayYMD() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
function ymdToDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  x.setHours(0, 0, 0, 0);
  return x;
}
function toYMD(d: Date) {
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export default function MedInjuriesPage() {
  // selección de jugador
  const [userId, setUserId] = React.useState("");

  // estado clínico
  const [status, setStatus] = React.useState<Status>("LIMITADA");

  // si BAJA -> estadio y tipo condición
  const [leaveStage, setLeaveStage] = React.useState<LeaveStage>("ENTRENAMIENTO");
  const [leaveKind, setLeaveKind] = React.useState<LeaveKind>("LESION");

  // subcampos LESION
  const [diagnosis, setDiagnosis] = React.useState("");
  const [bodyPart, setBodyPart] = React.useState("");
  const [laterality, setLaterality] = React.useState<Laterality>("NA");
  const [mechanism, setMechanism] = React.useState<Mechanism>("SOBRECARGA");
  const [severity, setSeverity] = React.useState<Severity>("LEVE");

  // subcampos ENFERMEDAD
  const [illSystem, setIllSystem] = React.useState("GENERAL");
  const [illSymptoms, setIllSymptoms] = React.useState("");
  const [illContagiousUI, setIllContagiousUI] = React.useState<"SI" | "NO">("NO");
  const [illIsolationDaysUI, setIllIsolationDaysUI] = React.useState<number | "">("");
  const [illAptUI, setIllAptUI] = React.useState<"GIMNASIO" | "AEROBICO" | "TACTICO" | "NINGUNO">("GIMNASIO");
  const [feverMaxUI, setFeverMaxUI] = React.useState<number | "">("");

  // cronología
  const [startDate, setStartDate] = React.useState<string>(todayYMD());
  const [daysMin, setDaysMin] = React.useState<number | "">("");
  const [daysMax, setDaysMax] = React.useState<number | "">("");
  const [expectedReturn, setExpectedReturn] = React.useState<string>(""); // editable
  const [expectedReturnManual, setExpectedReturnManual] = React.useState(false);

  // restricciones (solo para REINTEGRO / LIMITADA)
  const [noSprint, setNoSprint] = React.useState(false);
  const [noChangeOfDirection, setNoChangeOfDirection] = React.useState(false);
  const [noContact, setNoContact] = React.useState(false);
  const [gymOnly, setGymOnly] = React.useState(false);
  const [capMinutes, setCapMinutes] = React.useState<number | "">("");

  // documentación
  const [notes, setNotes] = React.useState("");
  const [medSignature, setMedSignature] = React.useState("");

  // protocolo
  const [protocolObjectives, setProtocolObjectives] = React.useState("");
  const [protocolTasks, setProtocolTasks] = React.useState("");
  const [protocolControls, setProtocolControls] = React.useState("");
  const [protocolCriteria, setProtocolCriteria] = React.useState("");

  // ui
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // reglas: autocalcular ETR cuando cambian startDate/daysMin/daysMax si el usuario no lo tocó manualmente
  React.useEffect(() => {
    if (expectedReturnManual) return;
    if (!startDate) return;
    if (daysMax === "") return;
    const base = ymdToDate(startDate);
    const maxN = typeof daysMax === "number" ? daysMax : parseInt(String(daysMax) || "0", 10);
    if (Number.isFinite(maxN)) {
      const etr = addDays(base, maxN as number);
      setExpectedReturn(toYMD(etr));
    }
  }, [startDate, daysMax, expectedReturnManual]);

  const isBAJA = status === "BAJA";
  const isLimitedOrRTP = status === "LIMITADA" || status === "REINTEGRO";
  const restrictionsDisabled = !isLimitedOrRTP;

  // Mapea aptitud UI -> enum de la DB
  function mapIllAptUIToEnum(v: typeof illAptUI) {
    switch (v) {
      case "GIMNASIO":
        return "SOLO_GIMNASIO";
      case "AEROBICO":
        return "AEROBICO_SUAVE";
      case "TACTICO":
        return "CHARLAS_TACTICO";
      default:
        return "NINGUNO";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!userId) {
      setMsg({ kind: "err", text: "Seleccioná un jugador." });
      return;
    }
    if (!medSignature.trim()) {
      setMsg({ kind: "err", text: "La firma del médico es obligatoria." });
      return;
    }

    try {
      setSaving(true);

      const payload: Record<string, any> = {
        userId,
        date: todayYMD(), // parte del día (la API lo normaliza a startOfDay)
        status, // BAJA | REINTEGRO | LIMITADA | ALTA
        notes,
        medSignature,
        // protocolo
        protocolObjectives: protocolObjectives || null,
        protocolTasks: protocolTasks || null,
        protocolControls: protocolControls || null,
        protocolCriteria: protocolCriteria || null,
      };

      // BAJA -> estadio + tipo de condición + cronología
      if (isBAJA) {
        payload.leaveStage = leaveStage; // PARTIDO | ENTRENAMIENTO | EXTRADEPORTIVO
        payload.leaveKind = leaveKind; // LESION | ENFERMEDAD

        if (leaveKind === "LESION") {
          payload.diagnosis = diagnosis || null;
          payload.bodyPart = bodyPart || null;
          payload.laterality = laterality || null;
          payload.mechanism = mechanism || null;
          payload.severity = severity || null;
          // limpia campos de enfermedad
          payload.illSystem = null;
          payload.illSymptoms = null;
          payload.illContagious = null;
          payload.illIsolationDays = null;
          payload.illAptitude = null;
          payload.feverMax = null;
        } else {
          // ENFERMEDAD
          payload.diagnosis = diagnosis || null; // breve visible
          payload.illSystem = illSystem || null;
          payload.illSymptoms = illSymptoms || null;
          payload.illContagious = illContagiousUI === "SI";
          payload.illIsolationDays =
            illIsolationDaysUI === "" ? null : Number(illIsolationDaysUI);
          payload.illAptitude = mapIllAptUIToEnum(illAptUI);
          payload.feverMax = feverMaxUI === "" ? null : Number(feverMaxUI);
          // limpia campos de lesión
          payload.bodyPart = null;
          payload.laterality = null;
          payload.mechanism = null;
          payload.severity = null;
        }

        // cronología
        payload.startDate = startDate ? startDate : todayYMD();
        payload.daysMin = daysMin === "" ? null : Number(daysMin);
        payload.daysMax = daysMax === "" ? null : Number(daysMax);
        payload.expectedReturn = expectedReturn || null;
        payload.expectedReturnManual = !!expectedReturnManual;
      }

      // REINTEGRO / LIMITADA -> restricciones
      if (isLimitedOrRTP) {
        payload.noSprint = !!noSprint;
        payload.noChangeOfDirection = !!noChangeOfDirection;
        payload.noContact = !!noContact;
        payload.gymOnly = !!gymOnly;
        payload.capMinutes = capMinutes === "" ? null : Number(capMinutes);
        // limpia campos de BAJA para no pisar con nulos si no corresponde
        payload.leaveStage = null;
        payload.leaveKind = null;
        payload.diagnosis = diagnosis ? diagnosis : null; // opcionalmente deja breve visible
      }

      const res = await fetch("/api/med/clinical", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Error HTTP ${res.status}`);
      }

      setMsg({ kind: "ok", text: "Parte clínico guardado correctamente." });
    } catch (err: any) {
      setMsg({ kind: "err", text: err?.message || "No se pudo guardar." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-[70vh] px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Parte clínico — Médico</h1>
        <p className="mt-1 text-sm text-gray-600">
          Vos editás; el CT lo ve en lectura con semáforo y ETR.
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Atajo:{" "}
          <a
            href="/api/med/users/players"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            ver jugadores (JSON)
          </a>
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border bg-white p-5 shadow-sm space-y-6"
      >
        {/* Jugador */}
        <section className="grid gap-2">
          <label className="text-sm font-medium">Jugador</label>
          <PlayerSelectMed value={userId} onChange={setUserId} disabled={saving} />
          <p className="text-xs text-gray-500">Solo aparecen usuarios con rol JUGADOR.</p>
        </section>

        {/* Estado */}
        <section className="grid gap-2">
          <label className="text-sm font-medium">
            Estado{" "}
            <HelpTip text="Define disponibilidad general. Regla: BAJA (rojo), REINTEGRO/LIMITADA (amarillo), ALTA (verde)." />
          </label>
          <select
            className="h-10 w-full rounded-md border px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
            disabled={!userId || saving}
          >
            <option value="BAJA">BAJA</option>
            <option value="REINTEGRO">REINTEGRO (RTP)</option>
            <option value="LIMITADA">LIMITADA</option>
            <option value="ALTA">ALTA</option>
          </select>
        </section>

        {/* Si BAJA */}
        {status === "BAJA" && (
          <>
            <section className="grid gap-2">
              <label className="text-sm font-medium">Estadio de la baja</label>
              <select
                className="h-10 w-full rounded-md border px-3 text-sm"
                value={leaveStage}
                onChange={(e) => setLeaveStage(e.target.value as LeaveStage)}
                disabled={saving}
              >
                <option value="PARTIDO">Partido (competencia)</option>
                <option value="ENTRENAMIENTO">Entrenamiento (práctica)</option>
                <option value="EXTRADEPORTIVO">Extra deportivo</option>
              </select>
            </section>

            <section className="grid gap-2">
              <label className="text-sm font-medium">Tipo de condición</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="leavekind"
                    value="LESION"
                    checked={leaveKind === "LESION"}
                    onChange={() => setLeaveKind("LESION")}
                    disabled={saving}
                  />
                  Lesión
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="leavekind"
                    value="ENFERMEDAD"
                    checked={leaveKind === "ENFERMEDAD"}
                    onChange={() => setLeaveKind("ENFERMEDAD")}
                    disabled={saving}
                  />
                  Enfermedad
                </label>
              </div>
            </section>

            {/* Campos de LESION */}
            {leaveKind === "LESION" && (
              <section className="grid gap-3 border rounded-lg p-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">
                    Diagnóstico breve <HelpTip text="Ej: Distensión isquiotibial grado I." />
                  </label>
                  <input
                    className="h-10 w-full rounded-md border px-3 text-sm"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="Texto corto"
                    disabled={saving}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Zona / Parte del cuerpo</label>
                  <input
                    className="h-10 w-full rounded-md border px-3 text-sm"
                    value={bodyPart}
                    onChange={(e) => setBodyPart(e.target.value)}
                    placeholder="Ej: Isquiotibiales, tobillo, aductor…"
                    disabled={saving}
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Lateralidad</label>
                    <select
                      className="h-10 w-full rounded-md border px-3 text-sm"
                      value={laterality}
                      onChange={(e) => setLaterality(e.target.value as Laterality)}
                      disabled={saving}
                    >
                      <option value="IZQ">Izq</option>
                      <option value="DER">Der</option>
                      <option value="BILATERAL">Bilateral</option>
                      <option value="NA">N/A</option>
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Mecanismo</label>
                    <select
                      className="h-10 w-full rounded-md border px-3 text-sm"
                      value={mechanism}
                      onChange={(e) => setMechanism(e.target.value as Mechanism)}
                      disabled={saving}
                    >
                      <option value="SOBRECARGA">Sobrecarga</option>
                      <option value="IMPACTO">Impacto</option>
                      <option value="TORSION">Torsión</option>
                      <option value="ESTIRAMIENTO">Estiramiento brusco</option>
                      <option value="RECIDIVA">Recidiva</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Gravedad</label>
                    <select
                      className="h-10 w-full rounded-md border px-3 text-sm"
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as Severity)}
                      disabled={saving}
                    >
                      <option value="LEVE">Leve</option>
                      <option value="MODERADA">Moderada</option>
                      <option value="SEVERA">Severa</option>
                    </select>
                  </div>
                </div>
              </section>
            )}

            {/* Campos de ENFERMEDAD */}
            {leaveKind === "ENFERMEDAD" && (
              <section className="grid gap-3 border rounded-lg p-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Diagnóstico breve</label>
                  <input
                    className="h-10 w-full rounded-md border px-3 text-sm"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="Ej: Gripe, gastroenteritis…"
                    disabled={saving}
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Sistema afectado</label>
                    <select
                      className="h-10 w-full rounded-md border px-3 text-sm"
                      value={illSystem}
                      onChange={(e) => setIllSystem(e.target.value)}
                      disabled={saving}
                    >
                      <option value="RESPIRATORIO">Respiratorio</option>
                      <option value="GASTROINTESTINAL">Gastrointestinal</option>
                      <option value="OTORRINO">Otorrino</option>
                      <option value="DERMATOLOGICO">Dermatológico</option>
                      <option value="GENERAL">General</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium">¿Contagioso?</label>
                    <select
                      className="h-10 w-full rounded-md border px-3 text-sm"
                      value={illContagiousUI}
                      onChange={(e) => setIllContagiousUI(e.target.value as "SI" | "NO")}
                      disabled={saving}
                    >
                      <option value="NO">No</option>
                      <option value="SI">Sí</option>
                    </select>
                  </div>
                </div>

                {illContagiousUI === "SI" && (
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Recomendación de aislamiento (días)</label>
                    <input
                      type="number"
                      min={0}
                      className="h-10 w-full rounded-md border px-3 text-sm"
                      value={illIsolationDaysUI}
                      onChange={(e) => setIllIsolationDaysUI(e.target.value === "" ? "" : Number(e.target.value))}
                      disabled={saving}
                    />
                  </div>
                )}

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Síntomas clave</label>
                  <input
                    className="h-10 w-full rounded-md border px-3 text-sm"
                    value={illSymptoms}
                    onChange={(e) => setIllSymptoms(e.target.value)}
                    placeholder="Texto corto"
                    disabled={saving}
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Apto para</label>
                    <select
                      className="h-10 w-full rounded-md border px-3 text-sm"
                      value={illAptUI}
                      onChange={(e) => setIllAptUI(e.target.value as any)}
                      disabled={saving}
                    >
                      <option value="GIMNASIO">Solo gimnasio</option>
                      <option value="AEROBICO">Aeróbico suave</option>
                      <option value="TACTICO">Charlas–táctico</option>
                      <option value="NINGUNO">Ninguno</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Fiebre máxima (°C, opcional)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="h-10 w-full rounded-md border px-3 text-sm"
                      value={feverMaxUI}
                      onChange={(e) => setFeverMaxUI(e.target.value === "" ? "" : Number(e.target.value))}
                      disabled={saving}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Cronología */}
            <section className="grid gap-3 border rounded-lg p-4">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Fecha de inicio</label>
                  <input
                    type="date"
                    className="h-10 w-full rounded-md border px-3 text-sm"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Días estimados (mín)</label>
                  <input
                    type="number"
                    min={0}
                    className="h-10 w-full rounded-md border px-3 text-sm"
                    value={daysMin}
                    onChange={(e) => setDaysMin(e.target.value === "" ? "" : Number(e.target.value))}
                    disabled={saving}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Días estimados (máx)</label>
                  <input
                    type="number"
                    min={0}
                    className="h-10 w-full rounded-md border px-3 text-sm"
                    value={daysMax}
                    onChange={(e) => setDaysMax(e.target.value === "" ? "" : Number(e.target.value))}
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="grid gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    ETR (fecha estimada de retorno)
                  </label>
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
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  value={expectedReturn || ""}
                  onChange={(e) => setExpectedReturn(e.target.value)}
                  disabled={!expectedReturnManual || saving}
                />
              </div>
            </section>
          </>
        )}

        {/* Restricciones (solo REINTEGRO / LIMITADA) */}
        {isLimitedOrRTP && (
          <section className="grid gap-3 border rounded-lg p-4">
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={noSprint}
                  onChange={(e) => setNoSprint(e.target.checked)}
                  disabled={restrictionsDisabled || saving}
                />
                Sin sprint
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={noChangeOfDirection}
                  onChange={(e) => setNoChangeOfDirection(e.target.checked)}
                  disabled={restrictionsDisabled || saving}
                />
                Sin cambios de dirección
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={noContact}
                  onChange={(e) => setNoContact(e.target.checked)}
                  disabled={restrictionsDisabled || saving}
                />
                Sin contacto
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={gymOnly}
                  onChange={(e) => setGymOnly(e.target.checked)}
                  disabled={restrictionsDisabled || saving}
                />
                Solo gimnasio
              </label>
            </div>

            <div className="grid gap-2 sm:max-w-xs">
              <label className="text-sm font-medium">Tope de minutos</label>
              <input
                type="number"
                min={0}
                className="h-10 w-full rounded-md border px-3 text-sm"
                value={capMinutes}
                onChange={(e) => setCapMinutes(e.target.value === "" ? "" : Number(e.target.value))}
                disabled={restrictionsDisabled || saving}
              />
            </div>
          </section>
        )}

        {/* Documentación y Firma */}
        <section className="grid gap-3 border rounded-lg p-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Informe médico (libre)</label>
            <textarea
              className="min-h-[90px] w-full rounded-md border p-3 text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Evolución, tratamiento, observaciones…"
              disabled={saving}
            />
          </div>

          <div className="grid gap-2 sm:max-w-sm">
            <label className="text-sm font-medium">Firma / Iniciales del médico (obligatorio)</label>
            <input
              className="h-10 w-full rounded-md border px-3 text-sm"
              value={medSignature}
              onChange={(e) => setMedSignature(e.target.value)}
              placeholder='Ej: "Dr. XX"'
              disabled={saving}
            />
          </div>
        </section>

        {/* Protocolo semanal */}
        <section className="grid gap-3 border rounded-lg p-4">
          <h3 className="font-semibold">Plan / Protocolo semanal</h3>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Objetivos</label>
            <textarea
              className="min-h-[70px] w-full rounded-md border p-3 text-sm"
              value={protocolObjectives}
              onChange={(e) => setProtocolObjectives(e.target.value)}
              placeholder="Objetivos de la semana…"
              disabled={saving}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Tareas clave</label>
            <textarea
              className="min-h-[70px] w-full rounded-md border p-3 text-sm"
              value={protocolTasks}
              onChange={(e) => setProtocolTasks(e.target.value)}
              placeholder="Ejercicios, sesiones, cargas…"
              disabled={saving}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Controles (día 3/7)</label>
            <textarea
              className="min-h-[70px] w-full rounded-md border p-3 text-sm"
              value={protocolControls}
              onChange={(e) => setProtocolControls(e.target.value)}
              placeholder="Qué revisar y cuándo…"
              disabled={saving}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Criterios de progresión</label>
            <textarea
              className="min-h-[70px] w-full rounded-md border p-3 text-sm"
              value={protocolCriteria}
              onChange={(e) => setProtocolCriteria(e.target.value)}
              placeholder="Criterios para avanzar de etapa…"
              disabled={saving}
            />
          </div>
        </section>

        {/* Mensajes */}
        {msg && (
          <div
            className={`rounded-md p-3 text-sm ${
              msg.kind === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* Acciones */}
        <div className="pt-2 flex items-center gap-3">
          <button
            type="submit"
            className="h-10 rounded-md bg-black px-4 text-white disabled:opacity-50"
            disabled={!userId || saving}
          >
            {saving ? "Guardando…" : "Guardar parte"}
          </button>

          <button
            type="button"
            className="h-10 rounded-md border px-4 disabled:opacity-50"
            disabled={saving}
            onClick={() => {
              setMsg({ kind: "ok", text: "Duplicado desde ayer (demo). Próximamente real con fetch)." });
            }}
          >
            Duplicar desde ayer
          </button>
        </div>
      </form>
    </main>
  );
}
