// src/app/ct/sessions/buscar/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { listKinds } from "@/lib/settings";
import {
  searchExercises,
  type ExerciseDTO,
} from "@/lib/api/exercises";

type Order = "createdAt" | "title";
type Dir = "asc" | "desc";

export default function BuscarEjerciciosPage() {
  const [kinds, setKinds] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("");
  const [order, setOrder] = useState<Order>("createdAt");
  const [dir, setDir] = useState<Dir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ExerciseDTO[]>([]);
  const [total, setTotal] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const { data, meta } = await searchExercises({
        q,
        kind: kindFilter || undefined,
        order,
        dir,
        page,
        pageSize,
      });

      // dedupe defensivo por id
      const seen = new Set<string>();
      const dedup = data.filter((d) => {
        if (seen.has(d.id)) return false;
        seen.add(d.id);
        return true;
      });

      setRows(dedup);
      setTotal(meta.total);
    } catch (e) {
      console.error(e);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => setKinds(await listKinds()))();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    load();
  }, [q, kindFilter, order, dir, page]);

  const pages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Buscar ejercicios</h1>
          <p className="text-sm text-gray-500">
            Lista unificada de todos tus ejercicios (orden por fecha o título).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            className="rounded-xl border px-3 py-1.5 text-sm"
            placeholder="Buscar (título, descripción, espacio, jugadores)"
          />

          <select
            value={kindFilter}
            onChange={(e) => {
              setPage(1);
              setKindFilter(e.target.value);
            }}
            className="rounded-xl border px-2 py-1.5 text-sm"
            title="Tipo"
          >
            <option value="">Todos los tipos</option>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>

          <div className="inline-flex rounded-xl border overflow-hidden">
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value as Order)}
              className="px-2 py-1.5 text-xs"
            >
              <option value="createdAt">Fecha</option>
              <option value="title">Título</option>
            </select>
            <div className="w-px bg-gray-200" />
            <select
              value={dir}
              onChange={(e) => setDir(e.target.value as Dir)}
              className="px-2 py-1.5 text-xs"
            >
              <option value="desc">↓</option>
              <option value="asc">↑</option>
            </select>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="text-sm text-gray-500">Cargando…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border p-6 text-sm text-gray-600">
          No hay ejercicios que coincidan.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((ex) => {
            // SIEMPRE debe abrir el editor de la sesión del ejercicio
            const sessionId =
              (ex as any).sourceSessionId ??
              (ex as any).sessionId ??
              null;
            const href = sessionId
              ? `/ct/sessions/${sessionId}`
              : `/ct/sessions`; // fallback muy raro

            return (
              <li
                key={ex.id}
                className="rounded-xl border p-3 shadow-sm bg-white flex items-start justify-between gap-3"
              >
                <div>
                  <h3 className="font-semibold text-[15px]">
                    {ex.title}
                  </h3>
                  <div className="text-xs text-gray-500 mt-1 space-x-3">
                    <span>
                      📅{" "}
                      {new Date(ex.createdAt).toLocaleString(undefined, {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {ex.kind?.name && <span>🏷 {ex.kind.name}</span>}
                    {ex.space && <span>📍 {ex.space}</span>}
                    {ex.players && <span>👥 {ex.players}</span>}
                    {ex.duration && <span>⏱ {ex.duration}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={href}
                    className="text-xs px-3 py-1.5 rounded-lg border hover:bg-gray-50"
                  >
                    Ver ejercicio
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {total} ejercicios · página {page} / {pages}
        </div>
        <div className="inline-flex rounded-xl border overflow-hidden">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-50"
          >
            ◀ Anterior
          </button>
          <div className="w-px bg-gray-200" />
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-50"
          >
            Siguiente ▶
          </button>
        </div>
      </div>
    </div>
  );
}
