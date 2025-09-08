"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  status: "ACTIVO" | "REINTEGRO" | "ALTA";
  bodyPart?: string | null;
  laterality?: "IZQ" | "DER" | "BILATERAL" | "NA" | null;
  mechanism?: string | null;
  severity?: "LEVE" | "MODERADA" | "SEVERA" | null;
  expectedReturn?: string | null;
  availability?: "OUT" | "MODIFIED" | "FULL" | null;
  pain?: number | null;
  notes?: string | null;
  capMinutes?: number | null;
  noSprint?: boolean;
  noChangeOfDirection?: boolean;
  gymOnly?: boolean;
  noContact?: boolean;
};

function toYMD(d: Date) { return d.toISOString().slice(0,10); }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }

function Badge({tone="gray", children}:{tone?: "emerald"|"amber"|"red"|"gray"; children:any}) {
  const map: Record<string,string> = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
    gray: "bg-gray-100 text-gray-700 border-gray-200",
  };
  return <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${map[tone]}`}>{children}</span>;
}

export default function InjuriesPage() {
  const [date, setDate] = useState<string>(toYMD(new Date()));
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");

  // NUEVA entrada rápida
  const [creating, setCreating] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [newBodyPart, setNewBodyPart] = useState("");
  const [newStatus, setNewStatus] = useState<Row["status"]>("ACTIVO");

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
    return rows.filter(r =>
      (r.userName||"").toLowerCase().includes(t) ||
      (r.bodyPart||"").toLowerCase().includes(t) ||
      (r.notes||"").toLowerCase().includes(t)
    );
  }, [rows, q]);

  async function createQuick() {
    if (!newUserId) { alert("Ingresá userId del jugador"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/injuries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: newUserId,
          date,
          status: newStatus,
          bodyPart: newBodyPart || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setNewUserId(""); setNewBodyPart("");
      await load();
    } catch (e:any) {
      alert(e?.message || "Error creando entrada");
    } finally {
      setCreating(false);
    }
  }

  async function patch(id: string, data: Partial<Row>) {
    const res = await fetch(`/api/injuries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
  }

  // KPI simple + analítica básica (30d)
  const [kpi, setKpi] = useState({ activos: 0, reintegro: 0, altas: 0 });
  const [monthStats, setMonthStats] = useState<{total:number; outDays:number}>({ total: 0, outDays: 0 });
  useEffect(()=>{
    const a = rows.filter(r=>r.status==="ACTIVO").length;
    const r = rows.filter(r=>r.status==="REINTEGRO").length;
    const al = rows.filter(r=>r.status==="ALTA").length;
    setKpi({ activos:a, reintegro:r, altas:al });
  }, [rows]);

  useEffect(()=>{
    (async ()=>{
      const start = toYMD(addDays(new Date(date), -29));
      const res = await fetch(`/api/injuries/range?start=${start}&end=${date}`, { cache: "no-store" });
      const arr: Row[] = res.ok ? await res.json() : [];
      setMonthStats({
        total: arr.length,
        outDays: arr.filter(r => r.availability==="OUT").length,
      });
    })();
  }, [date]);

  function exportCSV() {
    const header = [
      "Jugador","Fecha","Estado","Zona","Lateralidad","Mecanismo","Severidad",
      "ETR","Avail","Dolor","CapMin","noSprint","noCOD","Gym","noContact","Notas"
    ];
    const lines = [header.join(",")];
    for (const r of filtered) {
      lines.push([
        `"${(r.userName||"—").replace(/"/g,'""')}"`,
        r.date,
        r.status,
        r.bodyPart||"",
        r.laterality||"",
        r.mechanism||"",
        r.severity||"",
        r.expectedReturn||"",
        r.availability||"",
        r.pain??"",
        r.capMinutes??"",
        r.noSprint?1:0,
        r.noChangeOfDirection?1:0,
        r.gymOnly?1:0,
        r.noContact?1:0,
        `"${(r.notes||"").replace(/"/g,'""')}"`,
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href=url; a.download=`lesiones_${date}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">Lesionados — Diario</h1>
          <p className="text-xs text-gray-500">{rows.length} registro(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" className="rounded-md border px-2 py-1.5 text-sm" value={date} onChange={e=>setDate(e.target.value)} />
          <button onClick={load} className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50">Recargar</button>
          <button onClick={exportCSV} className="rounded-lg bg-black text-white px-3 py-1.5 text-sm hover:opacity-90">Exportar CSV</button>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-xl border p-3">
          <div className="text-[11px] uppercase text-gray-500">Activos</div>
          <div className="mt-1 text-2xl font-bold">{kpi.activos}</div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="text-[11px] uppercase text-gray-500">Reintegro</div>
          <div className="mt-1 text-2xl font-bold">{kpi.reintegro}</div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="text-[11px] uppercase text-gray-500">Altas hoy</div>
          <div className="mt-1 text-2xl font-bold">{kpi.altas}</div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="text-[11px] uppercase text-gray-500">Entradas últimos 30d</div>
          <div className="mt-1 text-2xl font-bold">{monthStats.total}</div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="text-[11px] uppercase text-gray-500">% OUT (30d)</div>
          <div className="mt-1 text-2xl font-bold">
            {monthStats.total ? Math.round((monthStats.outDays / monthStats.total) * 100) : 0}%
          </div>
        </div>
      </section>

      {/* Alta rápida (cuerpo médico) */}
      <section className="rounded-xl border bg-white p-3">
        <div className="text-sm font-semibold mb-2">Alta rápida</div>
        <div className="flex flex-wrap items-center gap-2">
          <input className="w-48 rounded-md border px-2 py-1.5 text-sm" placeholder="userId del jugador" value={newUserId} onChange={e=>setNewUserId(e.target.value)} />
          <input className="w-48 rounded-md border px-2 py-1.5 text-sm" placeholder="Zona corporal (ej. isquios)" value={newBodyPart} onChange={e=>setNewBodyPart(e.target.value)} />
          <select className="rounded-md border px-2 py-1.5 text-sm" value={newStatus} onChange={e=>setNewStatus(e.target.value as Row["status"])}>
            <option value="ACTIVO">Activo</option>
            <option value="REINTEGRO">Reintegro</option>
            <option value="ALTA">Alta</option>
          </select>
          <button disabled={creating} onClick={createQuick} className={`rounded-lg px-3 py-1.5 text-sm ${creating?"bg-gray-200 text-gray-500":"bg-black text-white hover:opacity-90"}`}>Guardar</button>
          <div className="ml-auto text-xs text-gray-500">* Luego podés completar detalles y restricciones.</div>
        </div>
      </section>

      {/* Filtro */}
      <div className="flex items-center gap-2">
        <input className="w-full md:w-80 rounded-md border px-2 py-1.5 text-sm" placeholder="Buscar jugador / zona / nota…" value={q} onChange={e=>setQ(e.target.value)} />
        <span className="text-[12px] text-gray-500">{filtered.length} resultado(s)</span>
      </div>

      {/* Tabla principal */}
      <section className="rounded-2xl border bg-white overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 text-[12px] font-semibold uppercase">Entradas del día</div>
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
                  <th className="text-left px-3 py-2">Zona / Lat</th>
                  <th className="text-left px-3 py-2">Severidad</th>
                  <th className="text-left px-3 py-2">ETR</th>
                  <th className="text-left px-3 py-2">Avail / Dolor</th>
                  <th className="text-left px-3 py-2">Restricciones</th>
                  <th className="text-left px-3 py-2">Notas</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r=>{
                  const tone = r.status==="ACTIVO" ? "red" : r.status==="REINTEGRO" ? "amber" : "emerald";
                  return (
                    <tr key={r.id} className="border-b last:border-0 align-top">
                      <td className="px-3 py-2 font-medium">{r.userName}</td>
                      <td className="px-3 py-2"><Badge tone={tone as any}>{r.status}</Badge></td>
                      <td className="px-3 py-2">
                        {r.bodyPart || "—"} {r.laterality ? `(${r.laterality})` : ""}
                      </td>
                      <td className="px-3 py-2">{r.severity || "—"}</td>
                      <td className="px-3 py-2">
                        <input
                          type="date"
                          className="rounded-md border px-2 py-1 text-sm"
                          defaultValue={r.expectedReturn || ""}
                          onBlur={async e=>{ await patch(r.id,{ expectedReturn: e.currentTarget.value || null }); await load(); }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="rounded-md border px-2 py-1 text-sm mr-2"
                          defaultValue={r.availability || ""}
                          onBlur={async e=>{ await patch(r.id,{ availability: (e.currentTarget.value || null) as any }); await load(); }}
                        >
                          <option value=""></option>
                          <option value="OUT">OUT</option>
                          <option value="MODIFIED">MODIFIED</option>
                          <option value="FULL">FULL</option>
                        </select>
                        <input
                          className="w-16 rounded-md border px-2 py-1 text-sm"
                          placeholder="Dolor 0-10"
                          defaultValue={r.pain ?? ""}
                          onBlur={async e=>{ const v=e.currentTarget.value.trim(); await patch(r.id,{ pain: v===""? null : Math.max(0, Math.min(10, Number(v))) }); await load(); }}
                        />
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <div className="flex flex-wrap gap-2 items-center">
                          <input className="w-20 rounded-md border px-2 py-1" placeholder="cap (min)" defaultValue={r.capMinutes ?? ""} onBlur={async e=>{ const v = e.currentTarget.value.trim(); await patch(r.id,{ capMinutes: v===""? null : Math.max(0, Number(v)) }); await load(); }} />
                          {[
                            ["noSprint","No sprint"],
                            ["noChangeOfDirection","Sin COD"],
                            ["gymOnly","Solo gym"],
                            ["noContact","Sin contacto"],
                          ].map(([key,label])=>(
                            <label key={key} className="inline-flex items-center gap-1">
                              <input type="checkbox" defaultChecked={(r as any)[key]} onChange={async e=>{ await patch(r.id, { [key]: e.currentTarget.checked } as any); }} />
                              <span>{label}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <textarea
                          className="min-w-64 rounded-md border px-2 py-1 text-sm"
                          rows={2}
                          defaultValue={r.notes || ""}
                          onBlur={async e=>{ await patch(r.id,{ notes: e.currentTarget.value || null }); }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Leyenda rápida */}
      <div className="rounded-xl border bg-white p-3 text-xs text-gray-600">
        <b>Disponibilidad:</b> OUT (no entrena), MODIFIED (restricciones activas), FULL (sin restricciones). &nbsp;
        <b>Restricciones:</b> cap de minutos y flags operativos para que el CT los use en Plan y RPE.
      </div>
    </div>
  );
}
