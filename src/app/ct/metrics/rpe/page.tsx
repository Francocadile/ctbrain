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
  category?: { band: string; color: "green"|"yellow"|"orange"|"red"|"gray"; label: string };
};

function toYMD(d: Date) { return d.toISOString().slice(0,10); }

function badge(color: RPE["category"]["color"]) {
  const map:any = {
    green:  "text-emerald-700 bg-emerald-50 border-emerald-200",
    yellow: "text-amber-700 bg-amber-50 border-amber-200",
    orange: "text-orange-700 bg-orange-50 border-orange-200",
    red:    "text-red-700 bg-red-50 border-red-200",
    gray:   "text-gray-700 bg-gray-50 border-gray-200",
  };
  return map[color] || map.gray;
}

function weeklyBand(total: number) {
  if (total < 2000) return { label: "<2000 AU (baja)", color: "red" as const };
  if (total <= 4000) return { label: "2000–4000 AU (óptima)", color: "green" as const };
  if (total <= 5000) return { label: "4000–5000 AU (alta)", color: "orange" as const };
  return { label: ">5000 AU (muy alta)", color: "red" as const };
}

export default function RPECTPage() {
  const today = useMemo(() => new Date(), []);
  const twoWeeksAgo = useMemo(() => { const d=new Date(); d.setUTCDate(d.getUTCDate()-14); return d; }, []);
  const [from, setFrom] = useState<string>(toYMD(twoWeeksAgo));
  const [to, setTo] = useState<string>(toYMD(today));
  const [userId, setUserId] = useState<string>("");

  // Duración por fecha (CT)
  const [durationDate, setDurationDate] = useState<string>(toYMD(today));
  const [durationMin, setDurationMin]   = useState<string>("90");
  const [posting, setPosting] = useState(false);

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
      setList(await res.json());
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-line */ }, []);

  async function applyDefaultDuration() {
    const d = durationDate.trim();
    const mins = Math.max(0, Number(durationMin));
    if (!d || !mins) { alert("Fecha y minutos válidos"); return; }
    setPosting(true);
    try {
      const res = await fetch("/api/metrics/rpe/default-duration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: d, duration: mins }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
      alert("Duración aplicada a respuestas sin duración de esa fecha.");
    } catch (e:any) {
      alert(e?.message || "No se pudo aplicar");
    } finally {
      setPosting(false);
    }
  }

  // Agrupaciones
  const byUser = useMemo(() => {
    const m = new Map<string, RPE[]>();
    list.forEach(r => { if (!m.has(r.userId)) m.set(r.userId, []); m.get(r.userId)!.push(r); });
    for (const arr of m.values()) arr.sort((a,b)=>a.date.localeCompare(b.date));
    return m;
  }, [list]);

  // Resumen por user
  const rows = useMemo(() => {
    const out: Array<{
      userId: string;
      count: number;
      lastDate: string;
      lastRPE: number;
      lastDuration: number | null;
      lastLoad: number | null;
      lastBand: RPE["category"]["band"];
      lastBandColor: RPE["category"]["color"];
      weeklyTotal: number;
      weeklyBadge: ReturnType<typeof weeklyBand>;
    }> = [];

    // rango semanal (últimos 7 días desde 'to')
    const end = new Date(to + "T00:00:00Z"); const start = new Date(end); start.setUTCDate(start.getUTCDate()-6);

    for (const [uid, arr] of byUser) {
      if (!arr.length) continue;
      const last = arr[arr.length - 1];
      const lastLoad = last.load ?? (last.duration != null ? last.rpe * last.duration : null);
      const lastBand = last.category?.band ?? "ND";
      const lastBandColor = last.category?.color ?? "gray";

      const week = arr.filter(r => {
        const t = new Date(r.date);
        return t >= start && t <= end;
      });
      const weeklyTotal = week.reduce((acc,r)=> acc + (r.load ?? (r.duration != null ? r.rpe * r.duration : 0)), 0);
      const wb = weeklyBand(weeklyTotal);

      out.push({
        userId: uid,
        count: arr.length,
        lastDate: last.date.slice(0,10),
        lastRPE: last.rpe,
        lastDuration: last.duration ?? null,
        lastLoad: lastLoad ?? null,
        lastBand,
        lastBandColor,
        weeklyTotal: Math.round(weeklyTotal),
        weeklyBadge: wb,
      });
    }
    // ordenar por weeklyTotal desc
    out.sort((a,b)=> b.weeklyTotal - a.weeklyTotal);
    return out;
  }, [byUser, to]);

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-bold">RPE — Visor CT (sRPE = RPE × duración)</h1>
          <p className="text-xs text-gray-500">El jugador envía RPE (0–10). El CT fija la duración (min). sRPE en AU.</p>
        </div>
        <a href="/ct/dashboard" className="rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50">← Dashboard</a>
      </header>

      {/* Fijar duración por fecha (aplica a respuestas sin duración) */}
      <section className="rounded-2xl border bg-white shadow-sm p-3">
        <div className="text-[12px] font-semibold uppercase tracking-wide mb-2">Duración por fecha (CT)</div>
        <div className="grid md:grid-cols-5 gap-2">
          <div><label className="text-[11px] text-gray-500">Fecha</label>
            <input type="date" className="w-full rounded-md border px-2 py-1.5 text-sm" value={durationDate} onChange={e=>setDurationDate(e.target.value)} />
          </div>
          <div><label className="text-[11px] text-gray-500">Duración (min)</label>
            <input type="number" min={0} className="w-full rounded-md border px-2 py-1.5 text-sm" value={durationMin} onChange={e=>setDurationMin(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button onClick={applyDefaultDuration} disabled={posting}
              className={`rounded-md border px-3 py-1.5 text-sm ${posting?"bg-gray-200 text-gray-500":"bg-black text-white hover:opacity-90"}`}>
              {posting? "Aplicando…":"Aplicar a esa fecha"}
            </button>
          </div>
          <div className="md:col-span-2 text-xs text-gray-500 flex items-end">
            Completa <b>duration</b> y <b>load</b> en RPE sin duración de ese día. Luego el semáforo se actualiza.
          </div>
        </div>
      </section>

      {/* Filtros */}
      <section className="rounded-2xl border bg-white shadow-sm p-3">
        <div className="grid md:grid-cols-5 gap-2">
          <div><label className="text-[11px] text-gray-500">Desde</label><input type="date" className="w-full rounded-md border px-2 py-1.5 text-sm" value={from} onChange={e=>setFrom(e.target.value)} /></div>
          <div><label className="text-[11px] text-gray-500">Hasta</label><input type="date" className="w-full rounded-md border px-2 py-1.5 text-sm" value={to} onChange={e=>setTo(e.target.value)} /></div>
          <div className="md:col-span-2"><label className="text-[11px] text-gray-500">userId (opcional)</label><input className="w-full rounded-md border px-2 py-1.5 text-sm" value={userId} onChange={e=>setUserId(e.target.value)} /></div>
          <div className="flex items-end"><button onClick={load} className="rounded-md border px-3 py-1.5 text-sm bg-black text-white hover:opacity-90">Aplicar</button></div>
        </div>
      </section>

      {/* Resumen por jugador con semáforo */}
      <section className="rounded-2xl border bg-white shadow-sm overflow-x-auto">
        <div className="px-3 py-2 border-b bg-gray-50 text-[12px] uppercase tracking-wide font-semibold">Resumen (Semáforo sesión + semanal)</div>
        {loading ? (
          <div className="p-3 text-gray-500">Cargando…</div>
        ) : rows.length === 0 ? (
          <div className="p-3 text-gray-500 italic">Sin datos</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-2">User</th>
                <th className="text-left p-2">Últ. fecha</th>
                <th className="text-left p-2">RPE</th>
                <th className="text-left p-2">Duración</th>
                <th className="text-left p-2">sRPE (AU)</th>
                <th className="text-left p-2">Semáforo sesión</th>
                <th className="text-left p-2">Total semana</th>
                <th className="text-left p-2">Semáforo semana</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.userId} className="border-b">
                  <td className="p-2 font-medium">{r.userId}</td>
                  <td className="p-2">{r.lastDate}</td>
                  <td className="p-2">{r.lastRPE}</td>
                  <td className="p-2">{r.lastDuration ?? "—"}</td>
                  <td className="p-2">{r.lastLoad ?? "—"}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded border text-[12px] ${badge(r.lastBandColor)}`}>
                      {r.lastBand}
                    </span>
                  </td>
                  <td className="p-2">{r.weeklyTotal}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded border text-[12px] ${r.weeklyBadge.color==="green"
                      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                      : r.weeklyBadge.color==="orange"
                      ? "text-orange-700 bg-orange-50 border-orange-200"
                      : "text-red-700 bg-red-50 border-red-200"}`}>
                      {r.weeklyBadge.label}
                    </span>
                  </td>
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
                <th className="text-left p-2">sRPE (AU)</th>
                <th className="text-left p-2">SessionId</th>
              </tr>
            </thead>
            <tbody>
              {list.map(r => {
                const load = r.load ?? (r.duration != null ? r.rpe * r.duration : null);
                const cat = r.category;
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

      <div className="text-xs text-gray-500">
        Rangos referencia (AU): ligera &lt;400 · moderada 400–700 · alta 700–1000 · muy alta &gt;1000. Semanal óptima ~2000–4000.
      </div>
    </div>
  );
}
