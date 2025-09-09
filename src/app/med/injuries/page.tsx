"use client";

import * as React from "react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import HelpTip from "@/components/HelpTip";

type InjuryStatus = "ACTIVO" | "REINTEGRO" | "ALTA";
type Availability = "FULL" | "LIMITADA" | "INDIVIDUAL" | "REHAB" | "DESCANSO";

type InjuryRow = {
  id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  status: InjuryStatus;
  bodyPart: string | null;
  laterality: "IZQ" | "DER" | "BIL" | "NA" | null;
  mechanism: string | null;
  severity: "LEVE" | "MODERADA" | "SEVERA" | null;
  expectedReturn: string | null; // YYYY-MM-DD | null
  availability: Availability | null;
  pain?: number | null;
  capMinutes?: number | null;
  noSprint?: boolean | null;
  noChangeOfDirection?: boolean | null;
  gymOnly?: boolean | null;
  noContact?: boolean | null;
};

type PlayerOpt = { id: string; label: string };

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

function usePlayers() {
  const [players, setPlayers] = React.useState<PlayerOpt[]>([]);
  React.useEffect(() => {
    let alive = true;
    fetch("/api/users/players", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        if (!alive) return;
        const opts = Array.isArray(list)
          ? list.map((u: any) => ({
              id: u.id as string,
              label: (u.name || u.email || u.id) as string,
            }))
          : [];
        setPlayers(opts);
      })
      .catch(() => setPlayers([]));
    return () => {
      alive = false;
    };
  }, []);
  return players;
}

// Wrapper con Suspense (requerido por useSearchParams)
export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-gray-500">Cargando…</div>}>
      <MedInjuriesEditor />
    </Suspense>
  );
}

function MedInjuriesEditor() {
  const router = useRouter();
  const search = useSearchParams();
  const players = usePlayers();

  const today = React.useMemo(() => toYMD(new Date()), []);
  const [date, setDate] = useState<string>(search.get("date") || today);
  const [rows, setRows] = useState<InjuryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");

  const [form, setForm] = useState<Partial<InjuryRow>>({
    userId: "",
    status: "ACTIVO",
    bodyPart: "",
    laterality: "NA",
    mechanism: "",
    severity: "LEVE",
    expectedReturn: "",
    availability: "LIMITADA",
    pain: null,
    capMinutes: null,
    noSprint: false,
    noChangeOfDirection: false,
    gymOnly: false,
    noContact: false,
  });

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

  async function saveQuick() {
    if (!form.userId) {
      alert("Elegí un jugador.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        userId: form.userId,
        date,
        status: form.status || "ACTIVO",
        bodyPart: form.bodyPart || null,
        laterality: form.laterality || "NA",
        mechanism: form.mechanism || null,
        severity: form.severity || null,
        expectedReturn: form.expectedReturn || null,
        availability: form.availability || "LIMITADA",
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

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Error al guardar");
      }

      // Reset mínimos para siguiente carga
      setForm((f) => ({
        ...f,
        userId: "",
        bodyPart: "",
        mechanism: "",
        expectedReturn: "",
        pain: null,
        capMinutes: null,
        noSprint: false,
        noChangeOfDirection: false,
        gymOnly: false,
        noContact: false,
      }));

      await loadDay();
    } catch (e: any) {
      alert(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">
            Lesionados — Editor (Cuerpo médico){" "}
            <HelpTip text="El cuerpo médico crea/actualiza el estado diario, restricciones y ETR. El CT ve todo en su vista y no edita." />
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
          <button
            onClick={loadDay}
            className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50"
          >
            Recargar
          </button>
        </div>
      </header>

      {/* CARGA RÁPIDA */}
      <section className="rounded-xl border bg-white p-3 space-y-2">
        <div className="text-[12px] font-semibold uppercase">
          Carga rápida{" "}
          <HelpTip text="Seleccioná jugador y completá los campos clave. Upsert por jugador+fecha (si existe, actualiza)." />
        </div>

        <div className="grid md:grid-cols-6 gap-2">
          {/* Jugador */}
          <select
            className="rounded-md border px-2 py-1 text-sm md:col-span-2"
            value={form.userId || ""}
            onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
          >
            <option value="">Jugador (nombre o email)</option>
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
            onChange={(e) =>
              setForm((f) => ({ ...f, laterality: e.target.value as InjuryRow["laterality"] }))
            }
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
            onChange={(e) =>
              setForm((f) => ({ ...f, availability: e.target.value as Availability }))
            }
          >
            <option value="FULL">Full</option>
            <option value="LIMITADA">Limitada</option>
            <option value="INDIVIDUAL">Individual</option>
            <option value="REHAB">Rehab</option>
            <option value="DESCANSO">Descanso</option>
          </select>
        </div>

        <div className="grid md:grid-cols-6 gap-2">
          {/* Mecanismo */}
          <input
            className="rounded-md border px-2 py-1 text-sm md:col-span-2"
            placeholder="Mecanismo (p. ej. sobreuso, impacto…)"
            value={form.mechanism || ""}
            onChange={(e) => setForm((f) => ({ ...f, mechanism: e.target.value }))}
          />

          {/* Severidad */}
          <select
            className="rounded-md border px-2 py-1 text-sm"
            value={form.severity || "LEVE"}
            onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as any }))}
          >
            <option value="LEVE">Leve</option>
            <option value="MODERADA">Moderada</option>
            <option value="SEVERA">Severa</option>
          </select>

          {/* ETR */}
          <input
            type="date"
            className="rounded-md border px-2 py-1 text-sm"
            placeholder="ETR (YYYY-MM-DD)"
            value={form.expectedReturn || ""}
            onChange={(e) => setForm((f) => ({ ...f, expectedReturn: e.target.value }))}
          />

          {/* Dolor */}
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

          {/* Cap min */}
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

        {/* Flags operativos */}
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
              onChange={(e) =>
                setForm((f) => ({ ...f, noChangeOfDirection: e.target.checked }))
              }
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

          <div className="ml-auto" />
          <button
            onClick={saveQuick}
            disabled={saving}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              saving ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"
            }`}
          >
            Guardar
          </button>
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

      {/* Tabla del día */}
      <section className="rounded-2xl border bg-white overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 text-[12px] font-semibold uppercase">
          Entradas — {date}
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
                  <Th>Jugador</Th>
                  <Th>Estado</Th>
                  <Th>Zona</Th>
                  <Th>Lat.</Th>
                  <Th>Mecanismo</Th>
                  <Th>Severidad</Th>
                  <Th>Dispon.</Th>
                  <Th>ETR</Th>
                  <Th>Restricciones</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 align-top">
                    <Td className="font-medium">{r.userName}</Td>
                    <Td>{r.status}</Td>
                    <Td>{r.bodyPart || "—"}</Td>
                    <Td>{r.laterality || "—"}</Td>
                    <Td>{r.mechanism || "—"}</Td>
                    <Td>{r.severity || "—"}</Td>
                    <Td>{r.availability || "—"}</Td>
                    <Td>{r.expectedReturn || "—"}</Td>
                    <Td className="text-xs text-gray-700">
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
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="rounded-xl border bg-white p-3 text-xs text-gray-600">
        <b>Uso:</b> Esta vista es de <b>cuerpo médico</b> para registrar y actualizar. La vista del
        <b> CT</b> es solo lectura.
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-3 py-2">{children}</th>;
}
function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}

