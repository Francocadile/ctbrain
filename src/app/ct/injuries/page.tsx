// src/app/ct/injuries/page.tsx
"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import {
  useMemo,
  useEffect,
  useState,
  useCallback,
  Suspense,
} from "react";
import { useSearchParams } from "next/navigation";
import HelpTip from "@/components/HelpTip";

type InjuryStatus = "BAJA" | "REINTEGRO" | "LIMITADA" | "ALTA";
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
  availability: Availability; // <- garantizamos valor derivado si no llega desde API
  capMinutes?: number | null;
  noSprint?: boolean | null;
  noChangeOfDirection?: boolean | null;
  gymOnly?: boolean | null;
  noContact?: boolean | null;
};

type Analytics = {
  range: { start: string; end: string };
  totals: {
    episodes: number;
    playersAffected: number;
    avgEstimatedDays: number | null;
    statusCounts: Record<InjuryStatus, number>;
  };
  bodyPartTop: { name: string; count: number }[];
  mechanismTop: { name: string; count: number }[];
  topPlayersByDaysOut: {
    userId: string;
    name: string;
    daysOut: number;
    episodes: number;
  }[];
  recent: {
    id: string;
    userId: string;
    userName: string;
    date: string;
    status: InjuryStatus;
    bodyPart: string | null;
    mechanism: string | null;
    severity: Severity;
    startDate: string | null;
    expectedReturn: string | null;
  }[];
};

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}
function monthRange(d = new Date()) {
  const s = new Date(d.getFullYear(), d.getMonth(), 1);
  const e = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { start: toYMD(s), end: toYMD(e) };
}
function deriveAvailability(status: InjuryStatus | undefined, apiAvail?: Availability | null): Availability {
  if (apiAvail) return apiAvail;
  switch (status) {
    case "ALTA":
      return "FULL";
    case "REINTEGRO":
    case "LIMITADA":
      return "MODIFIED";
    case "BAJA":
    default:
      return "OUT";
  }
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
  const tabFromUrl = (search.get("tab") || "lista") as "lista" | "metricas";

  const [tab, setTab] = useState<"lista" | "metricas">(tabFromUrl);

  // sync tab -> URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  }, [tab]);

  const today = useMemo(() => toYMD(new Date()), []);
  const [date, setDate] = useState<string>(search.get("date") || today);

  // rango para analytics (mes seleccionado)
  const [month, setMonth] = useState<string>(
    search.get("month") || today.slice(0, 7)
  ); // YYYY-MM
  const { start, end } = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const base = new Date(y, (m || 1) - 1, 1);
    return monthRange(base);
  }, [month]);

  // sync date/month -> URL (no molestamos ?tab)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("date", date);
    url.searchParams.set("month", month);
    window.history.replaceState({}, "", url.toString());
  }, [date, month]);

  // datos diarios (tabla)
  const [rows, setRows] = useState<Row[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [errRows, setErrRows] = useState<string | null>(null);
  const [q, setQ] = useState("");

  // analytics (tiles + charts)
  const [an, setAn] = useState<Analytics | null>(null);
  const [loadingAn, setLoadingAn] = useState(false);
  const [errAn, setErrAn] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    setLoadingRows(true);
    setErrRows(null);
    try {
      const res = await fetch(`/api/med/clinical?date=${date}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Derivar availability si no viene desde API
      const normalized: Row[] = (Array.isArray(data) ? data : []).map((r: any) => ({
        ...r,
        availability: deriveAvailability(r?.status, r?.availability ?? null),
      }));

      setRows(normalized);
    } catch (e: any) {
      setRows([]);
      setErrRows(e?.message || "Error");
    } finally {
      setLoadingRows(false);
    }
  }, [date]);

  const loadAnalytics = useCallback(async () => {
    setLoadingAn(true);
    setErrAn(null);
    try {
      const res = await fetch(
        `/api/med/clinical/analytics?start=${start}&end=${end}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Analytics;
      setAn(data);
    } catch (e: any) {
      setAn(null);
      setErrAn(e?.message || "Error");
    } finally {
      setLoadingAn(false);
    }
  }, [start, end]);

  useEffect(() => {
    loadRows();
  }, [date, loadRows]);

  useEffect(() => {
    loadAnalytics();
  }, [start, end, loadAnalytics]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(
      (r) =>
        (r.userName || "").toLowerCase().includes(t) ||
        (r.bodyPart || "").toLowerCase().includes(t) ||
        (r.mechanism || "").toLowerCase().includes(t)
    );
  }, [rows, q]);

  function badgeColor(r: Row) {
    if (r.status === "ALTA" || r.availability === "FULL")
      return "bg-green-100 text-green-700 border-green-200";
    if (
      r.status === "REINTEGRO" ||
      r.status === "LIMITADA" ||
      r.availability === "MODIFIED"
    )
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

  function BarList({
    items,
    max,
  }: {
    items: { name: string; count: number }[];
    max?: number;
  }) {
    const m = max ?? Math.max(1, ...items.map((i) => i.count));
    return (
      <div className="space-y-2">
        {items.map((i) => (
          <div key={i.name} className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div className="h-2 rounded bg-gray-100">
              <div
                className="h-2 rounded bg-gray-800"
                style={{ width: `${Math.min(100, (i.count / m) * 100)}%` }}
                title={`${i.count}`}
              />
            </div>
            <div className="text-xs text-gray-700 whitespace-nowrap">
              {i.name} ({i.count})
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <main className="min-h-[70vh] px-6 py-10">
      <header className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Parte clínico — Vista CT</h1>
          <p className="mt-1 text-sm text-gray-600">
            Métricas del período + lista diaria.{" "}
            <HelpTip text="Semáforo: Verde=Alta/Full · Amarillo=Reintegro/Modified · Rojo=Activo/Out" />
          </p>
        </div>

        {/* selector de mes (visible siempre; sólo afecta Métricas) */}
        <div className="flex items-center gap-2">
          <label className="text-sm">Mes</label>
          <input
            type="month"
            className="h-10 rounded-md border px-3 text-sm"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
      </header>

      {/* Tabs */}
      <div className="mb-4 flex w-full rounded-xl border p-1">
        {(["lista", "metricas"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t ? "bg-black text-white" : "text-gray-800 hover:bg-gray-50"
            }`}
          >
            {t === "lista" ? "Lista diaria" : "Métricas (mes)"}
          </button>
        ))}
      </div>

      {/* Métricas */}
      {tab === "metricas" && (
        <section className="mb-6 rounded-2xl border bg-white p-5">
          {loadingAn ? (
            <div className="text-gray-500">Cargando métricas…</div>
          ) : errAn ? (
            <div className="text-red-600">Error al cargar métricas: {errAn}</div>
          ) : an ? (
            <>
              <div className="mb-4 text-xs text-gray-500">
                Rango: {an.range.start} → {an.range.end}
              </div>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-xl border p-4">
                  <div className="text-xs text-gray-500">Episodios</div>
                  <div className="text-2xl font-bold">{an.totals.episodes}</div>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="text-xs text-gray-500">Jugadores afectados</div>
                  <div className="text-2xl font-bold">
                    {an.totals.playersAffected}
                  </div>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="text-xs text-gray-500">Prom. días estimados</div>
                  <div className="text-2xl font-bold">
                    {an.totals.avgEstimatedDays ?? "—"}
                  </div>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="text-xs text-gray-500">Estados</div>
                  <div className="text-sm">
                    BAJA {an.totals.statusCounts.BAJA} · RTP{" "}
                    {an.totals.statusCounts.REINTEGRO} · LIM{" "}
                    {an.totals.statusCounts.LIMITADA} · ALTA{" "}
                    {an.totals.statusCounts.ALTA}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border p-4">
                  <div className="mb-3 text-sm font-semibold">Top zonas</div>
                  {an.bodyPartTop.length ? (
                    <BarList items={an.bodyPartTop} />
                  ) : (
                    <div className="text-xs text-gray-500">Sin datos</div>
                  )}
                </div>
                <div className="rounded-xl border p-4">
                  <div className="mb-3 text-sm font-semibold">Top mecanismos</div>
                  {an.mechanismTop.length ? (
                    <BarList items={an.mechanismTop} />
                  ) : (
                    <div className="text-xs text-gray-500">Sin datos</div>
                  )}
                </div>
              </div>

              <div className="mt-6 rounded-xl border p-4">
                <div className="mb-3 text-sm font-semibold">
                  Top jugadores por días fuera (estimado)
                </div>
                {an.topPlayersByDaysOut.length ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-[480px] text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="px-3 py-2 text-left">Jugador</th>
                          <th className="px-3 py-2 text-right">Días</th>
                          <th className="px-3 py-2 text-right">Episodios</th>
                        </tr>
                      </thead>
                      <tbody>
                        {an.topPlayersByDaysOut.map((p) => (
                          <tr key={p.userId} className="border-b last:border-0">
                            <td className="px-3 py-2">{p.name}</td>
                            <td className="px-3 py-2 text-right">{p.daysOut}</td>
                            <td className="px-3 py-2 text-right">{p.episodes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">Sin datos</div>
                )}
              </div>
            </>
          ) : null}
        </section>
      )}

      {/* Lista diaria */}
      {tab === "lista" && (
        <section className="rounded-2xl border bg-white overflow-hidden">
          <div className="flex flex-col gap-2 border-b bg-gray-50 p-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm">Fecha</label>
              <input
                type="date"
                className="h-10 rounded-md border px-3 text-sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                className="w-full md:w-80 rounded-md border px-3 py-2 text-sm"
                placeholder="Buscar por jugador, zona o mecanismo…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button
                onClick={loadRows}
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
          </div>

          {loadingRows ? (
            <div className="p-4 text-gray-500">Cargando…</div>
          ) : errRows ? (
            <div className="p-4 text-red-600">Error al cargar: {errRows}</div>
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
                          className={`inline-block rounded-full border px-2 py-0.5 text-[11px] mr-2 ${badgeColor(
                            r
                          )}`}
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
                          {r.noChangeOfDirection ? (
                            <div>Sin cambios dir.</div>
                          ) : null}
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
      )}

      <div className="rounded-xl border bg-white p-3 text-xs text-gray-600 mt-3">
        <b>Nota:</b> Vista de lectura para CT. Los datos se cargan en el panel
        médico.
      </div>
    </main>
  );
}
