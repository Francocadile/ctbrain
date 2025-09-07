"use client";

import { useEffect, useMemo, useState } from "react";

type SessionDTO = {
  id: string;
  title: string;
  description?: string | null;
  date: string | Date;
  type?: string | null;
};

type Exercise = {
  title: string;
  kind?: string;
  space?: string;
  players?: string;
  duration?: string;
  description?: string;
  imageUrl?: string;
};

// ------- helpers: decode + fallback -------
const TAGS = ["[EXERCISES]", "[EXERCISE]", "[EX]"];

function tryDecode(desc?: string | null): Exercise[] {
  const text = (desc || "").trim();
  if (!text) return [];
  let idx = -1;
  for (const t of TAGS) {
    const j = text.lastIndexOf(t);
    if (j > idx) idx = j;
  }
  if (idx === -1) return [];
  const after = text.slice(idx).replace(/^\[[^\]]+\]\s*/i, "").trim();
  const b64 = after.split(/\s+/)[0] || "";
  try {
    const json = atob(b64);
    const arr = JSON.parse(json) as Partial<Exercise>[];
    if (Array.isArray(arr)) {
      return arr.map((e) => ({
        title: e.title ?? "",
        kind: e.kind ?? "",
        space: e.space ?? "",
        players: e.players ?? "",
        duration: e.duration ?? "",
        description: e.description ?? "",
        imageUrl: e.imageUrl ?? "",
      }));
    }
  } catch {
    // silencioso
  }
  return [];
}

function toLocal(date: string | Date) {
  const d = new Date(date);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ------- API mínima a /api/sessions -------
async function fetchSessions(page = 1, pageSize = 50) {
  const url = new URL(
    "/api/sessions",
    typeof window === "undefined" ? "http://localhost" : window.location.origin
  );
  url.searchParams.set("order", "date");
  url.searchParams.set("dir", "desc");
  url.searchParams.set("page", String(page));
  url.searchParams.set("pageSize", String(pageSize));
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudieron listar sesiones");
  return (await res.json()) as {
    data: SessionDTO[];
    meta?: { total: number; page: number; pageSize: number; pages: number };
  };
}

type Item = {
  id: string;            // sessionId__idx
  sessionId: string;
  sessionTitle: string;
  createdAt: string | Date;
  exIndex: number;
  title: string;
  kind?: string;
  space?: string;
  players?: string;
  duration?: string;
};

export default function BuscarEjerciciosDesdeSesiones() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Item[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Traemos bastantes sesiones recientes (podés ampliar si querés)
        const { data: sess } = await fetchSessions(1, 200);

        // Expandimos ejercicios (o creamos 1 virtual si no hay marcador)
        const items: Item[] = [];
        for (const s of sess) {
          const decoded = tryDecode(s.description);
          if (decoded.length === 0) {
            // Fallback: un ejercicio “virtual” para que la lista no quede vacía
            items.push({
              id: `${s.id}__0`,
              sessionId: s.id,
              sessionTitle: s.title || "Sesión",
              createdAt: s.date,
              exIndex: 0,
              title: (s.title?.trim() || "Ejercicio").toString(),
              kind: "",
              space: undefined,
              players: undefined,
              duration: undefined,
            });
          } else {
            decoded.forEach((ex, idx) => {
              items.push({
                id: `${s.id}__${idx}`,
                sessionId: s.id,
                sessionTitle: s.title || "Sesión",
                createdAt: s.date,
                exIndex: idx,
                title: ex.title || s.title || `Ejercicio ${idx + 1}`,
                kind: ex.kind || "",
                space: ex.space || undefined,
                players: ex.players || undefined,
                duration: ex.duration || undefined,
              });
            });
          }
        }

        // Orden por fecha desc
        items.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setRows(items);
      } catch (e) {
        console.error(e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // filtro + paginado en cliente
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => {
      return (
        r.title.toLowerCase().includes(t) ||
        (r.kind || "").toLowerCase().includes(t) ||
        (r.space || "").toLowerCase().includes(t) ||
        (r.players || "").toLowerCase().includes(t)
      );
    });
  }, [rows, q]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Ejercicios</h1>
          <p className="text-sm text-gray-500">Listado a partir de tus sesiones</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            className="rounded-xl border px-3 py-1.5 text-sm"
            placeholder="Buscar (título, tipo, espacio, jugadores)"
          />
          <div className="inline-flex rounded-xl border overflow-hidden text-xs">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              className="px-3 py-1.5 hover:bg-gray-50"
              disabled={page <= 1}
            >
              ◀ Anterior
            </button>
            <div className="w-px bg-gray-200" />
            <button
              onClick={() => setPage(Math.min(pages, page + 1))}
              className="px-3 py-1.5 hover:bg-gray-50"
              disabled={page >= pages}
            >
              Siguiente ▶
            </button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="text-sm text-gray-500">Cargando…</div>
      ) : pageRows.length === 0 ? (
        <div className="rounded-lg border p-6 text-sm text-gray-600">
          No hay ejercicios.
        </div>
      ) : (
        <ul className="space-y-3">
          {pageRows.map((it) => {
            const href = `/ct/sessions/${it.sessionId}#ex-${it.exIndex}`;
            return (
              <li
                key={it.id}
                className="rounded-xl border p-3 shadow-sm bg-white flex items-start justify-between gap-3"
              >
                <div>
                  <h3 className="font-semibold text-[15px]">
                    {it.title || it.sessionTitle}
                  </h3>
                  <div className="text-xs text-gray-500 mt-1 space-x-3">
                    <span>📅 {toLocal(it.createdAt)}</span>
                    {it.kind && <span>🏷 {it.kind}</span>}
                    {it.space && <span>📍 {it.space}</span>}
                    {it.players && <span>👥 {it.players}</span>}
                    {it.duration && <span>⏱ {it.duration}</span>}
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
          {filtered.length} ejercicios · página {page} / {pages}
        </div>
      </div>
    </div>
  );
}
