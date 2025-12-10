"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { listCategories, listPlayers, type ScoutingCategory, type ScoutingPlayer } from "@/lib/scouting";
import Container from "@/components/ui/container";

export default function ScoutingWatchlistPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<ScoutingPlayer[]>([]);
  const [categories, setCategories] = useState<ScoutingCategory[]>([]);

  const categoryById = useMemo(() => {
    const map = new Map<string, ScoutingCategory>();
    for (const c of categories) {
      map.set(c.id, c);
    }
    return map;
  }, [categories]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [cats, pls] = await Promise.all([
        listCategories(),
        listPlayers({ estado: "WATCHLIST" }),
      ]);
      setCategories(cats);
      setPlayers(pls);
    } catch (e: any) {
      console.error("Error al cargar watchlist de scouting", e);
      setError(e?.message || "No se pudo cargar la watchlist.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function escapeCsv(value: string): string {
    if (value == null) return "";
    const needsQuotes = /[",\n]/.test(value);
    let escaped = value.replace(/"/g, '""');
    if (needsQuotes) {
      escaped = `"${escaped}"`;
    }
    return escaped;
  }

  function exportCsv() {
    if (!players || players.length === 0) {
      alert("No hay jugadores en watchlist para exportar.");
      return;
    }

    const headers = [
      "Nombre",
      "Posición",
      "Club",
      "Categoría",
      "Estado",
      "Rating",
      "Contacto",
      "Video",
      "Actualizado",
    ];

    const lines: string[] = [];
    lines.push(headers.join(","));

    for (const p of players) {
      const cat = p.categoriaId ? categoryById.get(p.categoriaId) : undefined;
      const categoriaNombre = cat ? cat.nombre : "";

      const contacto =
        (p as any).playerPhone ||
        (p as any).playerEmail ||
        (p as any).agentPhone ||
        (p as any).agentEmail ||
        "";

      const video = Array.isArray((p as any).videos) && (p as any).videos.length > 0
        ? String((p as any).videos[0] ?? "")
        : "";

      const updatedAt = (p as any).updatedAt
        ? String((p as any).updatedAt)
        : "";

      const row = [
        escapeCsv(p.fullName ?? ""),
        escapeCsv(Array.isArray(p.positions) ? p.positions.join("/") : ""),
        escapeCsv(p.club ?? ""),
        escapeCsv(categoriaNombre),
        escapeCsv((p as any).estado ?? ""),
        escapeCsv(p.rating != null ? String(p.rating) : ""),
        escapeCsv(contacto),
        escapeCsv(video),
        escapeCsv(updatedAt),
      ];

      lines.push(row.join(","));
    }

    const csvContent = lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "scouting_watchlist.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <Container>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg md:text-xl font-bold">Watchlist de scouting</h1>
          <p className="text-xs md:text-sm text-gray-500">
            Jugadores marcados para seguimiento especial en todas las categorías.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={"/ct/scouting" as Route}
            className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs"
          >
            ← Volver a scouting
          </Link>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 md:p-6 shadow-sm">
        {loading ? (
          <div className="text-sm text-gray-500">Cargando watchlist...</div>
        ) : error ? (
          <div className="space-y-2">
            <div className="text-sm text-red-600">{error}</div>
            <button
              onClick={load}
              className="px-3 py-1.5 rounded-xl border text-xs hover:bg-gray-50"
            >
              Reintentar
            </button>
          </div>
        ) : players.length === 0 ? (
          <div className="text-sm text-gray-500">No hay jugadores en watchlist por ahora.</div>
        ) : (
          <div className="overflow-x-auto -mx-3 md:mx-0">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-3 py-2">Nombre</th>
                  <th className="text-left px-3 py-2">Club</th>
                  <th className="text-left px-3 py-2">Posiciones</th>
                  <th className="text-left px-3 py-2">Categoría</th>
                  <th className="text-left px-3 py-2">Rating</th>
                  <th className="text-right px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => {
                  const cat = p.categoriaId ? categoryById.get(p.categoriaId) : undefined;
                  return (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{p.fullName}</td>
                      <td className="px-3 py-2">{p.club || "—"}</td>
                      <td className="px-3 py-2">{(p.positions || []).join("/") || "—"}</td>
                      <td className="px-3 py-2">{cat ? cat.nombre : "Sin categoría"}</td>
                      <td className="px-3 py-2">{p.rating ?? ""}</td>
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
    </Container>
  );
}
