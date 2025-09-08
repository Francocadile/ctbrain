// src/app/ct/injuries/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import HelpTip from "@/components/HelpTip";

export const dynamic = "force-dynamic";

/** ---------- Tipos ---------- */
type InjuryRow = {
  id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  status: "ACTIVO" | "REINTEGRO" | "ALTA";
  bodyPart?: string | null;
  laterality?: "IZQ" | "DER" | "BIL" | "N/A" | null;
  mechanism?: string | null;
  expectedReturn?: string | null; // YYYY-MM-DD
  notes?: string | null;
};

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** ---------- Página ---------- */
export default function InjuriesPage() {
  const [date, setDate] = useState<string>(toYMD(new Date()));
  const [rows, setRows] = useState<InjuryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  // Alta rápida (MVP)
  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState<Partial<InjuryRow>>({
    status: "ACTIVO",
  });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/injuries?date=${date}`, { cache: "no-store" });
      const arr = res.ok ? await res.json() : [];
      const fixed: InjuryRow[] = (Array.isArray(arr) ? arr : []).map((r: any) => ({
        id: String(r.id),
        userId: String(r.userId),
        userName:
          r.userName || r.user?.name || r.user?.email || r.playerKey || "—",
        date: r.date,
        status: (r.status || "ACTIVO") as InjuryRow["status"],
        bodyPart: r.bodyPart ?? null,
        laterality: (r.laterality ?? null) as InjuryRow["laterality"],
        mechanism: r.mechanism ?? null,
        expectedReturn: r.expectedReturn ?? null,
        notes: r.notes ?? null,
      }));
      setRows(fixed);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => r.userName.toLowerCase().includes(t));
  }, [rows, q]);

  // PATCH inline
  async function saveOne(id: string, patch: Partial<InjuryRow>) {
    const res = await fetch(`/api/injuries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const msg = await res.text();
      alert(msg || "Error guardando");
      return;
    }
    await load();
  }

  // POST alta rápida (upsert por userId+date en el backend)
  async function createOne() {
    if (!newForm.userId) {
      alert("Completá el Jugador (userId)"); // MVP: pedimos userId para asegurar vínculo
      return;
    }
    const payload = {
      userId: newForm.userId,
      date,
      status: newForm.status || "ACTIVO",
      bodyPart: newForm.bodyPart || null,
      laterality: newForm.laterality || null,
      mechanism: newForm.mechanism || null,
      expectedReturn: newForm.expectedReturn || null,
      notes: newForm.notes || null,
    };
    const res = await fetch(`/api/injuries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const msg = await res.text();
      alert(msg || "Error creando registro");
      return;
    }
    setNewOpen(false);
    setNewForm({ status: "ACTIVO" });
    await load();
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">
            Lesionados{" "}
            <HelpTip text="MVP: registro diario por jugador. Estado, zona, lateralidad, mecanismo, fecha estimada de retorno y notas." />
          </h1>
          <p className="text-xs text-gray-500">
            Fecha: <b>{date}</b> • {rows.length} registro(s)
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
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Recargar
          </button>
          <button
            onClick={() => setNewOpen((v) => !v)}
            className="rounded-lg bg-black text-white px-3 py-1.5 text-sm hover:opacity-90"
          >
            {newOpen ? "Cancelar" : "Alta rápida"}
          </button>
        </div>
      </header>

      {/* Alta rápida */}
      {newOpen && (
        <section className="rounded-xl border bg-white p-3">
          <div className="grid md:grid-cols-6 gap-2">
            <div className="md:col-span-2">
              <label className="block text-[11px] text-gray-500 mb-1">
                Jugador (userId){" "}
                <HelpTip text="Por ahora requiere userId para vincular con el jugador. Próximamente: selector por nombre." />
              </label>
              <input
                className="w-full rounded-md border px-2 py-1.5 text-sm"
                placeholder="cuid_... (userId)"
                value={newForm.userId || ""}
                onChange={(e) =>
                  setNewForm((f) => ({ ...f, userId: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Estado</label>
              <select
                className="w-full rounded-md border px-2 py-1.5 text-sm"
                value={newForm.status || "ACTIVO"}
                onChange={(e) =>
                  setNewForm((f) => ({ ...f, status: e.target.value as any }))
                }
              >
                <option value="ACTIVO">ACTIVO</option>
                <option value="REINTEGRO">REINTEGRO</option>
                <option value="ALTA">ALTA</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Zona</label>
              <input
                className="w-full rounded-md border px-2 py-1.5 text-sm"
                placeholder="isquios, tobillo..."
                value={newForm.bodyPart || ""}
                onChange={(e) =>
                  setNewForm((f) => ({ ...f, bodyPart: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Lateralidad</label>
              <select
                className="w-full rounded-md border px-2 py-1.5 text-sm"
                value={(newForm.laterality as any) || "N/A"}
                onChange={(e) =>
                  setNewForm((f) => ({
                    ...f,
                    laterality: e.target.value as any,
                  }))
                }
              >
                <option value="N/A">N/A</option>
                <option value="IZQ">IZQ</option>
                <option value="DER">DER</option>
                <option value="BIL">BIL</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Mecanismo</label>
              <input
                className="w-full rounded-md border px-2 py-1.5 text-sm"
                placeholder="sobreuso, contacto..."
                value={newForm.mechanism || ""}
                onChange={(e) =>
                  setNewForm((f) => ({ ...f, mechanism: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">
                Fecha retorno (estim.)
              </label>
              <input
                type="date"
                className="w-full rounded-md border px-2 py-1.5 text-sm"
                value={newForm.expectedReturn || ""}
                onChange={(e) =>
                  setNewForm((f) => ({
                    ...f,
                    expectedReturn: e.target.value || null,
                  }))
                }
              />
            </div>
            <div className="md:col-span-6">
              <label className="block text-[11px] text-gray-500 mb-1">Notas</label>
              <textarea
                className="w-full rounded-md border px-2 py-1.5 text-sm"
                rows={2}
                placeholder="Observaciones clínicas / carga sugerida…"
                value={newForm.notes || ""}
                onChange={(e) =>
                  setNewForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={createOne}
              className="rounded-lg bg-black text-white px-3 py-1.5 text-sm hover:opacity-90"
            >
              Guardar
            </button>
          </div>
        </section>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-2">
        <input
          className="w-full md:w-80 rounded-md border px-2 py-1.5 text-sm"
          placeholder="Buscar jugador…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="text-[12px] text-gray-500">
          {filtered.length} resultado(s)
        </span>
      </div>

      {/* Tabla */}
      <section className="rounded-2xl border bg-white overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 text-[12px] font-semibold uppercase">
          Registros del día
        </div>
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
                    Estado{" "}
                    <HelpTip text="ACTIVO: no entrena; REINTEGRO: carga adaptada; ALTA: sin restricciones." />
                  </th>
                  <th className="text-left px-3 py-2">Zona</th>
                  <th className="text-left px-3 py-2">Lat.</th>
                  <th className="text-left px-3 py-2">Mecanismo</th>
                  <th className="text-left px-3 py-2">Retorno (est.)</th>
                  <th className="text-left px-3 py-2">Notas</th>
                  <th className="text-right px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 align-top">
                    <td className="px-3 py-2 font-medium">{r.userName}</td>
                    <td className="px-3 py-2">
                      <select
                        className="rounded-md border px-2 py-1 text-sm"
                        defaultValue={r.status}
                        onChange={(e) => saveOne(r.id, { status: e.target.value as any })}
                      >
                        <option value="ACTIVO">ACTIVO</option>
                        <option value="REINTEGRO">REINTEGRO</option>
                        <option value="ALTA">ALTA</option
