// src/app/ct/metrics/rpe/page.tsx
"use client";

import { useEffect, useState } from "react";

function toYMD(d: Date) { return d.toISOString().slice(0, 10); }

type Row = {
  id: string;
  userId: string;
  userName: string;
  date: string;
  rpe: number;
  duration: number | null;
  load: number | null;
};

export default function RPECT() {
  const [date, setDate] = useState(toYMD(new Date()));
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [defaultDur, setDefaultDur] = useState<string>("");
  const [editing, setEditing] = useState<Record<string, string>>({}); // id -> duration (string)
  const [saving, setSaving] = useState<Record<string, boolean>>({});  // id -> saving

  async function load() {
    setLoading(true);
    const q = new URLSearchParams({ date });
    const res = await fetch(`/api/metrics/rpe?${q.toString()}`, { cache: "no-store" });
    const data = res.ok ? await res.json() : [];
    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [date]);

  async function applyDefault() {
    const dur = Math.max(0, Number(defaultDur || 0));
    if (!dur) { alert("Ingresá minutos > 0"); return; }
    const res = await fetch("/api/metrics/rpe/default-duration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, duration: dur }),
      cache: "no-store",
    });
    if (!res.ok) {
      alert((await res.text()) || "Error");
      return;
    }
    await load();
    setDefaultDur("");
  }

  function startEdit(r: Row) {
    setEditing((e) => ({ ...e, [r.id]: r.duration != null ? String(r.duration) : "" }));
  }

  async function saveEdit(r: Row) {
    const val = editing[r.id];
    const duration = val === "" ? null : Math.max(0, Number(val));
    setSaving((s) => ({ ...s, [r.id]: true }));
    try {
      const res = await fetch(`/api/metrics/rpe/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      const updated: Row = await res.json();
      setRows((rows) => rows.map(x => x.id === r.id ? updated : x));
      setEditing((e) => {
        const { [r.id]: _, ...rest } = e;
        return rest;
      });
    } catch (err: any) {
      alert(err?.message || "Error al guardar");
    } finally {
      setSaving((s) => ({ ...s, [r.id]: false }));
    }
  }

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold">RPE — Hoy</h1>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="rounded-md border px-2 py-1.5 text-sm"
            value={date}
            onChange={(e)=>setDate(e.target.value)}
          />
          <button onClick={load} className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50">Recargar</button>
        </div>
      </header>

      {/* Controles de duración */}
      <section className="rounded-2xl border bg-white p-3 space-y-3">
        <div className="text-[12px] font-semibold uppercase text-gray-600">Duración</div>
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <div className="flex items-center gap-2">
            <input
              className="w-28 rounded-md border px-2 py-1.5 text-sm"
              placeholder="min"
              value={defaultDur}
              onChange={(e)=>setDefaultDur(e.target.value)}
              inputMode="numeric"
            />
            <button
              onClick={applyDefault}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Aplicar a vacíos (día)
            </button>
          </div>
          <div className="text-xs text-gray-500">
            Aplica esta duración a todas las RPE de <b>{date}</b> que no tengan minutos cargados.
          </div>
        </div>
      </section>

      {/* Tabla */}
      <section className="rounded-2xl border bg-white overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 text-[12px] font-semibold uppercase">Entradas</div>
        {loading ? (
          <div className="p-4 text-gray-500">Cargando…</div>
        ) : rows.length === 0 ? (
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
                {rows.map((r) => {
                  const isEditing = r.id in editing;
                  const busy = !!saving[r.id];
                  return (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="px-3 py-2">{r.userName}</td>
                      <td className="px-3 py-2">{r.rpe}</td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input
                            className="w-24 rounded-md border px-2 py-1.5 text-sm"
                            placeholder="min"
                            value={editing[r.id]}
                            onChange={(e)=> setEditing((ed)=>({ ...ed, [r.id]: e.target.value }))}
                            inputMode="numeric"
                          />
                        ) : (
                          r.duration ?? "—"
                        )}
                      </td>
                      <td className="px-3 py-2">{r.load ?? "—"}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button
                                disabled={busy}
                                onClick={()=>saveEdit(r)}
                                className={`h-7 px-2 rounded border text-[11px] ${busy ? "text-gray-400" : "hover:bg-gray-50"}`}
                              >
                                {busy ? "Guardando…" : "Guardar"}
                              </button>
                              <button
                                disabled={busy}
                                onClick={()=>{
                                  setEditing((e)=>{
                                    const { [r.id]:_, ...rest } = e;
                                    return rest;
                                  });
                                }}
                                className="h-7 px-2 rounded border text-[11px] hover:bg-gray-50"
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={()=>startEdit(r)}
                              className="h-7 px-2 rounded border text-[11px] hover:bg-gray-50"
                            >
                              {r.duration == null ? "Cargar" : "Editar"}
                            </button>
                          )}
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
