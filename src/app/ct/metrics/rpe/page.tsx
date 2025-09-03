// src/app/ct/metrics/rpe/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import HelpTip from "@/components/HelpTip";

type Row = {
  id: string;
  playerKey?: string | null;
  user?: { name?: string | null; email?: string | null };
  userName?: string | null;
  date: string; // YYYY-MM-DD
  rpe: number; // 0..10
  duration?: number | null; // minutos
  load?: number | null; // AU (rpe*min)
};

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
function yesterday(ymd: string) {
  return toYMD(addDays(fromYMD(ymd), -1));
}

function sum(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0);
}
function mean(arr: number[]) {
  if (!arr.length) return 0;
  return sum(arr) / arr.length;
}

export default function RPECT() {
  const [date, setDate] = useState<string>(toYMD(new Date()));
  const [rows, setRows] = useState<Row[]>([]);
  const [rowsYesterday, setRowsYesterday] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [bulkMin, setBulkMin] = useState<string>("90");
  const [saving, setSaving] = useState(false);

  async function fetchDay(d: string): Promise<Row[]> {
    const res = await fetch(`/api/metrics/rpe?date=${d}`, { cache: "no-store" });
    const data = res.ok ? await res.json() : [];
    const fixed = (Array.isArray(data) ? data : []).map((r: any) => ({
      ...r,
      userName:
        r.userName || r.playerKey || r.user?.name || r.user?.email || "Jugador",
    }));
    return fixed;
  }

  async function load() {
    setLoading(true);
    const [today, yday] = await Promise.all([fetchDay(date), fetchDay(yesterday(date))]);
    setRows(today);
    setRowsYesterday(yday);
    setLoading(false);
  }

  useEffect(() => {
    load();
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

  // ----- KPIs del día -----
  const kpis = useMemo(() => {
    const n = rows.length;
    const withDur = rows.filter((r) => r.duration != null);
    const pctDur = n ? Math.round((withDur.length / n) * 100) : 0;

    const sToday = sum(
      rows.map((r) =>
        r.load != null
          ? Number(r.load)
          : r.duration != null
          ? Number(r.rpe) * Number(r.duration)
          : 0
      )
    );
    const sYesterday = sum(
      rowsYesterday.map((r) =>
        r.load != null
          ? Number(r.load)
          : r.duration != null
          ? Number(r.rpe) * Number(r.duration)
          : 0
      )
    );
    const delta = sToday - sYesterday;

    const rpeVals = rows.map((r) => Number(r.rpe)).filter((v) => !Number.isNaN(v));
    const rpeAvg = rpeVals.length ? mean(rpeVals) : 0;

    // Distribución por bandas de RPE
    let low = 0,
      mid = 0,
      hi = 0;
    for (const r of rows) {
      const v = Number(r.rpe || 0);
      if (v <= 3) low++;
      else if (v <= 6) mid++;
      else hi++;
    }
    const dist = n
      ? {
          lowPct: Math.round((low / n) * 100),
          midPct: Math.round((mid / n) * 100),
          hiPct: Math.round((hi / n) * 100),
          low,
          mid,
          hi,
        }
      : { lowPct: 0, midPct: 0, hiPct: 0, low: 0, mid: 0, hi: 0 };

    return { n, pctDur, sToday, sYesterday, delta, rpeAvg, dist };
  }, [rows, rowsYesterday]);

  // ----- Acciones -----
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

  // ----- Export CSV -----
  function exportCSV() {
    const header = ["Jugador", "Fecha", "RPE", "Duración_min", "sRPE_AU"];
    const lines = [header.join(",")];
    for (const r of filtered) {
      const nm = r.userName || r.playerKey || "Jugador";
      const srpe =
        r.load != null
          ? Number(r.load)
          : r.duration != null
          ? Number(r.rpe) * Number(r.duration)
          : "";
      lines.push(
        [
          `"${String(nm).replace(/"/g, '""')}"`,
          r.date,
          r.rpe,
          r.duration ?? "",
          srpe,
        ].join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rpe_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">
            RPE — Día (CT){" "}
            <HelpTip text="RPE 0–10 (≈30' post-sesión). El CT define la duración; sRPE = RPE×min. KPIs y comparación con ayer para ajustar carga." />
          </h1>
          <p className="text-xs text-gray-500">
            {rows.length} registros • Ayer: {rowsYesterday.length} registros
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
          <button
            onClick={exportCSV}
            className="rounded-lg bg-black text-white px-3 py-1.5 text-sm hover:opacity-90"
          >
            Exportar CSV
          </button>
        </div>
      </header>

      {/* KPIs del día */}
      <section className="rounded-2xl border bg-white px-4 py-3">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="rounded-xl border p-3">
            <div className="text-[11px] uppercase text-gray-500 flex items-center gap-1">
              Respondieron hoy
              <HelpTip text="Cantidad de jugadores con RPE cargado en la fecha seleccionada." />
            </div>
            <div className="mt-1 text-2xl font-bold">{kpis.n}</div>
          </div>

          <div className="rounded-xl border p-3">
            <div className="text-[11px] uppercase text-gray-500 flex items-center gap-1">
              sRPE total (AU)
              <HelpTip text="Suma de RPE×min de todos los jugadores (día)." />
            </div>
            <div className="mt-1 text-2xl font-bold">{kpis.sToday}</div>
            <div className="mt-1 text-xs text-gray-600">
              Ayer: <b>{kpis.sYesterday}</b>{" "}
              <span
                className={
                  kpis.delta > 0 ? "text-red-600 font-semibold" : "text-emerald-700 font-semibold"
                }
              >
                ({kpis.delta > 0 ? "+" : ""}
                {kpis.delta})
              </span>
            </div>
          </div>

          <div className="rounded-xl border p-3">
            <div className="text-[11px] uppercase text-gray-500 flex items-center gap-1">
              RPE promedio
              <HelpTip text="Promedio aritmético de RPE entre los que reportaron hoy." />
            </div>
            <div className="mt-1 text-2xl font-bold">
              {kpis.rpeAvg ? kpis.rpeAvg.toFixed(2) : "—"}
            </div>
          </div>

          <div className="rounded-xl border p-3">
            <div className="text-[11px] uppercase text-gray-500 flex items-center gap-1">
              Con duración
              <HelpTip text="% de filas con minutos definidos (necesario para AU)." />
            </div>
            <div className="mt-1 text-2xl font-bold">{kpis.pctDur}%</div>
          </div>

          <div className="rounded-xl border p-3 col-span-2">
            <div className="text-[11px] uppercase text-gray-500 flex items-center gap-1">
              Distribución RPE (0–3 / 4–6 / 7–10)
              <HelpTip text="Lectura rápida de la intensidad percibida del grupo." />
            </div>
            <div className="mt-1 text-sm font-semibold">
              <span className="text-gray-700">{kpis.dist.low}</span>{" "}
              <span className="text-gray-400">/</span>{" "}
              <span className="text-gray-700">{kpis.dist.mid}</span>{" "}
              <span className="text-gray-400">/</span>{" "}
              <span className="text-gray-700">{kpis.dist.hi}</span>
            </div>
            <div className="mt-2 h-2 w-full rounded bg-gray-100 overflow-hidden">
              <div
                className="h-2 bg-gray-300 inline-block"
                style={{ width: `${kpis.dist.lowPct}%` }}
                title={`0–3: ${kpis.dist.lowPct}%`}
              />
              <div
                className="h-2 bg-amber-400/80 inline-block"
                style={{ width: `${kpis.dist.midPct}%` }}
                title={`4–6: ${kpis.dist.midPct}%`}
              />
              <div
                className="h-2 bg-red-400/80 inline-block"
                style={{ width: `${kpis.dist.hiPct}%` }}
                title={`7–10: ${kpis.dist.hiPct}%`}
              />
            </div>
            <div className="mt-1 text-[11px] text-gray-500">
              Nota: Más peso en 7–10 puede requerir ajustar carga en la sesión siguiente.
            </div>
          </div>
        </div>
      </section>

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
                {filtered.map((r) => {
                  const srpe =
                    r.load != null
                      ? Number(r.load)
                      : r.duration != null
                      ? Number(r.rpe) * Number(r.duration)
                      : null;
                  return (
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
                      <td className="px-3 py-2">{srpe != null ? srpe : "—"}</td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
