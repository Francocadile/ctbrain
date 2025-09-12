"use client";

import { useEffect, useMemo, useState } from "react";
import { getRivales, upsertRival, deleteRival, type Rival } from "@/lib/settings";

export default function RivalesPage() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Rival[]>([]);
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<{ id?: string; name: string; logoUrl: string }>(() => ({
    id: undefined,
    name: "",
    logoUrl: "",
  }));

  async function load() {
    setLoading(true);
    try {
      const rows = await getRivales();
      setList(rows);
    } catch (e) {
      console.error(e);
      alert("No se pudo cargar rivales.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return list;
    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(t) ||
        (r.logoUrl || "").toLowerCase().includes(t)
    );
  }, [q, list]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    const logoUrl = (form.logoUrl || "").trim() || null;
    if (!name) {
      alert("Ingresá un nombre");
      return;
    }
    setSaving(true);
    try {
      const res = await upsertRival({ id: form.id, name, logoUrl });
      if (!res) throw new Error("No se pudo guardar");
      await load();
      setForm({ id: undefined, name: "", logoUrl: "" });
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(r: Rival) {
    const ok = confirm(`¿Eliminar rival "${r.name}"?`);
    if (!ok) return;
    try {
      const done = await deleteRival(r.id || r.name);
      if (!done) throw new Error("No se pudo eliminar");
      await load();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Error al eliminar");
    }
  }

  function editRow(r: Rival) {
    setForm({ id: r.id, name: r.name, logoUrl: r.logoUrl || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm({ id: undefined, name: "", logoUrl: "" });
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h1 className="text-lg md:text-xl font-bold">Rivales — Gestión</h1>
          <p className="text-xs md:text-sm text-gray-500">
            Alta / edición / borrado (se usa en el “Día Partido” del plan semanal)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/ct/plan-semanal"
            className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs"
          >
            ← Editor semanal
          </a>
          <a
            href="/ct/dashboard"
            className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs"
          >
            Dashboard
          </a>
        </div>
      </header>

      {/* Formulario */}
      <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b flex items-center justify-between">
          <div className="text-[12px] font-semibold uppercase tracking-wide">
            {form.id ? "Editar rival" : "Nuevo rival"}
          </div>
          {form.id && (
            <button
              type="button"
              onClick={resetForm}
              className="text-[11px] rounded-lg border px-2 py-0.5 hover:bg-gray-50"
            >
              Limpiar
            </button>
          )}
        </div>
        <form onSubmit={handleSave} className="p-3 grid md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] text-gray-500">Nombre</label>
            <input
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              placeholder="Club Atlético Ejemplo"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-gray-500">Logo (URL)</label>
            <input
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              placeholder="https://…"
              value={form.logoUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, logoUrl: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1 flex items-end">
            <button
              type="submit"
              disabled={saving}
              className={`px-3 py-1.5 rounded-xl text-xs ${
                saving
                  ? "bg-gray-200 text-gray-500"
                  : "bg-black text-white hover:opacity-90"
              }`}
            >
              {saving ? "Guardando…" : form.id ? "Guardar cambios" : "Agregar"}
            </button>
          </div>
          {form.logoUrl ? (
            <div className="md:col-span-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.logoUrl}
                alt="Logo preview"
                className="max-h-28 rounded border object-contain"
              />
            </div>
          ) : null}
        </form>
      </section>

      {/* Buscador */}
      <div className="flex items-center gap-2">
        <input
          className="w-full md:w-80 rounded-md border px-2 py-1.5 text-sm"
          placeholder="Buscar rival…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="text-[12px] text-gray-500">
          {filtered.length} resultado(s)
        </span>
      </div>

      {/* Tabla */}
      <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b text-[12px] font-semibold uppercase tracking-wide">
          Lista
        </div>
        {loading ? (
          <div className="p-4 text-gray-500">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-gray-500 italic">Sin resultados</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-3 py-2">Logo</th>
                  <th className="text-left px-3 py-2">Nombre</th>
                  <th className="text-left px-3 py-2">URL</th>
                  <th className="text-right px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      {r.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.logoUrl}
                          alt={r.name}
                          className="h-10 w-10 object-contain rounded border bg-white"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded border bg-gray-50" />
                      )}
                    </td>
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    <td className="px-3 py-2">
                      {r.logoUrl ? (
                        <a
                          href={r.logoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline text-emerald-700 break-all"
                        >
                          {r.logoUrl}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="h-7 px-2 rounded border text-[11px] hover:bg-gray-50"
                          onClick={() => editRow(r)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="h-7 px-2 rounded border text-[11px] hover:bg-gray-50"
                          onClick={() => handleDelete(r)}
                        >
                          Borrar
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
