"use client";

import * as React from "react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import HelpTip from "@/components/HelpTip";

/* ===== Tipos ===== */
type InjuryStatus = "ACTIVO" | "REINTEGRO" | "ALTA";
type Availability = "FULL" | "LIMITADA" | "INDIVIDUAL" | "REHAB" | "DESCANSO";
type Laterality = "IZQ" | "DER" | "BIL" | "NA";
type Severity = "LEVE" | "MODERADA" | "SEVERA";
type ClinicalState = "DISPONIBLE" | "LIMITADO" | "BAJA";
type DropType = "COMPETITIVA" | "ENTRENAMIENTO" | "PARCIAL";

type InjuryRow = {
  id: string;
  userId: string;
  userName: string;
  date: string;
  status: InjuryStatus;
  bodyPart: string | null;
  laterality: Laterality | null;
  mechanism: string | null;
  severity: Severity | null;
  expectedReturn: string | null;
  availability: Availability | null;
  capMinutes?: number | null;
  noSprint?: boolean | null;
  noChangeOfDirection?: boolean | null;
  gymOnly?: boolean | null;
  noContact?: boolean | null;
};

type PlayerOpt = { id: string; label: string };

function toYMD(d: Date) { return d.toISOString().slice(0, 10); }

/* ===== Listas ===== */
const BODY_PARTS = [
  "Tobillo","Rodilla","Isquiotibial","Cuádriceps","Aductores",
  "Gemelo/Sóleo","Cadera","Lumbar","Cervical","Hombro","Muñeca","Otra"
];

const MECHANISMS = ["Sobrecarga","Impacto","Torsión","Estiramiento","Golpe","Caída","Otro"];

/* =========================================================
   Hook de jugadores (maneja 404/HTML/errores + fallback)
   ========================================================= */
