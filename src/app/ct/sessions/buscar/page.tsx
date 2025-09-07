"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  id: string;
  title: string;
  kind: string;
  space: string;
  players: string;
  duration: string;
  createdAt: string;
  sessionId: string;
  turn?: "morning" | "afternoon" | "";
  row?: string;
  ymd?: string;
  idx: number;
};

type Order = "date" | "title";
type Dir = "asc" | "desc";

export default function BuscarEjerciciosPage() {
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
      const url = new URL("/api/exercises-flat", window.location.origin);
      if (q) url.searchParams.set("q", q);
      url.searchParams.set("order", order);
      url.searchParams.set("dir", dir);
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", String(pageSize));
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      setRows(json.data || []);
      setTotal(json.meta?.total || 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, order, dir, page]);
  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Ejercicios</h1>
          <p className="text-sm text-gray-500">Listado a partir de tus sesiones</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => { setPage(1); setQ(e.target.value); }}
            className="rounded-xl border px-3 py-1.5 text-sm"
            placeholder="Buscar (título, descripción, espacio, jugadores)"
          />
          <div className="inline-flex rounded-xl border overflow-hidden">
            <select value={order} onChange={(e) => setOrder(e.target.value as Order)} className="px-2 py-1.5 text-xs">
              <option value="date">Fecha</option>
              <option value="title">Título</option>
            </select>
            <div className="w-px bg-gray-200" />
            <select value={dir} onChange={(e) => setDir(e.target.value as Dir)} className="px-2 py-1.5 text-xs">
              <option value="desc">↓</option>
              <option value="asc">↑</option>
            </select>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="text-sm text-gray-500">Cargando…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border p-6 text-sm text-gray-600">No hay ejercicios.</div>
      ) : (
        <ul className="space-y-3">
          {rows.map((ex) => {
            const href =
              `/ct/sessions/${ex.sessionId}` +
              (ex.turn && ex.row && ex.ymd
                ? `?turn=${ex.turn}&row=${encodeURIComponent(ex.row)}&ymd=${ex.ymd}#ex-${ex.idx}`
                : "");
            return (
              <li key={ex.id} className="rounded-xl border p-3 shadow-sm bg-white flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[15px]">{ex.title || "Sin título"}</h3>
                  <div className="text-xs text-gray-500 mt-1 space-x-3">
                    <span>
                      📅{" "}
                      {new Date(ex.createdAt).toLocaleString(undefined, {
                        year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                    {ex.kind && <span>🏷 {ex.kind}</span>}
                    {ex.space && <span>📍 {ex.space}</span>}
                    {ex.players && <span>👥 {ex.players}</span>}
                    {ex.duration && <span>⏱ {ex.duration}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a href={href} className="text-xs px-3 py-1.5 rounded-lg border hover:bg-gray-50">
                    Ver ejercicio
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">{total} ejercicios · página {page} / {pages}</div>
        <div className="inline-flex rounded-xl border overflow-hidden">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                  className="px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-50">
            ◀ Anterior
          </button>
          <div className="w-px bg-gray-200" />
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}
                  className="px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-50">
            Siguiente ▶
          </button>
        </div>
      </div>
    </div>
  );
}
