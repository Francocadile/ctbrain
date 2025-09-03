// src/app/ct/metrics/rpe/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import HelpTip from "@/components/HelpTip";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  playerKey?: string | null;
  userName?: string | null;
  user?: { name?: string; email?: string };
  date: string;
  rpe: number;
  duration?: number | null;
  load?: number | null; // sRPE (AU)
};

/** ---------- Utils ---------- */
function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}
function fromYMD(s: string) {
  const [y, m, dd] = s.split("-").map(Number);
  return new Date(y, m - 1, dd);
}
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
function mean(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
function srpeOf(r: Row) {
  const l = r.load;
  if (l != null) return Number(l);
  const dur = r.duration == null ? 0 : Number(r.duration);
  return Number(r.rpe ?? 0) * dur;
}

/** Barras inline para KPIs */
function BarsInline({
  values,
  maxHint,
  height = 60,
  barWidth = 12,
  gap = 4,
  titlePrefix = "",
  tone = "gray",
}: {
  values: number[];
  maxHint?: number;
  height?: number;
  barWidth?: number;
  gap?: number;
  titlePrefix?: string;
  tone?: "gray" | "emerald" | "amber" | "red";
}) {
  const max = Math.max(maxHint ?? 0, ...values, 1);
  const toneCls: Record<string, string> = {
    gray: "bg-gray-300",
    emerald: "bg-emerald-400/80",
    amber: "bg-amber-400/80",
    red: "bg-red-400/80",
  };
  return (
    <div className="flex items-end gap-1 overflow-x-auto" style={{ height }}>
      {values.map((v, i) => {
        const h = Math.max(2, Math.round((v / max) * (height - 10)));
        return (
          <div
            key={i}
            title={`${titlePrefix}${v}`}
            className={`rounded-sm ${toneCls[tone]}`}
            style={{ width: barWidth, height: h, marginRight: gap }}
          />
        );
      })}
    </div>
  );
}

/** ---------- Componente principal ---------- */
function RPECT() {
  type Tab = "respuestas" | "kpis" | "reportes";
  const search = useSearchParams();
  const initialTab = (search.get("tab") as Tab) || "respuestas";
  const [tab, setTab] = useState<Tab>(initialTab);
  function switchTab(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url.toString());
  }

  const [date, setDate] = useState<string>(toYMD(new Date()));
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [bulkMin, setBulkMin] = useState<string>("90");
  const [saving, setSaving] = useState(false);

  // KPIs de rango
  const [rangeDays, setRangeDays] = useState<7 | 14 | 21>(7);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [dailyTeamSRPE, setDailyTeamSRPE] = useState<number[]>([]); // hoy..hace N-1
  const [srpeHistBins, setSrpeHistBins] = useState<number[]>([0, 0, 0, 0, 0]); // 0–300 | 301–600 | 601–900 | 901–1200 | >1200

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/metrics/rpe?date=${date}`, { cache: "no-store" });
      const data = res.ok ? await res.json() : [];
      const fixed = (Array.isArray(data) ? data : []).map((r: any) => ({
        ...r,
        userName: r.userName || r.playerKey || r.user?.name || r.user?.email || "Jugador",
      }));
      setRows(fixed);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(
      (r) =>
        (r.userName || "").toLowerCase().includes(t) ||
        (r.playerKey || "").toLowerCase().includes(t)
    );
  }, [rows, q]);

  async function applyDefaultDuration() {
    const minutes = Math.max(0, Number(bulkMin || 0));
    if (!minutes) {
      alert("Ingresá minutos > 0");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/metrics/rpe/default-duration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, duration: minutes }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e: any) {
      alert(e?.message || "Error aplicando duración");
    } finally {
      setSaving(false);
    }
  }

  async function clearDurations() {
    if (!confirm(`¿Poner en blanco la duración del ${date}?`)) return;
    setSaving(true);
    try {
      const res = await fetch("/api/metrics/rpe/clear-duration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e: any) {
      alert(e?.message || "Error limpiando duraciones");
    } finally {
      setSaving(false);
    }
  }

  async function saveOne(row: Row, newMinStr: string) {
    const minutes = newMinStr === "" ? null : Math.max(0, Number(newMinStr));
    setSaving(true);
    try {
      const res = await fetch("/api/metrics/rpe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id, // update directo
          date,
          rpe: row.rpe,
          duration: minutes,
          playerKey: row.playerKey || row.userName || "Jugador",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e: any) {
      alert(e?.message || "Error guardando fila");
    } finally {
      setSaving(false);
    }
  }

  // ----- KPIs del día -----
  const kpisDay = useMemo(() => {
    const n = rows.length;
    const withDur = rows.filter((r) => r.duration != null && Number(r.duration) > 0).length;
    const rpeAvg = n ? mean(rows.map((r) => Number(r.rpe || 0))) : 0;
    const totalSRPE = rows
      .map((r) => srpeOf(r))
      .filter((v) => !Number.isNaN(v))
      .reduce((a, b) => a + b, 0);

    // distribución por RPE del día (intensidad percibida)
    let b1 = 0,
      b2 = 0,
      b3 = 0;
    for (const r of rows) {
      const v = Number(r.rpe || 0);
      if (v <= 3) b1++;
      else if (v <= 6) b2++;
      else b3++;
    }

    return {
      n,
      withDur,
      withDurPct: n ? Math.round((withDur / n) * 100) : 0,
      rpeAvg,
      totalSRPE,
      distRPE: { low: b1, mid: b2, high: b3 },
    };
  }, [rows]);

  // ----- KPIs de rango (fetch por día, igual que Wellness) -----
  useEffect(() => {
    if (tab !== "kpis") return;
    (async () => {
      setRangeLoading(true);
      try {
        const days = Array.from({ length: rangeDays }, (_, i) =>
          toYMD(addDays(fromYMD(date), -i))
        );
        const dailyTeam: number[] = [];
        const allIndividual: number[] = [];

        for (const d of days) {
          const res = await fetch(`/api/metrics/rpe?date=${d}`, { cache: "no-store" });
          const arr = res.ok ? await res.json() : [];
          const fixed: Row[] = (Array.isArray(arr) ? arr : []).map((r: any) => ({
            ...r,
            userName: r.userName || r.playerKey || r.user?.name || r.user?.email || "Jugador",
          }));

          const srpes = fixed.map(srpeOf).filter((v) => !Number.isNaN(v));
          dailyTeam.push(srpes.reduce((a, b) => a + b, 0));
          allIndividual.push(...srpes);
        }

        // histograma individual (AU) en el rango
        const bins = [0, 0, 0, 0, 0]; // 0–300 | 301–600 | 601–900 | 901–1200 | >1200
        for (const v of allIndividual) {
          if (v <= 300) bins[0]++;
          else if (v <= 600) bins[1]++;
          else if (v <= 900) bins[2]++;
          else if (v <= 1200) bins[3]++;
          else bins[4]++;
        }

        setDailyTeamSRPE(dailyTeam); // hoy..hace N-1
        setSrpeHistBins(bins);
      } finally {
        setRangeLoading(false);
      }
    })();
  }, [date, rangeDays, tab]);

  /** -------------------- UI -------------------- */
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">
            RPE — Día (CT){" "}
            <HelpTip text="RPE 0–10 respondido 30' post-sesión. El CT define la duración; sRPE = RPE×min." />
          </h1>
          <p className="text-xs text-gray-500">
            {rows.length} registros • sRPE = RPE × minutos
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
            onClick={load}
            className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50"
          >
            Recargar
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="rounded-xl border bg-white p-1 flex gap-1">
        {[
          { key: "respuestas", label: "Respuestas" },
          { key: "kpis", label: "KPIs" },
          { key: "reportes", label: "Reportes" },
        ].map((t) => {
          const active = tab === (t.key as Tab);
          return (
            <button
              key={t.key}
              onClick={() => switchTab(t.key as Tab)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active ? "bg-black text-white" : "hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* ----- Tab: Respuestas (operativa) ----- */}
      {tab === "respuestas" && (
        <>
          {/* Acciones rápidas */}
          <section className="rounded-xl border bg-white p-3 flex flex-wrap items-center gap-2">
            <div className="text-sm font-medium mr-2">
              Acciones:{" "}
              <HelpTip text="“Aplicar a vacíos” asigna X minutos a filas sin duración. “Limpiar” borra las duraciones del día." />
            </div>
            <div className="flex items-center gap-2">
              <input
                className="w-20 rounded-md border px-2 py-1 text-sm"
                placeholder="min"
                value={bulkMin}
                onChange={(e) => setBulkMin(e.target.value)}
                inputMode="numeric"
              />
              <button
                onClick={applyDefaultDuration}
                disabled={saving}
                className={`rounded-lg px-3 py-1.5 text-xs ${
                  saving ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"
                }`}
              >
                Aplicar a vacíos
              </button>
            </div>
            <div className="h-5 w-px bg-gray-300 mx-1" />
            <button
              onClick={clearDurations}
              disabled={saving}
              className="rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50"
            >
              Limpiar minutos del día
            </button>
            <div className="ml-auto text-xs text-gray-500">
              sRPE = RPE × minutos{" "}
              <HelpTip text="La AU se recalcula al guardar. Si la duración está vacía, no hay AU." />
            </div>
          </section>

          {/* Filtro */}
          <div className="flex items-center gap-2">
            <input
              className="w-full md:w-80 rounded-md border px-2 py-1.5 text-sm"
              placeholder="Buscar jugador…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <span className="text-[12px] text-gray-500">{filtered.length} resultado(s)</span>
          </div>

          {/* Tabla */}
          <section className="rounded-2xl border bg-white overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 text-[12px] font-semibold uppercase">Entradas</div>
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
                      <th className="text-left px-3 py-2">
                        RPE <HelpTip text="Esfuerzo percibido (0–10). 0=descanso, 10=máximo." />
                      </th>
                      <th className="text-left px-3 py-2">
                        Duración (min){" "}
                        <HelpTip text="Minutos de la sesión definidos por el CT. Podés editarlos por fila." />
                      </th>
                      <th className="text-left px-3 py-2">
                        sRPE (AU) <HelpTip text="RPE × minutos. Se actualiza al guardar cambios." />
                      </th>
                      <th className="text-right px-3 py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="px-3 py-2 font-medium">
                          {r.userName || r.playerKey || "Jugador"}
                        </td>
                        <td className="px-3 py-2">{r.rpe}</td>
                        <td className="px-3 py-2">
                          <input
                            className="w-24 rounded-md border px-2 py-1 text-sm"
                            defaultValue={r.duration ?? ""}
                            onBlur={(e) => saveOne(r, e.currentTarget.value)}
                            placeholder="min"
                            inputMode="numeric"
                          />
                        </td>
                        <td className="px-3 py-2">
                          {(r.load ?? null) !== null ? Math.round(Number(r.load)) : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end">
                            <button
                              onClick={() => saveOne(r, "")}
                              className="rounded-lg border px-2 py-1 text-[11px] hover:bg-gray-50"
                            >
                              Vaciar
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
        </>
      )}

      {/* ----- Tab: KPIs ----- */}
      {tab === "kpis" && (
        <>
          {/* KPIs del día */}
          <section className="rounded-2xl border bg-white px-4 py-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="rounded-xl border p-3">
                <div className="text-[11px] uppercase text-gray-500">Respondieron hoy</div>
                <div className="mt-1 text-2xl font-bold">{kpisDay.n}</div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-[11px] uppercase text-gray-500">Con duración</div>
                <div className="mt-1 text-2xl font-bold">
                  {kpisDay.withDur}{" "}
                  <span className="text-sm font-semibold text-gray-500">
                    ({kpisDay.withDurPct}%)
                  </span>
                </div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-[11px] uppercase text-gray-500">RPE promedio</div>
                <div className="mt-1 text-2xl font-bold">
                  {kpisDay.rpeAvg ? kpisDay.rpeAvg.toFixed(2) : "—"}
                </div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-[11px] uppercase text-gray-500">sRPE total (AU)</div>
                <div className="mt-1 text-2xl font-bold">
                  {kpisDay.totalSRPE ? Math.round(kpisDay.totalSRPE) : "—"}
                </div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-[11px] uppercase text-gray-500">
                  Distribución RPE (0–3 / 4–6 / 7–10)
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {kpisDay.distRPE.low} / {kpisDay.distRPE.mid} / {kpisDay.distRPE.high}
                </div>
              </div>
            </div>
          </section>

          {/* KPIs de RANGO (7/14/21) */}
          <section className="rounded-2xl border bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[12px] font-semibold uppercase">
                KPIs últimos{" "}
                <select
                  className="ml-1 border rounded-md px-1 py-0.5 text-xs"
                  value={rangeDays}
                  onChange={(e) => setRangeDays(Number(e.target.value) as 7 | 14 | 21)}
                >
                  <option value={7}>7</option>
                  <option value={14}>14</option>
                  <option value={21}>21</option>
                </select>{" "}
                días
                <HelpTip text="Serie diaria de sRPE del equipo y distribución individual de AU en el rango. Calculado en cliente llamando por día." />
              </div>
              <div className="text-xs text-gray-500">
                {rangeLoading ? "Calculando…" : `${dailyTeamSRPE.length} día(s)`}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <div className="rounded-xl border p-3 md:col-span-2">
                <div className="text-[11px] uppercase text-gray-500 mb-1">
                  sRPE equipo — serie diaria (AU)
                </div>
                <BarsInline
                  values={dailyTeamSRPE}
                  titlePrefix="AU: "
                  tone="emerald"
                  maxHint={Math.max(...dailyTeamSRPE, 2000)}
                />
                <div className="mt-2 text-xs text-gray-600">
                  Promedio:{" "}
                  <b>
                    {dailyTeamSRPE.length ? Math.round(mean(dailyTeamSRPE)) : "—"}
                  </b>{" "}
                  AU/día
                </div>
              </div>

              <div className="rounded-xl border p-3">
                <div className="text-[11px] uppercase text-gray-500 mb-1">
                  Histograma individual (AU)
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label: "0–300", v: srpeHistBins[0] },
                    { label: "301–600", v: srpeHistBins[1] },
                    { label: "601–900", v: srpeHistBins[2] },
                    { label: "901–1200", v: srpeHistBins[3] },
                    { label: ">1200", v: srpeHistBins[4] },
                  ].map((b, i) => (
                    <div key={i} className="rounded-lg border p-2 text-center">
                      <div className="text-[11px] text-gray-600">{b.label}</div>
                      <div className="text-lg font-semibold">{b.v}</div>
                      <div className="mt-1">
                        <BarsInline values={[b.v]} height={40} barWidth={18} gap={0} tone="amber" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ----- Tab: Reportes (skeleton) ----- */}
      {tab === "reportes" && (
        <section className="rounded-2xl border bg-white p-3">
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-semibold uppercase">
              Reportes individuales
              <HelpTip text="MVP: listado por jugador con sRPE del día. Luego linkeamos al Perfil de Jugador unificado." />
            </div>
            <div className="text-xs text-gray-500">{rows.length} jugador(es)</div>
          </div>

          {loading ? (
            <div className="p-3 text-gray-500">Cargando…</div>
          ) : rows.length === 0 ? (
            <div className="p-3 text-gray-500 italic">Sin datos hoy</div>
          ) : (
            <ul className="mt-2 grid md:grid-cols-2 lg:grid-cols-3 gap-2">
              {rows
                .slice()
                .sort(
                  (a, b) =>
                    (a.userName || "").localeCompare(b.userName || "") ||
                    (srpeOf(b) - srpeOf(a))
                )
                .map((r) => {
                  const au = srpeOf(r);
                  return (
                    <li key={r.id} className="rounded-lg border p-3">
                      <div className="font-medium">
                        {r.userName || r.playerKey || "Jugador"}
                      </div>
                      <div className="text-xs text-gray-500">
                        RPE: <b>{r.rpe}</b> • Min:{" "}
                        <b>{r.duration != null ? r.duration : "—"}</b> • sRPE:{" "}
                        <b>{au ? Math.round(au) : "—"} AU</b>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          disabled
                          className="rounded-lg border px-2 py-1 text-xs text-gray-400 cursor-not-allowed"
                          title="Próximamente"
                        >
                          Abrir perfil
                        </button>
                        <button
                          onClick={() => {
                            alert(
                              `Resumen rápido — ${r.userName || r.playerKey || "Jugador"}\nRPE: ${
                                r.rpe
                              }\nMin: ${r.duration ?? "—"}\nsRPE: ${au ? Math.round(au) : "—"} AU`
                            );
                          }}
                          className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                        >
                          Resumen rápido
                        </button>
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

/** Wrapper con Suspense (requerido por useSearchParams) */
export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-gray-500">Cargando…</div>}>
      <RPECT />
    </Suspense>
  );
}
