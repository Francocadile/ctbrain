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
  title: string;
  description?: string | null;
  date: string; // ISO
  createdAt: string; // ISO
  updatedAt: string; // ISO
  createdBy: Pick<User, "id" | "name" | "email">;
  players: User[];
  type?: string | null;
};

// ---- helpers -------------------------------------------------------
function ymdUTCFromISO(iso: string) {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

// Parse marcador inicial
function parseMarker(description?: string | null):
  | { kind: "GRID"; turn: TurnKey; row: string }
  | { kind: "DAYFLAG"; turn: TurnKey }
  | null {
  const text = (description || "").trim();
  if (!text) return null;
  let m = text.match(/^\[GRID:(morning|afternoon):(.+?)\]/i);
  if (m) return { kind: "GRID", turn: m[1] as TurnKey, row: (m[2] || "").trim() };
  m = text.match(/^\[DAYFLAG:(morning|afternoon)\]/i);
  if (m) return { kind: "DAYFLAG", turn: m[1] as TurnKey };
  return null;
}

// Si no hay marcador, inferir por hora UTC
function inferTurnFromISO(iso: string): TurnKey {
  const h = new Date(iso).getUTCHours();
  return h < 12 ? "morning" : "afternoon";
}

type Group = {
  key: string;
  ymd: string;
  turn: TurnKey;
  title?: string; // TITULO
  place?: string; // LUGAR
  anyDateISO?: string; // para ordenar estable cuando hay empate
};

export default function CTSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtro por fecha (YYYY-MM-DD). Vacío => mostrar todas
  const [dateFilter, setDateFilter] = useState<string>("");

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/sessions", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudieron cargar las sesiones");
      setSessions(json.data as Session[]);
    } catch (e: any) {
      setError(e.message || "Error cargando sesiones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // ---- Agrupar por día/turno y tomar meta (TITULO, LUGAR) ----
  const groups = useMemo(() => {
    const map = new Map<string, Group>();

    for (const s of sessions) {
      const marker = parseMarker(s.description);
      if (!marker) continue; // ignoramos sesiones sueltas sin GRID/DAYFLAG (no son parte del plan semanal)
      const turn = marker.kind === "GRID" ? marker.turn : marker.turn;
      const ymd = ymdUTCFromISO(s.date);
      const key = `${ymd}::${turn}`;

      if (!map.has(key)) {
        map.set(key, { key, ymd, turn, anyDateISO: s.date });
      }
      const g = map.get(key)!;

      if (marker.kind === "GRID") {
        const row = marker.row.toUpperCase();
        if (row === "TITULO") {
          // nombre de la sesión
          const name = (s.title || "").trim();
          if (name) g.title = name;
        } else if (row === "LUGAR") {
          const place = (s.title || "").trim();
          if (place) g.place = place;
        }
      }
      // si el registro trae una fecha "mejor", la usamos para ordenar
      if (!g.anyDateISO || new Date(s.date).getTime() < new Date(g.anyDateISO).getTime()) {
        g.anyDateISO = s.date;
      }
    }

    // array ordenado por fecha desc y mañana->tarde
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      const t = new Date(b.anyDateISO || `${b.ymd}T00:00:00Z`).getTime()
              - new Date(a.anyDateISO || `${a.ymd}T00:00:00Z`).getTime();
      if (t !== 0) return t;
      // mañana antes que tarde en el mismo día (desc ⇒ invertimos)
      const order = (x: TurnKey) => (x === "morning" ? 0 : 1);
      return order(a.turn) - order(b.turn);
    });
    return arr;
  }, [sessions]);

  // Aplicar filtro por fecha si se eligió un día
  const visible = useMemo(() => {
    if (!dateFilter) return groups;
    return groups.filter((g) => g.ymd === dateFilter);
  }, [groups, dateFilter]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sesiones</h1>
          <p className="text-sm text-gray-500">Listado cronológico · “Ver sesión” abre el día/turno</p>
        </div>

        {/* Filtro por fecha */}
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
          {visible.map((g, idx) => {
            const byDayHref = `/ct/sessions/by-day/${g.ymd}/${g.turn}`;
            const displayTitle =
              (g.title || "").trim() ||
              `Sesión ${idx + 1} ${g.turn === "morning" ? "TM" : "TT"}`;

            return (
              <li
                key={g.key}
                className="rounded-xl border p-3 shadow-sm flex items-center justify-between bg-white"
              >
                <div className="min-w-0">
                  <h3 className="font-semibold text-[15px] truncate">
                    <a href={byDayHref} className="hover:underline" title="Abrir sesión (día/turno)">
                      {displayTitle}
                    </a>
                  </h3>

                  <div className="text-[12px] text-gray-600 mt-0.5 flex flex-wrap gap-x-3">
                    <span>📅 {g.ymd}</span>
                    <span>🕑 {g.turn === "morning" ? "Mañana" : "Tarde"}</span>
                    {g.place && <span>📍 {g.place}</span>}
                  </div>
                </div>

                <a
                  href={byDayHref}
                  className="text-xs px-3 py-1.5 rounded-lg border hover:bg-gray-50 shrink-0"
                  title="Ver sesión (día/turno)"
                >
                  Ver sesión
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
