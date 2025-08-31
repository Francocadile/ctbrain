// src/app/ct/metrics/wellness/page.tsx
"use client";

import { useEffect, useState } from "react";

type Wellness = {
  id: string;
  userId: string;
  date: string; // ISO
  sleep: number;
  soreness: number;
  stress: number;
  mood: number;
  notes?: string | null;
};

export default function WellnessCTPage() {
  const [list, setList] = useState<Wellness[]>([]);
  const [loading, setLoading] = useState(true);

  // form
  const [userId, setUserId] = useState("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [sleep, setSleep] = useState(7);
  const [soreness, setSoreness] = useState(3);
  const [stress, setStress] = useState(3);
  const [mood, setMood] = useState(7);
  const [notes, setNotes] = useState("");

  async function load() {
    setLoading(true);
    try {
      const from = new Date();
      from.setUTCDate(from.getUTCDate() - 14);
      const res = await fetch(`/api/metrics/wellness?from=${from.toISOString().slice(0,10)}`, { cache: "no-store" });
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
    const payload = { userId: userId.trim(), date, sleep, soreness, stress, mood, notes: notes.trim() || null };
    const res = await fetch("/api/metrics/wellness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      alert("Error al guardar");
      return;
    }
    setNotes("");
    await load();
  }

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-bold">Wellness (CT)</h1>
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
          <input className="rounded-md border px-2 py-1.5 text-sm" type="number" min={1} max={10}
                 value={sleep} onChange={(e)=>setSleep(Number(e.target.value))} placeholder="Sueño (1-10)" />
          <input className="rounded-md border px-2 py-1.5 text-sm" type="number" min={1} max={10}
                 value={soreness} onChange={(e)=>setSoreness(Number(e.target.value))} placeholder="Dolor (1-10)" />
          <input className="rounded-md border px-2 py-1.5 text-sm" type="number" min={1} max={10}
                 value={stress} onChange={(e)=>setStress(Number(e.target.value))} placeholder="Estrés (1-10)" />
          <input className="rounded-md border px-2 py-1.5 text-sm" type="number" min={1} max={10}
                 value={mood} onChange={(e)=>setMood(Number(e.target.value))} placeholder="Ánimo (1-10)" />
          <input className="rounded-md border px-2 py-1.5 text-sm md:col-span-2" placeholder="Notas (opcional)"
                 value={notes} onChange={(e)=>setNotes(e.target.value)} />
          <button onClick={save} className="rounded-md border px-3 py-1.5 text-sm bg-black text-white hover:opacity-90">
            Guardar / Actualizar
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
                <th className="text-left p-2">Sueño</th>
                <th className="text-left p-2">Dolor</th>
                <th className="text-left p-2">Estrés</th>
                <th className="text-left p-2">Ánimo</th>
                <th className="text-left p-2">Notas</th>
              </tr>
            </thead>
            <tbody>
              {list.map((w) => (
                <tr key={w.id} className="border-b">
                  <td className="p-2">{w.date.slice(0,10)}</td>
                  <td className="p-2">{w.userId}</td>
                  <td className="p-2">{w.sleep}</td>
                  <td className="p-2">{w.soreness}</td>
                  <td className="p-2">{w.stress}</td>
                  <td className="p-2">{w.mood}</td>
                  <td className="p-2">{w.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
