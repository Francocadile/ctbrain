"use client";

import * as React from "react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import HelpTip from "@/components/HelpTip";

/* ===== Tipos locales (string unions, no dependen del schema) ===== */
type InjuryStatus = "ACTIVO" | "REINTEGRO" | "ALTA";
type Availability = "FULL" | "LIMITADA" | "INDIVIDUAL" | "REHAB" | "DESCANSO";
type Laterality = "IZQ" | "DER" | "BIL" | "NA";
type Severity = "LEVE" | "MODERADA" | "SEVERA";

type InjuryRow = {
  id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  status: InjuryStatus;
  bodyPart: string | null;
  laterality: Laterality | null;
  mechanism: string | null;
  severity: Severity | null;
  expectedReturn: string | null;
  availability: Availability | null;
  pain?: number | null;
  capMinutes?: number | null;
  noSprint?: boolean | null;
  noChangeOfDirection?: boolean | null;
  gymOnly?: boolean | null;
  noContact?: boolean | null;
};

type PlayerOpt = { id: string; label: string };

/* ===== Helpers ===== */
function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}
function download(filename: string, text: string) {
  const el = document.createElement("a");
  el.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(text));
  el.setAttribute("download", filename);
  el.style.display = "none";
  document.body.appendChild(el);
  el.click();
  document.body.removeChild(el);
}

/* ===== Hook: jugadores (solo rol JUGADOR) ===== */
function usePlayers() {
  const [players, setPlayers] = React.useState<PlayerOpt[]>([]);
  useEffect(() => {
    fetch("/api/users/players")
      .then((r) => r.json())
      .then((list) =>
        setPlayers(
          (Array.isArray(list) ? list : []).map((u: any) => ({
            id: u.id as string,
            label: (u.name || u.email || u.id) as string,
          }))
        )
      )
      .catch(() => setPlayers([]));
  }, []);
  return players;
}

/* ===== Wrapper con Suspense por useSearchParams ===== */
export default function MedInjuriesClient() {
  return (
    <Suspense fallback={<div className="p-4 text-gray-500">Cargando…</div>}>
      <Inner />
    </Suspense>
  );
}

