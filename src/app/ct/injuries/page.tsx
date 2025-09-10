// src/app/ct/injuries/page.tsx
"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import { Suspense, useMemo, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import HelpTip from "@/components/HelpTip";

type InjuryStatus = "ACTIVO" | "REINTEGRO" | "ALTA";
type Laterality = "IZQ" | "DER" | "BILATERAL" | "NA" | null;
type Severity = "LEVE" | "MODERADA" | "SEVERA" | null;
type Availability = "OUT" | "MODIFIED" | "FULL" | null;

type Row = {
  id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  status: InjuryStatus;
  bodyPart: string | null;
  laterality: Laterality;
  mechanism: string | null;
  severity: Severity;
  expectedReturn: string | null; // YYYY-MM-DD | null
  availability: Availability;
  capMinutes?: number | null;
  noSprint?: boolean | null;
  noChangeOfDirection?: boolean | null;
  gymOnly?: boolean | null;
  noContact?: boolean | null;
};

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function CtInjuriesPage() {
  return (
    <Suspense fallback={<div className="p-4 text-gray-500">Cargando…</div>}>
      <CtInjuriesInner />
    </Suspense>
  );
}

function CtInjuriesInner() {
  const search = useSearchParams();
  const today = useMemo(() => toYMD(new Date()), []);
  const [date, setDate] = useState<string>(search.get("date") || today);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/med/clinical?date=${date}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setRows([]);
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    // actualizar la URL sin romper typedRoutes (usamos history)
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("date", date);
      window.history.replaceState({}, "", url.toString());
    }
    load();
  }, [date, load]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      (r.userName || "").toLowerCase().includes(t) ||
      (r.bodyPart || "").toLowerCase().includes(t) ||
      (r.mechanism || "").toLowerCase().includes(t)
    );
  }, [rows, q]);

  function badgeColor(r: Row) {
    // Semáforo (apoyado en tu schema actual):
    // Verde: ALTA o FULL
    // Amarillo: REINTEGRO o MODIFIED
    // Rojo: ACTIVO o OUT
    if (r.status === "ALTA" || r.availability === "FULL") return "bg-green-100 text-green-700 border-green-200";
    if (r.status === "REINTEGRO" || r.availability === "MODIFIED")
      return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-red-100 text-red-700 border-red-200";
  }

  function exportCSV() {
    const header = [
      "Jugador",
      "Fecha",
      "Estado",
      "Disponibilidad",
      "Zona",
      "Lateralidad",
      "Mecanismo",
      "Severidad",
      "ETR",
      "CapMin",
      "NoSprint",
      "NoCOD",
      "SoloGym",
      "NoContacto",
    ];
    const lines = filtered.map((r) =>
      [
        r.userName,
        r.date,
        r.status || "",
        r.availability || "",
        r.bodyPart || "",
        r.laterality || "",
        r.mechanism || "",
        r.severity || "",
        r.expectedReturn || "",
        r.capMinutes ?? "",
        r.noSprint ? "1" : "",
        r.noChangeOfDirection ? "1" : "",
        r.gymOnly ? "1" : "",
        r.noContact ? "1" : "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `clinical_${date}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <main className="min-h-[70vh] px-6 py-10">
      <header className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Parte clínico — Vista CT (solo lectura)</h1>
          <p className="mt-1 text-sm text-gray-600">
            Información diaria cargada por el cuerpo médico.{" "}
            <HelpTip text="El CT ve disponibilidad, ETR y restricciones para planificar. No edita acá." />
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="h-10 rounded-md border px-3 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button
            onClick={load}
            className="h-10 rounded-md border px-4 text-sm hover:bg-gray-50"
          >
            Recargar
          </button>
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="h-10 rounded-md bg-black px-4 text-sm text-white disabled:opacity-50"
          >
            Exportar CSV
          </button>
        </div>
      </header>

      <div className="mb-3 flex items-center gap-2">
        <input
          className="w-full md:w-80 rounded-md border px-3 py-2 text-sm"
          placeholder="Buscar por jugador, zona o mecanismo…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="text-xs text-gray-500">{filtered.length} resultado(s)</span>
      </div>

      <section className="rounded-2xl border bg-white overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 text-[12px] font-semibold uppercase">
          Entradas — {date}{" "}
          <HelpTip text="Semáforo: Verde=Alta/Full · Amarillo=Reintegro/Modified · Rojo=Activo/Out" />
        </div>

        {loading ? (
          <div className="p-4 text-gray-500">Cargando…</div>
        ) : err ? (
          <div className="p-4 text-red-600">Error al cargar: {err}</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-gray-500 italic">Sin datos</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-3 py-2">Jugador</th>
                  <th className="text-left px-3 py-2">Estado</th>
                  <th className="text-left px-3 py-2">Dispon.</th>
                  <th className="text-left px-3 py-2">Zona</th>
                  <th className="text-left px-3 py-2">Lat.</th>
                  <th className="text-left px-3 py-2">Mecanismo</th>
                  <th className="text-left px-3 py-2">Severidad</th>
                  <th className="text-left px-3 py-2">ETR</th>
                  <th className="text-left px-3 py-2">Restricciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 align-top">
                    <td className="px-3 py-2 font-medium">
                      <span
                        className={`inline-block rounded-full border px-2 py-0.5 text-[11px] mr-2 ${badgeColor(r)}`}
                        title={`${r.status} / ${r.availability ?? "—"}`}
                      >
                        ●
                      </span>
                      {r.userName}
                    </td>
                    <td className="px-3 py-2">{r.status}</td>
                    <td className="px-3 py-2">{r.availability || "—"}</td>
                    <td className="px-3 py-2">{r.bodyPart || "—"}</td>
                    <td className="px-3 py-2">{r.laterality || "—"}</td>
                    <td className="px-3 py-2">{r.mechanism || "—"}</td>
                    <td className="px-3 py-2">{r.severity || "—"}</td>
                    <td className="px-3 py-2">{r.expectedReturn || "—"}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">
                      <div className="space-y-0.5">
                        {r.capMinutes ? <div>Cap: {r.capMinutes}′</div> : null}
                        {r.noSprint ? <div>Sin sprint</div> : null}
                        {r.noChangeOfDirection ? <div>Sin cambios dir.</div> : null}
                        {r.gymOnly ? <div>Solo gym</div> : null}
                        {r.noContact ? <div>Sin contacto</div> : null}
                        {!r.capMinutes &&
                        !r.noSprint &&
                        !r.noChangeOfDirection &&
                        !r.gymOnly &&
                        !r.noContact ? (
                          <span className="text-gray-400">—</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="rounded-xl border bg-white p-3 text-xs text-gray-600 mt-3">
        <b>Nota:</b> Esta vista es solo lectura. Los médicos editan el parte en su panel;
        el CT lo usa para planificar cargas, minutos y tareas.
      </div>
    </main>
  );
}
