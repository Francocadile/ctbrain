// src/app/ct/scouting/config/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type ScoutingCategory,
} from "@/lib/scouting";
import Link from "next/link";
import type { Route } from "next";
import Container from "@/components/ui/container";

export default function ScoutingConfigPage() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<ScoutingCategory[]>([]);
  const [q, setQ] = useState("");
  const [name, setName] = useState("");

  async function load() {
    setLoading(true);
    try {
      const rows = await listCategories();
      setList(rows.sort((a, b) => a.orden - b.orden));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return list;
    return list.filter((x) => x.nombre.toLowerCase().includes(t));
  }, [q, list]);

  async function add() {
    const n = name.trim();
    if (!n) return;
    await createCategory(n);
    setName("");
    await load();
  }

  async function toggle(cat: ScoutingCategory) {
    await updateCategory(cat.id, { activa: !cat.activa });
    await load();
  }

  async function del(cat: ScoutingCategory) {
    const ok = confirm(`¿Borrar la categoría "${cat.nombre}"? (Solo si no tiene jugadores)`);
    if (!ok) return;
    const res = await deleteCategory(cat.id);
    if ("error" in res) {
      alert(res.error);
      return;
    }
    await load();
  }

  return (
    <Container>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg md:text-xl font-bold">Scouting — Categorías</h1>
          <p className="text-xs md:text-sm text-gray-500">Crear, renombrar, activar/archivar.</p>
        </div>
        <Link href={"/ct/scouting" as Route} className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">
          ← Volver
        </Link>
      </div>

      <div className="rounded-2xl border bg-white p-3 mb-4">
        <div className="text-[12px] font-semibold uppercase tracking-wide mb-2">Nueva categoría</div>
        <div className="flex gap-2">
          <input
            className="w-full md:w-80 rounded-md border px-2 py-1.5 text-sm"
            placeholder="Ej: Jugadores locales"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button onClick={add} className="px-3 py-1.5 rounded-xl text-xs bg-black text-white hover:opacity-90">
            Agregar
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <input
          className="w-full md:w-80 rounded-md border px-2 py-1.5 text-sm"
          placeholder="Buscar categoría…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="text-[12px] text-gray-500">{filtered.length} resultado(s)</span>
      </div>

      <div className="rounded-2xl border bg-white overflow-hidden">
        {loading ? (
          <div className="p-4 text-gray-500">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-gray-500 italic">Sin resultados</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-3 py-2">Nombre</th>
                <th className="text-left px-3 py-2">Slug</th>
                <th className="text-left px-3 py-2">Estado</th>
                <th className="text-right px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{c.nombre}</td>
                  <td className="px-3 py-2">{c.slug}</td>
                  <td className="px-3 py-2">{c.activa ? "Activa" : "Archivada"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="h-7 px-2 rounded border text-[11px] hover:bg-gray-50"
                        onClick={() => toggle(c)}
                      >
                        {c.activa ? "Archivar" : "Activar"}
                      </button>
                      <button
                        className="h-7 px-2 rounded border text-[11px] hover:bg-gray-50"
                        onClick={() => del(c)}
                      >
                        Borrar
                      </button>
                      <Link
                        href={`/ct/scouting/${c.slug}` as Route}
                        className="h-7 px-2 rounded border text-[11px] hover:bg-gray-50"
                      >
                        Abrir
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Container>
  );
}
