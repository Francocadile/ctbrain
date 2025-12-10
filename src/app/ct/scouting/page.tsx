// src/app/ct/scouting/page.tsx
"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState } from "react";
import { listCategories, listPlayers, type ScoutingCategory, type ScoutingPlayer } from "@/lib/scouting";
import Container from "@/components/ui/container";

type CategorySummary = {
  category: ScoutingCategory;
  total: number;
  activos: number;
  watchlist: number;
  descartados: number;
};

export default function ScoutingHomePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<CategorySummary[]>([]);
  const [search, setSearch] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [globalResults, setGlobalResults] = useState<ScoutingPlayer[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const rows = await listCategories();
      const activeCats = rows.filter((c) => c.activa).sort((a, b) => a.orden - b.orden);

      if (activeCats.length === 0) {
        setSummaries([]);
        return;
      }

      const playersByCat = await Promise.all(
        activeCats.map(async (cat) => {
          try {
            const players = await listPlayers({ categoriaId: cat.id });
            return { cat, players } as { cat: ScoutingCategory; players: ScoutingPlayer[] };
          } catch (e) {
            console.error("Error al cargar jugadores de scouting para categoría", cat.id, e);
            return { cat, players: [] as ScoutingPlayer[] };
          }
        })
      );

      const next: CategorySummary[] = playersByCat.map(({ cat, players }) => {
        const total = players.length;
        const activos = players.filter((p) => p.estado === "ACTIVO").length;
        const watchlist = players.filter((p) => p.estado === "WATCHLIST").length;
        const descartados = players.filter((p) => p.estado === "DESCARTADO").length;
        return { category: cat, total, activos, watchlist, descartados };
      });

      setSummaries(next);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "No se pudo cargar el resumen de scouting.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Búsqueda global de jugadores (todas las categorías)
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setGlobalResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    setSearchError(null);

    const handle = setTimeout(async () => {
      try {
        const players = await listPlayers({ q });
        if (!cancelled) {
          setGlobalResults(players);
        }
      } catch (e: any) {
        console.error("Error en búsqueda global de scouting", e);
        if (!cancelled) {
          setSearchError(e?.message || "No se pudo cargar la búsqueda. Intentá de nuevo.");
          setGlobalResults([]);
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [search]);

  return (
    <Container>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg md:text-xl font-bold">Scouting</h1>
          <p className="text-xs md:text-sm text-gray-500">
            Resumen de categorías y jugadores observados.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={"/ct/scouting/watchlist" as Route}
            className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs"
          >
            Ver watchlist
          </Link>
          <Link
            href={"/ct/scouting/config" as Route}
            className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs"
          >
            Gestionar categorías
          </Link>
        </div>
      </div>

      {/* Buscador global de jugadores */}
      <div className="mb-4 flex flex-col gap-1">
        <label className="text-[11px] text-gray-500">Búsqueda global de jugadores</label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar jugador por nombre o club"
          className="w-full md:w-96 rounded-md border px-2 py-1.5 text-sm"
        />
        <p className="text-[11px] text-gray-400">
          Escribí al menos 2 caracteres para buscar en todas las categorías.
        </p>
      </div>

      {loading ? (
        <div className="p-4 text-gray-500">Cargando…</div>
      ) : error ? (
        <div className="p-4 text-sm text-red-600 border border-red-100 bg-red-50 rounded-2xl">
          {error}
        </div>
      ) : summaries.length === 0 ? (
        <div className="p-8 text-gray-500 border rounded-2xl bg-white">
          <div className="font-semibold mb-1">Todavía no hay categorías de scouting configuradas.</div>
          <p className="text-sm mb-3">
            Configurá categorías para organizar los jugadores observados.
          </p>
          <Link
            href={"/ct/scouting/config" as Route}
            className="inline-flex items-center px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs"
          >
            Ir a configuración de categorías
          </Link>
        </div>
      ) : (
        <>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {summaries.map(({ category, total, activos, watchlist, descartados }) => (
            <Link
              key={category.id}
              href={`/ct/scouting/${category.slug}` as Route}
              className="group rounded-2xl border bg-white p-4 hover:shadow-md transition flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">{category.nombre}</div>
                  <div className="text-[11px] text-gray-500">
                    Jugadores observados en esta categoría.
                  </div>
                </div>
                {category.color ? (
                  <span
                    className="h-3 w-3 rounded-full border"
                    style={{ backgroundColor: category.color || undefined }}
                  />
                ) : null}
              </div>

              <div className="text-xs text-gray-700 mt-1">
                <span className="font-semibold">Total:</span> {total}
              </div>
              <div className="text-[11px] text-gray-500">
                <span className="mr-1">Activo: <span className="text-gray-800 font-medium">{activos}</span></span>
                <span className="mr-1">· Watchlist: <span className="text-gray-800 font-medium">{watchlist}</span></span>
                <span>· Descartado: <span className="text-gray-800 font-medium">{descartados}</span></span>
              </div>
            </Link>
          ))}
        </div>
        {/* Resultados de búsqueda global */}
        {search.trim().length >= 2 && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Resultados de búsqueda</h2>
              <div className="text-[11px] text-gray-500">
                {searchLoading
                  ? "Buscando jugadores…"
                  : `Resultados para "${search.trim()}" (${globalResults.length} jugadores encontrados)`}
              </div>
            </div>
            {searchError ? (
              <div className="p-3 text-xs text-red-600 border border-red-100 bg-red-50 rounded-xl">
                {searchError}
              </div>
            ) : searchLoading && globalResults.length === 0 ? (
              <div className="p-3 text-xs text-gray-500">Buscando jugadores…</div>
            ) : globalResults.length === 0 ? (
              <div className="p-3 text-xs text-gray-500">No se encontraron jugadores para esta búsqueda.</div>
            ) : (
              <div className="rounded-2xl border bg-white overflow-hidden">
                <table className="min-w-full text-[11px] md:text-xs">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-3 py-2">Nombre</th>
                      <th className="text-left px-3 py-2">Club</th>
                      <th className="text-left px-3 py-2">Estado</th>
                      <th className="text-left px-3 py-2">Categoría</th>
                      <th className="text-right px-3 py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {globalResults.map((p) => {
                      const cat = summaries.find((s) => s.category.id === p.categoriaId)?.category;
                      return (
                        <tr key={p.id} className="border-b last:border-0">
                          <td className="px-3 py-2 font-medium">{p.fullName}</td>
                          <td className="px-3 py-2">{p.club || "—"}</td>
                          <td className="px-3 py-2">{p.estado}</td>
                          <td className="px-3 py-2">{cat ? cat.nombre : "—"}</td>
                          <td className="px-3 py-2 text-right">
                            <Link
                              href={`/ct/scouting/player/${p.id}` as Route}
                              className="inline-flex h-7 px-2 rounded border text-[11px] hover:bg-gray-50"
                            >
                              Ficha
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        </>
      )}
    </Container>
  );
}
