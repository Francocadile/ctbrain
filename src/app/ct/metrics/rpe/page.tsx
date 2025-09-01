// src/app/ct/metrics/rpe/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  id: string;
  playerKey?: string | null;
  userName?: string | null;
  date: string;
  rpe: number;
  duration?: number | null;
  load?: number | null;
};

function toYMD(d: Date) { return d.toISOString().slice(0,10); }

export default function RPECT() {
  const [date, setDate] = useState<string>(toYMD(new Date()));
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [bulkMin, setBulkMin] = useState<string>("90");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/metrics/rpe?date=${date}`, { cache: "no-store" });
    const data = res.ok ? await res.json() : [];
    const fixed = (Array.isArray(data) ? data : []).map((r: any) => ({
      ...r,
      userName: r.userName || r.playerKey || r.user?.name || r.user?.email || "Jugador",
    }));
    setRows(fixed);
    setLoading(false);
  }

  useEffect(() => { load(); }, [date]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(r =>
      (r.userName || "").toLowerCase().includes(t) ||
      (r.playerKey || "").toLowerCase().includes(t)
    );
  }, [rows, q]);

  async function applyDefaultDuration() {
    const minutes = Math.max(0, Number(bulkMin || 0));
    if (!minutes) { alert("Ingresá minutos > 0"); return; }
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
          id: row.id,       // para update directo
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

  return (
    <div className="p-4 space-y-4">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">RPE — Hoy</h1>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="rounded-md border px-2 py-1.5 text-sm"
            value={date}
            onChange={(e)=> setDate(e.target.value)}
          />
          <button onClick={load} className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50">Recargar</button>
        </div>
      </header>

      {/* Acciones rápidas */}
      <section className="rounded-xl border bg-white p-3 flex flex-wrap items-center gap-2">
        <div className="text-sm font-medium mr-2">Acciones:</div>
        <div className="flex items-center gap-2">
          <input
            className="w-20 rounded-md border px-2 py-1 text-sm"
            placeholder="min"
            value={bulkMin}
            onChange={(e)=> setBulkMin(e.target.value)}
            inputMode="numeric"
          />
          <button
            onClick={applyDefaultDuration}
            disabled={saving}
            className={`rounded-lg px-3 py-1.5 text-xs ${saving ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"}`}
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
        <div className="ml-auto text-xs text-gray-500">sRPE = RPE × minutos</div>
      </section>

      {/* Filtro */}
      <div className="flex items-center gap-2">
        <input
          className="w-full md:w-80 rounded-md border px-2 py-1.5 text-sm"
          placeholder="Buscar jugador…"
          value={q}
          onChange={(e)=> setQ(e.target.value)}
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
                  <th className="text-left px-3 py-2">RPE</th>
                  <th className="text-left px-3 py-2">Duración (min)</th>
                  <th className="text-left px-3 py-2">sRPE (AU)</th>
                  <th className="text-right px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{r.userName || r.playerKey || "Jugador"}</td>
                    <td className="px-3 py-2">{r.rpe}</td>
                    <td className="px-3 py-2">
                      <input
                        className="w-24 rounded-md border px-2 py-1 text-sm"
                        defaultValue={r.duration ?? ""}
                        onBlur={(e)=> saveOne(r, e.currentTarget.value)}
                        placeholder="min"
                        inputMode="numeric"
                      />
                    </td>
                    <td className="px-3 py-2">{(r.load ?? null) !== null ? r.load : "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end">
                        <button
                          onClick={()=> saveOne(r, "")}
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
    </div>
  );
}
