// src/app/ct/metrics/rpe/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type RPE = {
  id: string;
  userId: string;
  date: string;        // ISO
  sessionId?: string | null;
  rpe: number;
  duration?: number | null;
  load?: number | null;
};

function toYMD(d: Date) { return d.toISOString().slice(0,10); }

export default function RPECTPage() {
  const today = useMemo(() => new Date(), []);
  const twoWeeksAgo = useMemo(() => { const d=new Date(); d.setUTCDate(d.getUTCDate()-14); return d; }, []);
  const [from, setFrom] = useState<string>(toYMD(twoWeeksAgo));
  const [to, setTo] = useState<string>(toYMD(today));
  const [userId, setUserId] = useState<string>("");

  const [list, setList] = useState<RPE[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      if (userId.trim()) qs.set("userId", userId.trim());
      const res = await fetch(`/api/metrics/rpe?${qs.toString()}`, { cache: "no-store" });
      const data = await res.json();
      setList(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const byUser = useMemo(() => {
    const m = new Map<string, RPE[]>();
    list.forEach(r => {
      if (!m.has(r.userId)) m.set(r.userId, []);
      m.get(r.userId)!.push(r);
    });
    for (const arr of m.values()) arr.sort((a,b) => a.date.localeCompare(b.date));
    return m;
  }, [list]);

  const rows = useMemo(() => {
    // resumen por user: total sRPE semanal (aprox) y promedios
    const out: Array<{
      userId: string;
      count: number;
      lastDate: string;
      lastRPE: number;
      lastDuration: number | null;
      lastLoad: number | null;
      weeklyLoad: number;
      avgRPE: number;
    }> = [];

    const start = new Date(from + "T00:00:00Z");
    const weekAgo = new Date(start);
    weekAgo.setUTCDate(weekAgo.getUTCDate() + 7);

    for (const [uid, arr] of byUser) {
      if (arr.length === 0) continue;
      const last = arr[arr.length - 1];
      const lastLoad = last.load ?? (last.duration != null ? last.rpe * last.duration : null);

      const within7 = arr.filter(r => {
        const t = new Date(r.date);
        return t >= start && t < weekAgo;
      });
      const weeklyLoad = within7.reduce((acc,r)=> acc + (r.load ?? (r.duration != null ? r.rpe * r.duration : 0)), 0);

      const avgRPE = arr.reduce((acc,r)=> acc + r.rpe, 0) / arr.length;

      out.push({
        userId: uid,
        count: arr.length,
        lastDate: last.date.slice(0,10),
        lastRPE: last.rpe,
        lastDuration: last.duration ?? null,
        lastLoad,
        weeklyLoad: Math.round(weeklyLoad),
        avgRPE: Math.round(avgRPE * 10) / 10,
      });
    }

    // ordenar: mayor carga semanal primero
    out.sort((a,b)=> b.weeklyLoad - a.weeklyLoad);
    return out;
  }, [byUser, from]);

  return (
    <div className="p-4 space-y-4">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-bold">RPE — Visor CT</h1>
          <p className="text-xs text-gray-500">Respuestas de jugadores (solo lectura) · sRPE = RPE × duración</p>
        </div>
        <div className="flex gap-2">
          <a href="/ct/dashboard" className="rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50">← Dashboard</a>
        </div>
      </header>

      {/* Filtros */}
      <section className="rounded-2xl border bg-white shadow-sm p-3">
        <div className="grid md:grid-cols-5 gap-2">
          <div className="space-y-1">
            <label className="text-[11px] text-gray-500">Desde</label>
            <input type="date" className="w-full rounded-md border px-2 py-1.5 text-sm" value={from} onChange={e=>setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-gray-500">Hasta</label>
            <input type="date" className="w-full rounded-md border px-2 py-1.5 text-sm" value={to} onChange={e=>setTo(e.target.value)} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-[11px] text-gray-500">Filtrar por userId (MVP)</label>
            <input className="w-full rounded-md border px-2 py-1.5 text-sm" value={userId} onChange={e=>setUserId(e.target.value)} placeholder="(opcional)" />
          </div>
          <div className="space-y-1 flex items-end">
            <button onClick={load} className="rounded-md border px-3 py-1.5 text-sm bg-black text-white hover:opacity-90">
              Aplicar
            </button>
          </div>
        </div>
      </section>

      {/* Resumen por jugador */}
      <section className="rounded-2xl border bg-white shadow-sm overflow-x-auto">
        <div className="px-3 py-2 border-b bg-gray-50 text-[12px] uppercase tracking-wide font-semibold">Resumen</div>
        {loading ? (
          <div className="p-3 text-gray-500">Cargando…</div>
        ) : rows.length === 0 ? (
          <div className="p-3 text-gray-500 italic">Sin datos</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-2">User</th>
                <th className="text-left p-2">N</th>
                <th className="text-left p-2">Última fecha</th>
                <th className="text-left p-2">Último RPE</th>
                <th className="text-left p-2">Últ. Dur (min)</th>
                <th className="text-left p-2">Últ. sRPE</th>
                <th className="text-left p-2">sRPE semana (aprox)</th>
                <th className="text-left p-2">RPE promedio</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.userId} className="border-b">
                  <td className="p-2 font-medium">{r.userId}</td>
                  <td className="p-2">{r.count}</td>
                  <td className="p-2">{r.lastDate}</td>
                  <td className="p-2">{r.lastRPE}</td>
                  <td className="p-2">{r.lastDuration ?? "—"}</td>
                  <td className="p-2">{r.lastLoad ?? "—"}</td>
                  <td className="p-2">{r.weeklyLoad}</td>
                  <td className="p-2">{r.avgRPE}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Detalle crudo */}
      <section className="rounded-2xl border bg-white shadow-sm overflow-x-auto">
        <div className="px-3 py-2 border-b bg-gray-50 text-[12px] uppercase tracking-wide font-semibold">Detalle</div>
        {loading ? (
          <div className="p-3 text-gray-500">Cargando…</div>
        ) : list.length === 0 ? (
          <div className="p-3 text-gray-500 italic">Sin datos</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-2">Fecha</th>
                <th className="text-left p-2">User</th>
                <th className="text-left p-2">RPE</th>
                <th className="text-left p-2">Duración</th>
                <th className="text-left p-2">sRPE</th>
                <th className="text-left p-2">SessionId</th>
              </tr>
            </thead>
            <tbody>
              {list.map(r => {
                const load = r.load ?? (r.duration != null ? r.rpe * r.duration : null);
                return (
                  <tr key={r.id} className="border-b">
                    <td className="p-2">{r.date.slice(0,10)}</td>
                    <td className="p-2">{r.userId}</td>
                    <td className="p-2">{r.rpe}</td>
                    <td className="p-2">{r.duration ?? "—"}</td>
                    <td className="p-2">{load ?? "—"}</td>
                    <td className="p-2">{r.sessionId || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
