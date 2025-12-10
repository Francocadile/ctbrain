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
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<ScoutingCategory[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);
  const [q, setQ] = useState("");
  const [name, setName] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const rows = await listCategories();
      setList(rows.sort((a, b) => a.orden - b.orden));
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "No se pudieron cargar las categorías de scouting.");
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
    try {
      await createCategory(n);
      setName("");
      await load();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "No se pudo crear la categoría.");
    }
  }

  async function toggle(cat: ScoutingCategory) {
    try {
      const patched: ScoutingCategory | undefined = await updateCategory(cat.id, { activa: !cat.activa });
      if (patched) {
        setList(prev => prev.map(c => (c.id === patched.id ? patched : c)));
      } else {
        await load();
      }
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "No se pudo actualizar la categoría.");
    }
  }

  async function del(cat: ScoutingCategory) {
    const ok = confirm("¿Eliminar esta categoría? Esto no elimina los jugadores, pero los dejará sin categoría.");
    if (!ok) return;
    try {
      const res = await deleteCategory(cat.id);
      if ("error" in res) {
        alert(res.error);
        return;
      }
      setList(prev => prev.filter(c => c.id !== cat.id));
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "No se pudo borrar la categoría.");
    }
  }

  async function saveInline(cat: ScoutingCategory, patch: Partial<ScoutingCategory>) {
    const nextName = patch.nombre ?? cat.nombre;
    if (!nextName || !nextName.trim()) {
      alert("El nombre no puede estar vacío");
      return;
    }
    try {
      const updated = await updateCategory(cat.id, patch);
      if (updated) {
        setList(prev => prev.map(c => (c.id === updated.id ? updated : c)));
      } else {
        await load();
      }
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "No se pudo guardar la categoría.");
    }
  }

  async function move(cat: ScoutingCategory, direction: "up" | "down") {
    if (savingOrder) return;
    setSavingOrder(true);
    try {
      const current = [...list].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
      const idx = current.findIndex(c => c.id === cat.id);
      if (idx === -1) return;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= current.length) return;

      const swapped = [...current];
      const temp = swapped[idx];
      swapped[idx] = swapped[targetIdx];
      swapped[targetIdx] = temp;

      const withOrder = swapped.map((c, index) => ({ ...c, orden: index }));

      const originalById = new Map(list.map(c => [c.id, c] as const));
      const changed = withOrder.filter(c => originalById.get(c.id)?.orden !== c.orden);

      setList(withOrder);

      await Promise.all(
        changed.map(c => updateCategory(c.id, { orden: c.orden }))
      );
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "No se pudo guardar el orden de las categorías.");
      await load();
    } finally {
      setSavingOrder(false);
    }
  }

  return (
    <Container>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg md:text-xl font-bold">Scouting — Categorías</h1>
          <p className="text-xs md:text-sm text-gray-500">Crear, renombrar, activar/archivar y ordenar categorías.</p>
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
          <div className="p-4 text-gray-500">Cargando categorías de scouting...</div>
        ) : error ? (
          <div className="p-4 text-sm text-red-600">
            <div className="mb-2">{error}</div>
            <button
              className="px-3 py-1.5 rounded-xl border text-xs hover:bg-gray-50"
              onClick={load}
            >
              Reintentar
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-gray-500 italic">Todavía no hay categorías de scouting configuradas.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-3 py-2 w-16">Orden</th>
                <th className="text-left px-3 py-2">Nombre</th>
                <th className="text-left px-3 py-2">Activa</th>
                <th className="text-left px-3 py-2">Color</th>
                <th className="text-right px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, index) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-3 py-2 align-middle">
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-gray-500 mr-1">{c.orden}</span>
                      <button
                        className="h-6 w-6 flex items-center justify-center rounded border text-[10px] disabled:opacity-40"
                        disabled={savingOrder || index === 0}
                        onClick={() => move(c, "up")}
                      >
                        ↑
                      </button>
                      <button
                        className="h-6 w-6 flex items-center justify-center rounded border text-[10px] disabled:opacity-40"
                        disabled={savingOrder || index === filtered.length - 1}
                        onClick={() => move(c, "down")}
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <input
                      className="w-full rounded-md border px-2 py-1 text-sm"
                      value={c.nombre}
                      onChange={(e) => {
                        const v = e.target.value;
                        setList(prev => prev.map(x => (x.id === c.id ? { ...x, nombre: v } : x)));
                      }}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v !== c.nombre) {
                          saveInline(c, { nombre: v });
                        }
                      }}
                    />
                    <div className="text-[11px] text-gray-400 mt-0.5">Slug: {c.slug}</div>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <label className="inline-flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={c.activa}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setList(prev => prev.map(x => (x.id === c.id ? { ...x, activa: checked } : x)));
                          saveInline(c, { activa: checked });
                        }}
                      />
                      <span>{c.activa ? "Activa" : "Archivada"}</span>
                    </label>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-4 w-4 rounded-full border"
                        style={{ backgroundColor: c.color || undefined }}
                      />
                      <input
                        className="w-32 rounded-md border px-2 py-1 text-xs"
                        placeholder="#ff0000 o red"
                        value={c.color ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setList(prev => prev.map(x => (x.id === c.id ? { ...x, color: v || null } : x)));
                        }}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          const normalized = v === "" ? null : v;
                          if (normalized !== (c.color ?? null)) {
                            saveInline(c, { color: normalized });
                          }
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <div className="flex items-center justify-end gap-2">
                      {savingOrder && (
                        <span className="text-[10px] text-gray-400 mr-2">Guardando orden...</span>
                      )}
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
