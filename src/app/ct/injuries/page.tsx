// src/app/ct/injuries/page.tsx
"use client";

import * as React from "react";
import { Suspense, useEffect, useMemo, useState, useCallback } from "react";
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
  expectedReturn: string | null;
  availability: Availability | null;
  pain?: number | null;
  capMinutes?: number | null;
  noSprint?: boolean | null;
  noChangeOfDirection?: boolean | null;
  gymOnly?: boolean | null;
  noContact?: boolean | null;
};

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-gray-500">Cargando…</div>}>
      <CTInjuriesView />
    </Suspense>
  );
}

function CTInjuriesView() {
  const router = useRouter();
  const search = useSearchParams();

  const today = React.useMemo(() => toYMD(new Date()), []);
  const [date, setDate] = useState<string>(search.get("date") || today);
  const [rows, setRows] = useState<InjuryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

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
    const url = `/ct/injuries?date=${date}`;
    router.replace(url as unknown as Route);
    loadDay();
  }, [date, router, loadDay]);

  // Filtros (búsqueda simple por nombre, zona, mecanismo)
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

  // Métricas rápidas
  const metrics = useMemo(() => {
    const activos = rows.filter((r) => r.status === "ACTIVO").length;
    const reintegro = rows.filter((r) => r.status === "REINTEGRO").length;
    const altasHoy = rows.filter((r) => r.status === "ALTA").length;
    return { activos, reintegro, altasHoy };
  }, [rows]);

  return (
    <div className="p-4 space-y-4">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">
            Lesionados — Diario (CT){" "}
            <HelpTip text="Vista SOLO LECTURA. El cuerpo médico mantiene los datos; el CT consulta disponibilidad, ETR y restricciones para planificar." />
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

      {/* KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Kpi title="ACTIVOS" value={metrics.activos} />
        <Kpi title="REINTEGRO" value={metrics.reintegro} />
        <Kpi title="ALTAS HOY" value={metrics.altasHoy} />
      </section>

      {/* Búsqueda */}
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
          <HelpTip text="ACTIVO: en tratamiento • REINTEGRO: retorno progresivo • ALTA: alta médica" />
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
        <b>Uso:</b> El <b>cuerpo médico</b> actualiza estado, ETR y restricciones. El <b>CT</b> consulta
        “Disponibilidad” y “Cap min” para ajustar minutos planificados y tareas. Esta vista es
        <b> solo lectura</b>.
      </div>
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-[11px] text-gray-500 font-semibold">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
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
