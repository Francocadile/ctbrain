// src/app/ct/injuries/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import HelpTip from "@/components/HelpTip";

type InjuryRow = {
  id: string;
  userId: string;
  userName: string;
  date: string;
  status: "ACTIVO" | "REINTEGRO" | "ALTA" | string;
  bodyPart?: string | null;
  laterality?: string | null;
  mechanism?: string | null;
  expectedReturn?: string | null; // ISO
  notes?: string | null;
};

export const dynamic = "force-dynamic";

function toYMD(d: Date) { return d.toISOString().slice(0,10); }

export default function InjuriesPage() {
  const [date, setDate] = useState<string>(toYMD(new Date()));
  const [rows, setRows] = useState<InjuryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/injuries?date=${date}`, { cache: "no-store" });
      const data = res.ok ? await res.json() : [];
      setRows(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, [date]);

  const filtered = useMemo(()=>{
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(r => (r.userName||"").toLowerCase().includes(t) || (r.bodyPart||"").toLowerCase().includes(t));
  }, [rows, q]);

  async function quickAdd() {
    const userId = prompt("userId del jugador:");
    if (!userId) return;
    const status = (prompt('Estado ("ACTIVO" | "REINTEGRO" | "ALTA"):', "ACTIVO") || "ACTIVO").toUpperCase();
    setSaving(true);
    try {
      const res = await fetch("/api/injuries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, date, status }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e: any) {
      alert(e?.message || "Error creando lesión");
    } finally {
      setSaving(false);
    }
  }

  async function patchOne(id: string, data: Partial<InjuryRow>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/injuries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e: any) {
      alert(e?.message || "Error guardando");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">
            Lesionados (MVP){" "}
            <HelpTip text="Registro simple por día: estado, zona, lateralidad, mecanismo y fecha estimada de retorno." />
          </h1>
          <p className="text-xs text-gray-500">{rows.length} registro(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" className="rounded-md border px-2 py-1.5 text-sm" value={date} onChange={e=>setDate(e.target.value)} />
          <button onClick={load} className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50">Recargar</button>
          <button onClick={quickAdd} disabled={saving} className={`rounded-lg px-3 py-1.5 text-sm ${saving?"bg-gray-200 text-gray-500":"bg-black text-white hover:opacity-90"}`}>Alta rápida</button>
        </div>
      </header>

      <div className="flex items-center gap-2">
        <input className="w-full md:w-80 rounded-md border px-2 py-1.5 text-sm" placeholder="Buscar jugador o zona…" value={q} onChange={e=>setQ(e.target.value)} />
        <span className="text-[12px] text-gray-500">{filtered.length} resultado(s)</span>
      </div>

      <section className="rounded-2xl border bg-white overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 text-[12px] font-semibold uppercase">Listado del día</div>
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
                  <th className="text-left px-3 py-2">Estado</th>
                  <th className="text-left px-3 py-2">Zona</th>
                  <th className="text-left px-3 py-2">Lat.</th>
                  <th className="text-left px-3 py-2">Mecanismo</th>
                  <th className="text-left px-3 py-2">ETA retorno</th>
                  <th className="text-left px-3 py-2">Notas</th>
                  <th className="text-right px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r)=>(
                  <tr key={r.id} className="border-b last:border-0 align-top">
                    <td className="px-3 py-2 font-medium">{r.userName}</td>
                    <td className="px-3 py-2">
                      <select defaultValue={r.status} onChange={e=>patchOne(r.id, { status: e.currentTarget.value as any })} className="rounded-md border px-2 py-1 text-sm">
                        <option value="ACTIVO">ACTIVO</option>
                        <option value="REINTEGRO">REINTEGRO</option>
                        <option value="ALTA">ALTA</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input defaultValue={r.bodyPart ?? ""} onBlur={e=>patchOne(r.id, { bodyPart: e.currentTarget.value || null })} className="w-40 rounded-md border px-2 py-1 text-sm" placeholder="Isquios…" />
                    </td>
                    <td className="px-3 py-2">
                      <input defaultValue={r.laterality ?? ""} onBlur={e=>patchOne(r.id, { laterality: e.currentTarget.value || null })} className="w-24 rounded-md border px-2 py-1 text-sm" placeholder="Der/Izq" />
                    </td>
                    <td className="px-3 py-2">
                      <input defaultValue={r.mechanism ?? ""} onBlur={e=>patchOne(r.id, { mechanism: e.currentTarget.value || null })} className="w-40 rounded-md border px-2 py-1 text-sm" placeholder="Sobreuso…" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="date" defaultValue={r.expectedReturn ? r.expectedReturn.slice(0,10) : ""} onBlur={e=>patchOne(r.id, { expectedReturn: e.currentTarget.value || null })} className="rounded-md border px-2 py-1 text-sm" />
                    </td>
                    <td className="px-3 py-2">
                      <textarea defaultValue={r.notes ?? ""} onBlur={e=>patchOne(r.id, { notes: e.currentTarget.value || null })} className="w-56 rounded-md border px-2 py-1 text-sm" rows={2} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end text-xs text-gray-500">{r.id.slice(0,6)}…</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="rounded-xl border bg-white p-3 text-xs text-gray-600">
        <b>Estados:</b> ACTIVO (entrena adaptado o fuera), REINTEGRO (progresando), ALTA (apto). Usá notas para detalle clínico.
      </div>
    </div>
  );
}
