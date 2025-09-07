// src/app/ct/sessions/buscar/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  id: string;           // = sessionId
  sessionId: string;    // idem, para link
  title: string;
  createdAt: string;    // viene como ISO del API
  updatedAt: string;
  description: string | null;
  space: string | null;
  players: string | null;
  duration: string | null;
  imageUrl: string | null;
  tags: string[];
};

type Order = "date" | "title";
type Dir = "asc" | "desc";

type ApiResp = {
  data: Row[];
  meta: { total: number; page: number; pageSize: number; pages: number };
};

export default function BuscarSesionesPage() {
  const [q, setQ] = useState("");
  const [order, setOrder] = useState<Order>("date");
  const [dir, setDir] = useState<Dir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const url = new URL(
        "/api/search/exercises",
        typeof window === "undefined" ? "http://localhost" : window.location.origin
      );
      if (q) url.searchParams.set("q", q);
      url.searchParams.set("order", order);
      url.searchParams.set("dir", dir);
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", String(pageSize));

      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo listar");
      const json = (await res.json()) as ApiResp;

      setRows(json.data);
      setTotal(json.meta.total);
    } catch (e) {
      console.error(e);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  // Cargar al cambiar filtros/página
  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    load();
  }, [q, order, dir, page]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Buscar ejercicios (por sesiones)</h1>
          <p className="text-sm text-gray-500">
            Lista todas tus tareas (derivadas de las sesiones), con búsqueda, orden y acceso directo al editor.
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

          <div className="inline-flex rounded-xl border overflow-hidden">
            <select
              value={order}
              onChange={(e) => {
                setPage(1);
                setOrder(e.target.value as Order);
              }}
              className="px-2 py-1.5 text-xs"
              title="Ordenar por"
            >
              <option value="date">Fecha</option>
              <option value="title">Título</option>
            </select>
            <div className="w-px bg-gray-200" />
            <select
              value={dir}
              onChange={(e) => {
                setPage(1);
                setDir(e.target.value as Dir);
              }}
              className="px-2 py-1.5 text-xs"
              title="Dirección"
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
          No hay resultados que coincidan.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const sessionHref = `/ct/sessions/${r.sessionId}`;
            return (
              <li
                key={r.id}
                className="rounded-xl border p-3 shadow-sm bg-white flex items-start justify-between gap-3"
              >
                <div>
                  <h3 className="font-semibold text-[15px]">{r.title}</h3>
                  <div className="text-xs text-gray-500 mt-1 space-x-3">
                    <span>
                      📅{" "}
                      {new Date(r.createdAt).toLocaleString(undefined, {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {r.duration && <span>⏱ {r.duration}</span>}
                    {r.space && <span>📍 {r.space}</span>}
                    {r.players && <span>👥 {r.players}</span>}
                  </div>
                  {r.description && (
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2">{r.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={sessionHref}
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

      {/* Paginado */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {total} resultados · página {page} / {pages}
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
