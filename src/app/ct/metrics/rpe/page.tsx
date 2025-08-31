// src/app/ct/metrics/rpe/page.tsx
"use client";

import { useEffect, useState } from "react";

type RPE = {
  id: string;
  userId: string;
  date: string;        // ISO
  sessionId?: string | null;
  rpe: number;
  duration?: number | null;
  load?: number | null;
};

export default function RPECTPage() {
  const [list, setList] = useState<RPE[]>([]);
  const [loading, setLoading] = useState(true);

  // form
  const [userId, setUserId] = useState("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [sessionId, setSessionId] = useState("");
  const [rpe, setRpe] = useState(5);
  const [duration, setDuration] = useState<number | "">("");

  async function load() {
    setLoading(true);
    try {
      const from = new Date();
      from.setUTCDate(from.getUTCDate() - 14);
      const res = await fetch(`/api/metrics/rpe?from=${from.toISOString().slice(0,10)}`, { cache: "no-store" });
      const data = await res.json();
      setList(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!userId.trim()) {
      alert("Ingresá userId (por ahora crudo, MVP)");
      return;
    }
    const payload = {
      userId: userId.trim(),
      date,
      rpe,
      duration: duration === "" ? null : Number(duration),
      sessionId: sessionId.trim() || null,
    };
    const res = await fetch("/api/metrics/rpe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      alert("Error al guardar");
      return;
    }
    setSessionId("");
    setDuration("");
    await load();
  }

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-bold">RPE (CT)</h1>
          <p className="text-xs text-gray-500">Carga rápida + últimos 14 días</p>
        </div>
        <div className="flex gap-2">
          <a href="/ct/dashboard" className="rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50">← Dashboard</a>
        </div>
      </header>

      <section className="rounded-2xl border bg-white shadow-sm p-3 space-y-2">
        <div className="grid md:grid-cols-3 gap-2">
          <input className="rounded-md border px-2 py-1.5 text-sm" placeholder="userId"
                 value={userId} onChange={(e)=>setUserId(e.target.value)} />
          <input className="rounded-md border px-2 py-1.5 text-sm" type="date"
                 value={date} onChange={(e)=>setDate(e.target.value)} />
          <input className="rounded-md border px-2 py-1.5 text-sm" placeholder="sessionId (opcional)"
                 value={sessionId} onChange={(e)=>setSessionId(e.target.value)} />
          <input className="rounded-md border px-2 py-1.5 text-sm" type="number" min={0} max={10}
                 value={rpe} onChange={(e)=>setRpe(Number(e.target.value))} placeholder="RPE (0-10)" />
          <input className="rounded-md border px-2 py-1.5 text-sm" type="number" min={0}
                 value={duration === "" ? "" : duration}
                 onChange={(e)=>setDuration(e.target.value === "" ? "" : Number(e.target.value))}
                 placeholder="Duración (min, opcional)" />
          <button onClick={save} className="rounded-md border px-3 py-1.5 text-sm bg-black text-white hover:opacity-90">
            Guardar
          </button>
        </div>
      </section>

      <section className="rounded-2xl border bg-white shadow-sm overflow-x-auto">
        <div className="px-3 py-2 border-b bg-gray-50 text-[12px] uppercase tracking-wide font-semibold">
          Últimos registros
        </div>
        {loading ? (
          <div className="p-3 text-gray-500">Cargando…</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left p-2">Fecha</th>
                <th className="text-left p-2">User</th>
                <th className="text-left p-2">RPE</th>
                <th className="text-left p-2">Duración</th>
                <th className="text-left p-2">Load</th>
                <th className="text-left p-2">SessionId</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2">{r.date.slice(0,10)}</td>
                  <td className="p-2">{r.userId}</td>
                  <td className="p-2">{r.rpe}</td>
                  <td className="p-2">{r.duration ?? "—"}</td>
                  <td className="p-2">{r.load ?? (r.duration != null ? r.rpe * r.duration : "—")}</td>
                  <td className="p-2">{r.sessionId || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
