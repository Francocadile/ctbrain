// src/app/ct/rivales/page.tsx
"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import { getRivales, type Rival } from "@/lib/settings";

export default function RivalesGridPage() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Rival[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    try {
      const rows = await getRivales();
      setList(rows);
    } catch (e) {
      console.error(e);
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
    return list.filter((r) => r.name.toLowerCase().includes(t));
  }, [q, list]);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
        <div>
          <h1 className="text-lg md:text-xl font-bold">Rivales</h1>
          <p className="text-xs md:text-sm text-gray-500">
            Tocá un escudo para abrir la ficha técnica y el plan de partido.
          </p>
        </div>

        {/* Buscador */}
        <div className="flex items-center gap-2">
          <input
            className="w-64 rounded-md border px-2 py-1.5 text-sm"
            placeholder="Buscar rival…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <span className="text-[12px] text-gray-500">{filtered.length} resultado(s)</span>
        </div>
      </header>

      {/* Grid de escudos */}
      <section className="rounded-2xl border bg-white p-3">
        {loading ? (
          <div className="p-6 text-gray-500">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-gray-500 italic">Sin resultados</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
            {filtered.map((r) => (
              <Link
                key={r.id}
                href={`/ct/rivales/${r.id}` as Route}
                className="group flex flex-col items-center gap-2 rounded-xl border bg-white p-3 hover:shadow transition"
                title={r.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {r.logoUrl ? (
                  <img
                    src={r.logoUrl}
                    alt={r.name}
                    className="h-16 w-16 object-contain rounded bg-white"
                  />
                ) : (
                  <div className="h-16 w-16 rounded bg-gray-100 border" />
                )}
                <div className="text-[11px] text-gray-600 text-center line-clamp-2 group-hover:text-black">
                  {r.name}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
