// src/app/ct/metrics/wellness/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Wellness = {
  id: string;
  userId: string;
  date: string;
  sleepQuality: number;
  sleepHours: number;
  fatigue: number;
  soreness: number;
  stress: number;
  mood: number;
  notes?: string | null;
};

function toYMD(d: Date) { return d.toISOString().slice(0,10); }

function sumScore(w: Wellness) {
  return (
    w.sleepQuality +
    w.fatigue +
    w.soreness +
    w.stress +
    w.mood +
    Math.min(5, Math.max(1, Math.round(w.sleepHours / 2)))
  );
}

function colorForScore(deltaPct: number) {
  if (deltaPct >= -10) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (deltaPct >= -20) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

export default function WellnessCTPage() {
  const today = useMemo(() => new Date(), []);
  const twoWeeksAgo = useMemo(() => { const d=new Date(); d.setUTCDate(d.getUTCDate()-14); return d; }, []);
  const [from, setFrom] = useState<string>(toYMD(twoWeeksAgo));
  const [to, setTo] = useState<string>(toYMD(today));
  const [userId, setUserId] = useState<string>("");

  const [list, setList] = useState<Wellness[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      if (userId.trim()) qs.set("userId", userId.trim());
      const res = await fetch(`/api/metrics/wellness?${qs.toString()}`, { cache: "no-store" });
      setList(await res.json());
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-line */ }, []);

  const byUser = useMemo(() => {
    const m = new Map<string, Wellness[]>();
    list.forEach(w => { if (!m.has(w.userId)) m.set(w.userId, []); m.get(w.userId)!.push(w); });
    for (const arr of m.values()) arr.sort((a,b)=>a.date.localeCompare(b.date));
    return m;
  }, [list]);

  const rows = useMemo(() => {
    const out:any[] = [];
    for (const [uid, arr] of byUser) {
      if (!arr.length) continue;
      const last = arr[arr.length - 1];
      const lastScore = sumScore(last);
      const avg = arr.reduce((a,w)=>a+sumScore(w),0)/arr.length;
      const deltaPct = ((lastScore - avg)/(avg||1))*100;
      out.push({ userId: uid, count: arr.length, lastDate: last.date.slice(0,10), lastScore, avg: Math.round(avg*10)/10, deltaPct: Math.round(deltaPct), last });
    }
    out.sort((a,b)=>a.deltaPct-b.deltaPct);
    return out;
  }, [byUser]);

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-bold">Wellness — Visor CT</h1>
          <p className="text-xs text-gray-500">Respuestas de jugadores (solo lectura)</p>
        </div>
        <a href="/ct/dashboard" className="rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50">← Dashboard</a>
      </header>

      <section className="rounded-2xl border bg-white shadow-sm p-3">
        <div className="grid md:grid-cols-5 gap-2">
          <div><label className="text-[11px] text-gray-500">Desde</label><input type="date" className="w-full rounded-md border px-2 py-1.5 text-sm" value={from} onChange={e=>setFrom(e.target.value)} /></div>
          <div><label className="text-[11px] text-gray-500">Hasta</label><input type="date" className="w-full rounded-md border px-2 py-1.5 text-sm" value={to} onChange={e=>setTo(e.target.value)} /></div>
          <div className="md:col-span-2"><label className="text-[11px] text-gray-500">userId (opcional)</label><input className="w-full rounded-md border px-2 py-1.5 text-sm" value={userId} onChange={e=>setUserId(e.target.value)} /></div>
          <div className="flex items-end"><button onClick={load} className="rounded-md border px-3 py-1.5 text-sm bg-black text-white hover:opacity-90">Aplicar</button></div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white shadow-sm overflow-x-auto">
        <div className="px-3 py-2 border-b bg-gray-50 text-[12px] uppercase tracking-wide font-semibold">Resumen</div>
        {loading ? <div className="p-3 text-gray-500">Cargando…</div> :
         rows.length===0 ? <div className="p-3 text-gray-500 italic">Sin datos</div> :
         <table className="min-w-full text-sm">
           <thead><tr className="border-b bg-gray-50"><th className="text-left p-2">User</th><th className="text-left p-2">N</th><th className="text-left p-2">Última fecha</th><th className="text-left p-2">Último total</th><th className="text-left p-2">Promedio</th><th className="text-left p-2">Δ% vs prom</th><th className="text-left p-2">Detalle último</th></tr></thead>
           <tbody>
             {rows.map(r=>(
               <tr key={r.userId} className="border-b">
                 <td className="p-2 font-medium">{r.userId}</td>
                 <td className="p-2">{r.count}</td>
                 <td className="p-2">{r.lastDate}</td>
                 <td className="p-2">{r.lastScore}</td>
                 <td className="p-2">{r.avg}</td>
                 <td className="p-2"><span className={`px-2 py-0.5 rounded border text-[12px] ${colorForScore(r.deltaPct)}`}>{r.deltaPct}%</span></td>
                 <td className="p-2 text-[12px] text-gray-700">Sueño {r.last.sleepQuality}/5 · {r.last.sleepHours}h · Fatiga {r.last.fatigue}/5 · Dolor {r.last.soreness}/5 · Estrés {r.last.stress}/5 · Ánimo {r.last.mood}/5{r.last.notes? <> · <i>{r.last.notes}</i></>:null}</td>
               </tr>
             ))}
           </tbody>
         </table>}
      </section>
    </div>
  );
}
