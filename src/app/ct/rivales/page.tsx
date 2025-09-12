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
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-bold">Rivales</h1>
          <p className="text-xs md:text-sm text-gray-500">
            Tocá un escudo para abrir la ficha técnica y el plan de partido.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            className="w-56 rounded-md border px-2 py-1.5 text-sm"
            placeholder="Buscar rival…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Link
            href={"/ct/rivales/gestionar" as Route}
            className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs"
          >
            Gestionar
          </Link>
        </div>
      </header>

      {/* Grid */}
      {loading ? (
        <div className="p-4 text-gray-500">Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-gray-500 italic border rounded-2xl bg-white">
          No hay rivales para mostrar.
          <Link href={"/ct/rivales/gestionar" as Route} className="ml-1 underline">
            Agregalos desde “Gestionar”.
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
          {filtered.map((r) => (
            <Link
              key={r.id}
              href={`/ct/rivales/${r.id}` as Route}
              className="flex flex-col items-center rounded-lg border bg-white p-3 hover:shadow-md transition"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {r.logoUrl ? (
                <img
                  src={r.logoUrl}
                  alt={r.name}
                  className="h-16 w-16 object-contain rounded bg-white"
                />
              ) : (
                <div className="h-16 w-16 rounded border bg-gray-50" />
              )}
              <div className="mt-2 text-xs text-gray-600 line-clamp-1">{r.name}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