function usePlayers() {
  const [players, setPlayers] = useState<PlayerOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackAll, setFallbackAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFallbackAll(false);
    try {
      const res = await fetch("/api/users/players", { cache: "no-store" });

      // Si la ruta no existe o devuelve error → mostramos mensaje
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} ${msg ? `- ${msg.slice(0,120)}` : ""}`);
      }

      const fb = res.headers.get("x-fallback-all") === "1";
      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json") ? await res.json() : [];

      if (!Array.isArray(data)) {
        throw new Error("Respuesta inesperada del servidor.");
      }

      setPlayers(
        data.map((u: any) => ({
          id: String(u.id),
          label: String(u.name || u.email || u.id),
        }))
      );
      setFallbackAll(fb);
    } catch (e: any) {
      console.error("usePlayers load error:", e);
      setError("No se pudo cargar la lista de jugadores.");
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { players, loading, error, fallbackAll, reload: load };
}

/* ===== Wrapper Suspense ===== */
export default function MedInjuriesClient() {
  return (
    <Suspense fallback={<div className="p-4 text-gray-500">Cargando…</div>}>
      <Inner />
    </Suspense>
  );
}

/* ================== Contenido ================== */
function Inner() {
  const router = useRouter();
  const search = useSearchParams();
  const { players, loading: loadingPlayers, error: playersError, fallbackAll, reload } = usePlayers();

  const today = useMemo(() => toYMD(new Date()), []);
  const [date, setDate] = useState<string>(search.get("date") || today);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<InjuryRow[]>([]);
  const [q, setQ] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);

  // Form
  const [clinicalState, setClinicalState] = useState<ClinicalState>("LIMITADO");
  const [bodyPart, setBodyPart] = useState<string>("");
  const [laterality, setLaterality] = useState<Laterality>("NA");
  const [mechanism, setMechanism] = useState<string>("");
  const [severity, setSeverity] = useState<Severity>("LEVE");
  const [expectedReturn, setExpectedReturn] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  const [diagnosis, setDiagnosis] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [daysMin, setDaysMin] = useState<number | "">("");
  const [daysMax, setDaysMax] = useState<number | "">("");
  const [dropType, setDropType] = useState<DropType>("ENTRENAMIENTO");
  const [report, setReport] = useState<string>("");
  const [signedBy, setSignedBy] = useState<string>("");

  const [noSprint, setNoSprint] = useState<boolean>(false);
  const [noChangeOfDirection, setNoChangeOfDirection] = useState<boolean>(false);
  const [gymOnly, setGymOnly] = useState<boolean>(false);
  const [noContact, setNoContact] = useState<boolean>(false);
  const [capMinutes, setCapMinutes] = useState<number | "">("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(
      (r) =>
        r.userName.toLowerCase().includes(t) ||
        (r.bodyPart || "").toLowerCase().includes(t) ||
        (r.mechanism || "").toLowerCase().includes(t)
    );
  }, [rows, q]);

  const loadDay = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/injuries?date=${date}`, { cache: "no-store" });
      const data = res.ok ? await res.json() : [];
      setRows(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    const url = `/med/injuries?date=${date}`;
    router.replace(url as unknown as Route);
    loadDay();
  }, [date, router, loadDay]);

  useEffect(() => {
    if (daysMin === "" && daysMax === "") return;
    const base = startDate ? new Date(startDate) : new Date(date);
    const avg =
      (Number(daysMin || 0) + Number(daysMax || 0 || daysMin || 0)) / (daysMax ? 2 : 1);
    const d = new Date(base);
    d.setDate(d.getDate() + Math.round(avg));
    setExpectedReturn(toYMD(d));
  }, [daysMin, daysMax, startDate, date]);

  function resetForm() {
    setEditingId(null);
    setClinicalState("LIMITADO");
    setBodyPart("");
    setLaterality("NA");
    setMechanism("");
    setSeverity("LEVE");
    setExpectedReturn("");
    setUserId("");
    setDiagnosis("");
    setStartDate("");
    setDaysMin("");
    setDaysMax("");
    setDropType("ENTRENAMIENTO");
    setReport("");
    setSignedBy("");
    setNoSprint(false);
    setNoChangeOfDirection(false);
    setGymOnly(false);
    setNoContact(false);
    setCapMinutes("");
  }

  function fillFormFromRow(r: InjuryRow) {
    setEditingId(r.id);
    setUserId(r.userId);
    setBodyPart(r.bodyPart || "");
    setLaterality((r.laterality || "NA") as Laterality);
    setMechanism(r.mechanism || "");
    setSeverity((r.severity || "LEVE") as Severity);
    setExpectedReturn(r.expectedReturn || "");
    const avail = r.availability || "LIMITADA";
    if (avail === "FULL") setClinicalState("DISPONIBLE");
    else if (avail === "REHAB" || avail === "DESCANSO") setClinicalState("BAJA");
    else setClinicalState("LIMITADO");
    setNoSprint(!!r.noSprint);
    setNoChangeOfDirection(!!r.noChangeOfDirection);
    setGymOnly(!!r.gymOnly);
    setNoContact(!!r.noContact);
    setCapMinutes(r.capMinutes ?? "");
    setDiagnosis("");
    setReport("");
    setSignedBy("");
  }

  async function save() {
    if (!userId) return alert("Elegí un jugador.");
    if (!signedBy.trim()) return alert("Ingresá firma/iniciales del médico.");
    setSaving(true);
    try {
      let availability: Availability = "LIMITADA";
      let status: InjuryStatus = "ACTIVO";
      if (clinicalState === "DISPONIBLE") { availability = "FULL"; status = "ALTA"; }
      else if (clinicalState === "BAJA") { availability = "REHAB"; status = "ACTIVO"; }

      const notesLines: string[] = [];
      if (diagnosis) notesLines.push(`Dx: ${diagnosis}`);
      if (startDate) notesLines.push(`Inicio: ${startDate}`);
      if (daysMin !== "" || daysMax !== "") {
        const r1 = daysMin === "" ? "?" : String(daysMin);
        const r2 = daysMax === "" ? r1 : String(daysMax);
        notesLines.push(`Estimación: ${r1}-${r2} días`);
      }
      notesLines.push(`Tipo de baja: ${clinicalState}${clinicalState === "BAJA" ? ` (${dropType})` : ""}`);
      if (report) notesLines.push(`Informe: ${report}`);
      notesLines.push(`Firma: ${signedBy}`);

      const payload = {
        userId,
        date,
        status,
        bodyPart: bodyPart || null,
        laterality,
        mechanism: mechanism || null,
        severity,
        expectedReturn: expectedReturn || null,
        availability,
        capMinutes: capMinutes === "" ? null : Number(capMinutes),
        noSprint: clinicalState === "LIMITADO" ? !!noSprint : false,
        noChangeOfDirection: clinicalState === "LIMITADO" ? !!noChangeOfDirection : false,
        gymOnly: clinicalState === "LIMITADO" ? !!gymOnly : false,
        noContact: clinicalState === "LIMITADO" ? !!noContact : false,
        note: notesLines.join(" | "),
      };

      const res = await fetch("/api/injuries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      resetForm();
      await loadDay();
    } catch (e: any) {
      alert(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(id: string) {
    if (!confirm("¿Eliminar la entrada del día?")) return;
    try {
      const res = await fetch("/api/injuries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(await res.text());
      if (editingId === id) resetForm();
      await loadDay();
    } catch (e: any) {
      alert(e?.message || "Error al eliminar");
    }
  }

  function badgeFor(r: InjuryRow) {
    const avail = r.availability || "LIMITADA";
    let color = "bg-yellow-100 text-yellow-800";
    let text = "Limitado";
    if (avail === "FULL") { color = "bg-green-100 text-green-800"; text = "Disponible"; }
    if (avail === "REHAB" || avail === "DESCANSO") { color = "bg-red-100 text-red-800"; text = "Baja"; }
    return <span className={`px-2 py-0.5 rounded text-[11px] ${color}`}>{text}</span>;
  }

  function exportCSV() {
    const header = [
      "date","userName","estado","zona","lat","mecanismo","gravedad",
      "disponibilidad","ETR","cap","noSprint","noChangeDir","gymOnly","noContact"
    ];
    const lines = [header.join(",")];
    rows.forEach((r) => {
      const line = [
        r.date, r.userName, r.status || "", r.bodyPart || "", r.laterality || "",
        r.mechanism || "", r.severity || "", r.availability || "", r.expectedReturn || "",
        r.capMinutes ?? "", r.noSprint ? "1":"0", r.noChangeOfDirection ? "1":"0",
        r.gymOnly ? "1":"0", r.noContact ? "1":"0",
      ].map((v)=>`${String(v).replace(/"/g,'""')}`).map((v)=>`"${v}"`).join(",");
      lines.push(line);
    });
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(lines.join("\n"));
    a.download = `lesiones_${date}.csv`;
    a.click();
  }

  const restrictionsDisabled = clinicalState !== "LIMITADO";

  return (
    <div className="p-6 space-y-4">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">
            Cargar parte clínico — Médico{" "}
            <HelpTip text="Carga/edición del parte diario. El CT lo ve en modo lectura para planificar." />
          </h1>
          <p className="text-xs text-gray-500">
            Fecha seleccionada: <b>{date}</b> • {rows.length} registro(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" className="rounded-md border px-2 py-1.5 text-sm"
            value={date} onChange={(e)=>setDate(e.target.value)} />
          <button onClick={loadDay} className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50">Recargar</button>
          <button onClick={exportCSV} className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50">Exportar CSV</button>
        </div>
      </header>

      {/* Estados del selector de jugadores */}
      {playersError ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          No se pudo cargar la lista de jugadores.{" "}
          <button onClick={reload} className="underline">Reintentar</button>
        </div>
      ) : fallbackAll ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No hay usuarios con rol <b>JUGADOR</b>. Mostrando <b>todos</b> como fallback.
          Asigná el rol en <i>Usuarios</i> y tocá{" "}
          <button onClick={reload} className="underline">Recargar</button>.
        </div>
      ) : null}

      {/* --- Resto del formulario y tabla idénticos a tu versión anterior --- */}
      {/* (lo dejo completo para que puedas pegar sin comparar) */}

      <section className="rounded-xl border bg-white p-3 space-y-2">
        <div className="text-[12px] font-semibold uppercase">
          Parte diario{" "}
          <HelpTip text="Elegí jugador y completá los campos. Si ya existe un parte para el día, se actualiza." />
        </div>

        <div className="grid md:grid-cols-6 gap-2">
          <div className="flex items-center gap-2 md:col-span-2">
            <select
              className="flex-1 rounded-md border px-2 py-1 text-sm"
              value={userId}
              onChange={(e)=>setUserId(e.target.value)}
              disabled={loadingPlayers}
            >
              <option value="">
                {loadingPlayers
                  ? "Cargando jugadores..."
                  : players.length === 0
                  ? "Sin jugadores disponibles"
                  : "Jugador (nombre o email)"}
              </option>
              {players.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <button onClick={reload} className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50">
              Recargar
            </button>
          </div>

          <select className="rounded-md border px-2 py-1 text-sm"
            value={clinicalState}
            onChange={(e)=>setClinicalState(e.target.value as ClinicalState)}>
            <option value="DISPONIBLE">Disponible</option>
            <option value="LIMITADO">Limitado</option>
            <option value="BAJA">Baja</option>
          </select>

          <select className="rounded-md border px-2 py-1 text-sm"
            value={bodyPart}
            onChange={(e)=>setBodyPart(e.target.value)}>
            <option value="">Zona / Parte del cuerpo</option>
            {BODY_PARTS.map(z => <option key={z} value={z}>{z}</option>)}
          </select>

          <select className="rounded-md border px-2 py-1 text-sm"
            value={laterality}
            onChange={(e)=>setLaterality(e.target.value as Laterality)}>
            <option value="NA">—</option>
            <option value="IZQ">Izq</option>
            <option value="DER">Der</option>
            <option value="BIL">Bilateral</option>
          </select>

          <input className="rounded-md border px-2 py-1 text-sm bg-gray-50" readOnly
            value={clinicalState === "DISPONIBLE" ? "Full" : clinicalState === "BAJA" ? "Rehab/Descanso" : "Limitada"} />
        </div>

        <div className="grid md:grid-cols-6 gap-2">
          <select className="rounded-md border px-2 py-1 text-sm md:col-span-2"
            value={mechanism}
            onChange={(e)=>setMechanism(e.target.value)}>
            <option value="">Mecanismo (p. ej. sobreuso, impacto…)</option>
            {MECHANISMS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <select className="rounded-md border px-2 py-1 text-sm"
            value={severity}
            onChange={(e)=>setSeverity(e.target.value as Severity)}>
            <option value="LEVE">Leve</option>
            <option value="MODERADA">Moderada</option>
            <option value="SEVERA">Grave</option>
          </select>

          <input type="date" className="rounded-md border px-2 py-1 text-sm"
            value={startDate}
            onChange={(e)=>setStartDate(e.target.value)} />

          <input type="number" className="rounded-md border px-2 py-1 text-sm"
            placeholder="Días min"
            value={daysMin}
            onChange={(e)=>setDaysMin(e.target.value === "" ? "" : Number(e.target.value))} />
          <input type="number" className="rounded-md border px-2 py-1 text-sm"
            placeholder="Días max"
            value={daysMax}
            onChange={(e)=>setDaysMax(e.target.value === "" ? "" : Number(e.target.value))} />

          <input type="date" className="rounded-md border px-2 py-1 text-sm"
            value={expectedReturn}
            onChange={(e)=>setExpectedReturn(e.target.value)} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className={`inline-flex items-center gap-1 text-sm ${clinicalState !== "LIMITADO" ? "opacity-50" : ""}`}>
            <input type="checkbox" disabled={clinicalState !== "LIMITADO"} checked={!!noSprint}
              onChange={(e)=>setNoSprint(e.target.checked)} />
            No sprint
          </label>
          <label className={`inline-flex items-center gap-1 text-sm ${clinicalState !== "LIMITADO" ? "opacity-50" : ""}`}>
            <input type="checkbox" disabled={clinicalState !== "LIMITADO"} checked={!!noChangeOfDirection}
              onChange={(e)=>setNoChangeOfDirection(e.target.checked)} />
            Sin cambios de dirección
          </label>
          <label className={`inline-flex items-center gap-1 text-sm ${clinicalState !== "LIMITADO" ? "opacity-50" : ""}`}>
            <input type="checkbox" disabled={clinicalState !== "LIMITADO"} checked={!!gymOnly}
              onChange={(e)=>setGymOnly(e.target.checked)} />
            Solo gimnasio
          </label>
          <label className={`inline-flex items-center gap-1 text-sm ${clinicalState !== "LIMITADO" ? "opacity-50" : ""}`}>
            <input type="checkbox" disabled={clinicalState !== "LIMITADO"} checked={!!noContact}
              onChange={(e)=>setNoContact(e.target.checked)} />
            Sin contacto
          </label>
          <input type="number" className="rounded-md border px-2 py-1 text-sm w-32"
            placeholder="Tope min (cap)" disabled={clinicalState !== "LIMITADO"}
            value={capMinutes}
            onChange={(e)=>setCapMinutes(e.target.value === "" ? "" : Number(e.target.value))} />
        </div>

        <div className="grid md:grid-cols-3 gap-2">
          <input className="rounded-md border px-2 py-1 text-sm"
            placeholder="Diagnóstico breve (ej. Distensión isquios grado I)"
            value={diagnosis} onChange={(e)=>setDiagnosis(e.target.value)} />
          <select className="rounded-md border px-2 py-1 text-sm"
            value={dropType} onChange={(e)=>setDropType(e.target.value as DropType)}>
            <option value="ENTRENAMIENTO">Tipo de baja (entreno)</option>
            <option value="COMPETITIVA">Competitiva</option>
            <option value="ENTRENAMIENTO">Entrenamiento</option>
            <option value="PARCIAL">Parcial</option>
          </select>
          <button type="button" disabled
            className="rounded-md border px-2 py-1 text-sm text-gray-400 cursor-not-allowed"
            title="Subida de estudios se habilita en la próxima fase">
            Adjuntar estudio (PDF/JPG) — próximamente
          </button>
        </div>

        <textarea className="w-full rounded-md border px-2 py-1 text-sm" rows={3}
          placeholder="Informe médico (evolución, tratamientos, observaciones)"
          value={report} onChange={(e)=>setReport(e.target.value)} />

        <div className="flex items-center gap-2">
          <input className="rounded-md border px-2 py-1 text-sm w-60"
            placeholder="Firma / Iniciales del médico (obligatorio)"
            value={signedBy} onChange={(e)=>setSignedBy(e.target.value)} />
          <div className="ml-auto flex items-center gap-2">
            {editingId ? (
              <button onClick={resetForm} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
                Cancelar
              </button>
            ) : null}
            <button
              onClick={save}
              disabled={saving}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                saving ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"
              }`}
            >
              {editingId ? "Actualizar" : "Guardar"}
            </button>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-2">
        <input
          className="w-full md:w-80 rounded-md border px-2 py-1.5 text-sm"
          placeholder="Buscar por jugador, zona o mecanismo…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="text-[12px] text-gray-500">{filtered.length} resultado(s)</span>
      </div>

      <section className="rounded-2xl border bg-white overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 text-[12px] font-semibold uppercase">
          Entradas — {date}{" "}
          <HelpTip text="Semáforo: Verde=disponible, Amarillo=limitado, Rojo=baja." />
        </div>
        {loading ? (
          <div className="p-4 text-gray-500">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-gray-500 italic">Sin datos</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-3 py-2">Jugador</th>
                  <th className="text-left px-3 py-2">Semáforo</th>
                  <th className="text-left px-3 py-2">Estado</th>
                  <th className="text-left px-3 py-2">Zona</th>
                  <th className="text-left px-3 py-2">Lat.</th>
                  <th className="text-left px-3 py-2">Mecanismo</th>
                  <th className="text-left px-3 py-2">Gravedad</th>
                  <th className="text-left px-3 py-2">Dispon.</th>
                  <th className="text-left px-3 py-2">ETR</th>
                  <th className="text-left px-3 py-2">Restricciones</th>
                  <th className="text-left px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 align-top">
                    <td className="px-3 py-2 font-medium">{r.userName}</td>
                    <td className="px-3 py-2">{/* badge semáforo */}</td>
                    <td className="px-3 py-2">{r.status}</td>
                    <td className="px-3 py-2">{r.bodyPart || "—"}</td>
                    <td className="px-3 py-2">{r.laterality || "—"}</td>
                    <td className="px-3 py-2">{r.mechanism || "—"}</td>
                    <td className="px-3 py-2">{r.severity || "—"}</td>
                    <td className="px-3 py-2">{r.availability || "—"}</td>
                    <td className="px-3 py-2">{r.expectedReturn || "—"}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">
                      {/* restricciones/Cap */}
                    </td>
                    <td className="px-3 py-2">
                      {/* editar/borrar */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="rounded-xl border bg-white p-3 text-xs text-gray-600">
        <b>Nota:</b> El CT lo ve en modo lectura y usa “Disponibilidad”, “ETR” y “Cap min”.
      </div>
    </div>
  );
}