/* ================== Contenido real ================== */
function Inner() {
  const router = useRouter();
  const search = useSearchParams();
  const players = usePlayers();

  const today = useMemo(() => toYMD(new Date()), []);
  const [date, setDate] = useState<string>(search.get("date") || today);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<InjuryRow[]>([]);
  const [q, setQ] = useState("");

  // modo edición (si selecciono una fila)
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<InjuryRow>>({
    userId: "",
    status: "ACTIVO",
    bodyPart: "",
    laterality: "NA",
    mechanism: "",
    severity: "LEVE",
    expectedReturn: "",
    availability: "LIMITADA",
    pain: undefined,
    capMinutes: undefined,
    noSprint: false,
    noChangeOfDirection: false,
    gymOnly: false,
    noContact: false,
  });

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
    // typedRoutes: casteo para evitar error de RouteImpl
    router.replace(url as unknown as Route);
    loadDay();
  }, [date, router, loadDay]);

  function fillFormFromRow(r: InjuryRow) {
    setEditingId(r.id);
    setForm({
      userId: r.userId,
      status: r.status,
      bodyPart: r.bodyPart || "",
      laterality: (r.laterality || "NA") as Laterality,
      mechanism: r.mechanism || "",
      severity: (r.severity || "LEVE") as Severity,
      expectedReturn: r.expectedReturn || "",
      availability: (r.availability || "LIMITADA") as Availability,
      pain: r.pain ?? undefined,
      capMinutes: r.capMinutes ?? undefined,
      noSprint: !!r.noSprint,
      noChangeOfDirection: !!r.noChangeOfDirection,
      gymOnly: !!r.gymOnly,
      noContact: !!r.noContact,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      userId: "",
      status: "ACTIVO",
      bodyPart: "",
      laterality: "NA",
      mechanism: "",
      severity: "LEVE",
      expectedReturn: "",
      availability: "LIMITADA",
      pain: undefined,
      capMinutes: undefined,
      noSprint: false,
      noChangeOfDirection: false,
      gymOnly: false,
      noContact: false,
    });
  }

  async function saveQuick() {
    if (!form.userId) {
      alert("Elegí un jugador (userId).");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        userId: form.userId,
        date,
        status: (form.status || "ACTIVO") as InjuryStatus,
        bodyPart: form.bodyPart || null,
        laterality: (form.laterality || "NA") as Laterality,
        mechanism: form.mechanism || null,
        severity: (form.severity || null) as Severity | null,
        expectedReturn: form.expectedReturn || null,
        availability: (form.availability || "LIMITADA") as Availability,
        pain: form.pain ?? null,
        capMinutes: form.capMinutes ?? null,
        noSprint: !!form.noSprint,
        noChangeOfDirection: !!form.noChangeOfDirection,
        gymOnly: !!form.gymOnly,
        noContact: !!form.noContact,
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

  function exportCSV() {
    const header = [
      "date",
      "userName",
      "status",
      "bodyPart",
      "laterality",
      "mechanism",
      "severity",
      "availability",
      "expectedReturn",
      "pain",
      "capMinutes",
      "noSprint",
      "noChangeOfDirection",
      "gymOnly",
      "noContact",
    ];
    const lines = [header.join(",")];
    rows.forEach((r) => {
      const line = [
        r.date,
        r.userName,
        r.status || "",
        r.bodyPart || "",
        r.laterality || "",
        r.mechanism || "",
        r.severity || "",
        r.availability || "",
        r.expectedReturn || "",
        r.pain ?? "",
        r.capMinutes ?? "",
        r.noSprint ? "1" : "0",
        r.noChangeOfDirection ? "1" : "0",
        r.gymOnly ? "1" : "0",
        r.noContact ? "1" : "0",
      ]
        .map((v) => `${String(v).replace(/"/g, '""')}`)
        .map((v) => `"${v}"`)
        .join(",");
      lines.push(line);
    });
    download(`lesiones_${date}.csv`, lines.join("\n"));
  }

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
          <input
            type="date"
            className="rounded-md border px-2 py-1.5 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button onClick={loadDay} className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50">
            Recargar
          </button>
          <button onClick={exportCSV} className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50">
            Exportar CSV
          </button>
        </div>
      </header>

      {/* Formulario */}
      <section className="rounded-xl border bg-white p-3 space-y-2">
        <div className="text-[12px] font-semibold uppercase">
          Parte diario{" "}
          <HelpTip text="Seleccioná jugador y completá los campos claves. Si ya existe un parte para el día, se actualiza." />
        </div>

        <div className="grid md:grid-cols-6 gap-2">
          {/* Jugador */}
          <select
            className="rounded-md border px-2 py-1 text-sm md:col-span-2"
            value={form.userId || ""}
            onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
          >
            <option value="">
              {players.length ? "Jugador (nombre o email)" : "Cargando jugadores…"}
            </option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>

          {/* Estado */}
          <select
            className="rounded-md border px-2 py-1 text-sm"
            value={form.status || "ACTIVO"}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as InjuryStatus }))}
          >
            <option value="ACTIVO">Activo</option>
            <option value="REINTEGRO">Reintegro</option>
            <option value="ALTA">Alta médica</option>
          </select>

          {/* Zona */}
          <input
            className="rounded-md border px-2 py-1 text-sm"
            placeholder="Zona / Parte del cuerpo"
            value={form.bodyPart || ""}
            onChange={(e) => setForm((f) => ({ ...f, bodyPart: e.target.value }))}
          />

          {/* Lateralidad */}
          <select
            className="rounded-md border px-2 py-1 text-sm"
            value={form.laterality || "NA"}
            onChange={(e) => setForm((f) => ({ ...f, laterality: e.target.value as Laterality }))}
          >
            <option value="NA">—</option>
            <option value="IZQ">Izq</option>
            <option value="DER">Der</option>
            <option value="BIL">Bilateral</option>
          </select>

          {/* Disponibilidad */}
          <select
            className="rounded-md border px-2 py-1 text-sm"
            value={form.availability || "LIMITADA"}
            onChange={(e) => setForm((f) => ({ ...f, availability: e.target.value as Availability }))}
          >
            <option value="FULL">Full</option>
            <option value="LIMITADA">Limitada</option>
            <option value="INDIVIDUAL">Individual</option>
            <option value="REHAB">Rehab</option>
            <option value="DESCANSO">Descanso</option>
          </select>
        </div>

        <div className="grid md:grid-cols-6 gap-2">
          <input
            className="rounded-md border px-2 py-1 text-sm md:col-span-2"
            placeholder="Mecanismo (p. ej. sobreuso, impacto…)"
            value={form.mechanism || ""}
            onChange={(e) => setForm((f) => ({ ...f, mechanism: e.target.value }))}
          />
          <select
            className="rounded-md border px-2 py-1 text-sm"
            value={form.severity || "LEVE"}
            onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as Severity }))}
          >
            <option value="LEVE">Leve</option>
            <option value="MODERADA">Moderada</option>
            <option value="SEVERA">Severa</option>
          </select>
          <input
            type="date"
            className="rounded-md border px-2 py-1 text-sm"
            placeholder="ETR (YYYY-MM-DD)"
            value={form.expectedReturn || ""}
            onChange={(e) => setForm((f) => ({ ...f, expectedReturn: e.target.value }))}
          />
          <input
            type="number"
            className="rounded-md border px-2 py-1 text-sm"
            placeholder="Dolor (0-10)"
            value={form.pain ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                pain: e.target.value === "" ? null : Number(e.target.value),
              }))
            }
          />
          <input
            type="number"
            className="rounded-md border px-2 py-1 text-sm"
            placeholder="Tope min (cap)"
            value={form.capMinutes ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                capMinutes: e.target.value === "" ? null : Number(e.target.value),
              }))
            }
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={!!form.noSprint}
              onChange={(e) => setForm((f) => ({ ...f, noSprint: e.target.checked }))}
            />
            No sprint
          </label>
          <label className="inline-flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={!!form.noChangeOfDirection}
              onChange={(e) => setForm((f) => ({ ...f, noChangeOfDirection: e.target.checked }))}
            />
            Sin cambios de dirección
          </label>
          <label className="inline-flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={!!form.gymOnly}
              onChange={(e) => setForm((f) => ({ ...f, gymOnly: e.target.checked }))}
            />
            Solo gimnasio
          </label>
          <label className="inline-flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={!!form.noContact}
              onChange={(e) => setForm((f) => ({ ...f, noContact: e.target.checked }))}
            />
            Sin contacto
          </label>

          <div className="ml-auto flex items-center gap-2">
            {editingId ? (
              <button
                onClick={resetForm}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
            ) : null}
            <button
              onClick={saveQuick}
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

      {/* Filtros */}
      <div className="flex items-center gap-2">
        <input
          className="w-full md:w-80 rounded-md border px-2 py-1.5 text-sm"
          placeholder="Buscar por jugador, zona o mecanismo…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="text-[12px] text-gray-500">{filtered.length} resultado(s)</span>
      </div>

      {/* Tabla */}
      <section className="rounded-2xl border bg-white overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 text-[12px] font-semibold uppercase">
          Entradas — {date}{" "}
          <HelpTip text="Listado del día. Editá con el botón, o eliminá la entrada si fue cargada por error." />
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
                  <th className="text-left px-3 py-2">Estado</th>
                  <th className="text-left px-3 py-2">Zona</th>
                  <th className="text-left px-3 py-2">Lat.</th>
                  <th className="text-left px-3 py-2">Mecanismo</th>
                  <th className="text-left px-3 py-2">Severidad</th>
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
                    <td className="px-3 py-2">{r.status}</td>
                    <td className="px-3 py-2">{r.bodyPart || "—"}</td>
                    <td className="px-3 py-2">{r.laterality || "—"}</td>
                    <td className="px-3 py-2">{r.mechanism || "—"}</td>
                    <td className="px-3 py-2">{r.severity || "—"}</td>
                    <td className="px-3 py-2">{r.availability || "—"}</td>
                    <td className="px-3 py-2">{r.expectedReturn || "—"}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">
                      <div className="space-y-0.5">
                        {r.capMinutes ? <div>Cap: {r.capMinutes}′</div> : null}
                        {typeof r.pain === "number" ? <div>Dolor: {r.pain}/10</div> : null}
                        {r.noSprint ? <div>Sin sprint</div> : null}
                        {r.noChangeOfDirection ? <div>Sin cambios dir.</div> : null}
                        {r.gymOnly ? <div>Solo gym</div> : null}
                        {r.noContact ? <div>Sin contacto</div> : null}
                        {!r.capMinutes &&
                        typeof r.pain !== "number" &&
                        !r.noSprint &&
                        !r.noChangeOfDirection &&
                        !r.gymOnly &&
                        !r.noContact ? (
                          <span className="text-gray-400">—</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          className="rounded border px-2 py-0.5 text-xs hover:bg-gray-50"
                          onClick={() => fillFormFromRow(r)}
                        >
                          Editar
                        </button>
                        <button
                          className="rounded border px-2 py-0.5 text-xs hover:bg-red-50"
                          onClick={() => removeRow(r.id)}
                        >
                          Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="rounded-xl border bg-white p-3 text-xs text-gray-600">
        <b>Nota:</b> El CT ve esta información en modo lectura y usa “Disponibilidad”, “ETR” y
        “Cap min” para ajustar minutos y tareas del plan.
      </div>
    </div>
  );
}
