// src/app/ct/sessions/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

type Role = "ADMIN" | "CT" | "MEDICO" | "JUGADOR" | "DIRECTIVO";
type TurnKey = "morning" | "afternoon";

type User = {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
};

type Session = {
  id: string;
  title: string | null;
  description?: string | null;
  date: string; // ISO
  createdAt?: string; // ISO
  updatedAt?: string; // ISO
  createdBy?: Pick<User, "id" | "name" | "email"> | null;
  user?: User | null;
  type?: string | null;
};

const SESSION_NAME_ROW = "NOMBRE SESIÓN";

// ---- helpers -------------------------------------------------------
function ymdUTCFromISO(iso: string) {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}
function parseTurnAndRow(description?: string | null): {
  turn?: TurnKey;
  row?: string;
} {
  const text = (description || "").trim();
  if (!text) return {};
  let m = text.match(/^\[GRID:(morning|afternoon):(.+?)\]/i);
  if (m) return { turn: m[1] as TurnKey, row: (m[2] || "").trim() };
  m = text.match(/^\[DAYFLAG:(morning|afternoon)\]/i);
  if (m) return { turn: m[1] as TurnKey };
  return {};
}
function inferTurnFromISO(iso: string): TurnKey {
  const h = new Date(iso).getUTCHours();
  return h < 12 ? "morning" : "afternoon";
}

// Agrupado que renderiza UNA tarjeta por día/turno
type IndexItem = {
  ymd: string;
  turn: TurnKey;
  dateISO: string; // para ordenar
  name: string; // desde "NOMBRE SESIÓN"
  place?: string;
  createdBy?: string;
};

export default function CTSessionsPage() {
  const [rows, setRows] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        // Últimas 50 celdas; las agrupamos nosotros
        const res = await fetch("/api/sessions", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "No se pudieron cargar las sesiones");
        setRows(json.data as Session[]);
      } catch (e: any) {
        setError(e.message || "Error cargando sesiones");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Construir índice por día/turno
  const index: IndexItem[] = useMemo(() => {
    const map = new Map<string, IndexItem>();

    for (const s of rows) {
      const ymd = ymdUTCFromISO(s.date);
      const { turn: parsedTurn, row } = parseTurnAndRow(s.description);
      const turn = parsedTurn ?? inferTurnFromISO(s.date);
      const key = `${ymd}::${turn}`;

      // Saltar filas que no son del GRID ni DAYFLAG
      if (!row && !/^\[DAYFLAG:/i.test((s.description || ""))) continue;

      const item = map.get(key) || {
        ymd,
        turn,
        dateISO: s.date,
        name: "",
        place: undefined,
        createdBy: s?.user?.name || s?.user?.email || undefined,
      };

      // Nombre desde "NOMBRE SESIÓN"
      if (row === SESSION_NAME_ROW) {
        item.name = (s.title || "").trim();
      }
      // Lugar desde "LUGAR"
      if (row === "LUGAR") {
        item.place = (s.title || "").trim();
      }

      // Preferimos la fecha más tardía para ordenar (por si hay tarde)
      if (new Date(s.date).getTime() > new Date(item.dateISO).getTime()) {
        item.dateISO = s.date;
      }

      map.set(key, item);
    }

    // A la salida, si no hay nombre, no inventamos nada (queda vacío)
    const list = Array.from(map.values()).sort(
      (a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
    );

    return list;
  }, [rows]);

  const visible = useMemo(() => {
    if (!dateFilter) return index;
    return index.filter((it) => it.ymd === dateFilter);
  }, [index, dateFilter]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sesiones</h1>
          <p className="text-sm text-gray-500">Listado cronológico · “Ver sesión” abre el día/turno</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-lg border px-2 py-1.5 text-sm"
            placeholder="YYYY-MM-DD"
            title="Filtrar por fecha"
          />
          <button
            onClick={() => setDateFilter("")}
            className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50"
            disabled={!dateFilter}
            title="Quitar filtro"
          >
            Limpiar
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Cargando sesiones…</div>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border p-6 text-sm text-gray-600">
          No hay sesiones para mostrar.
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((it) => {
            const byDayHref = `/ct/sessions/by-day/${it.ymd}/${it.turn}`;
            const turnLabel = it.turn === "morning" ? "Mañana" : "Tarde";

            return (
              <li key={`${it.ymd}-${it.turn}`} className="rounded-xl border p-3 shadow-sm flex items-start justify-between bg-white">
                <div>
                  <h3 className="font-semibold text-[15px]">
                    <a href={byDayHref} className="hover:underline" title="Abrir sesión (día/turno)">
                      {it.name || "—"}
                    </a>
                  </h3>

                  <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    <span>📅 {new Date(it.dateISO).toLocaleDateString()}</span>
                    <span>🕑 {turnLabel}</span>
                    {it.place ? <span>📍 {it.place}</span> : null}
                    {it.createdBy ? <span>👤 {it.createdBy}</span> : null}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <a
                    href={byDayHref}
                    className="text-xs px-3 py-1.5 rounded-lg border hover:bg-gray-50"
                    title="Ver sesión (día/turno)"
                  >
                    Ver sesión
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
