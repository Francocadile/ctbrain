// src/app/ct/scouting/page.tsx
"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState } from "react";
import { listCategories, type ScoutingCategory } from "@/lib/scouting";
import Container from "@/components/ui/container";

export default function ScoutingHomePage() {
  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState<ScoutingCategory[]>([]);

  async function load() {
    setLoading(true);
    try {
      const rows = await listCategories();
      setCats(rows.filter(c => c.activa).sort((a,b)=>a.orden-b.orden));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <Container>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg md:text-xl font-bold">Scouting</h1>
          <p className="text-xs md:text-sm text-gray-500">Elegí una categoría para ver la lista de jugadores.</p>
        </div>
        <Link
          href={"/ct/scouting/config" as Route}
          className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs"
        >
          Gestionar categorías
        </Link>
      </div>

      {loading ? (
        <div className="p-4 text-gray-500">Cargando…</div>
      ) : cats.length === 0 ? (
        <div className="p-8 text-gray-500 italic border rounded-2xl bg-white">
          No hay categorías activas. Crealas desde <Link href={"/ct/scouting/config" as Route} className="underline">Config</Link>.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {cats.map((c) => (
            <Link
              key={c.id}
              href={`/ct/scouting/${c.slug}` as Route}
              className="flex items-center justify-center rounded-lg border bg-white p-4 text-center hover:shadow-md transition"
            >
              <span className="font-medium">{c.nombre}</span>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}
