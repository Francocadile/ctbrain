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

type SessionRow = {
  id: string;
  title: string | null;
  description: string | null;
  date: string; // ISO
  createdAt: string; // ISO
  updatedAt: string; // ISO
  createdBy?: string | null;
  user?: { id: string; name: string | null; email: string | null; role?: string | null } | null;
  type?: string | null;
};

// ================= helpers =================
function ymdUTCFromISO(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}
const TURN_ORDER: Record<TurnKey, number> = { morning: 0, afternoon: 1 };

function inferTurnFromISO(iso: string): TurnKey {
  const h = new Date(iso).getUTCHours();
  return h < 12 ? "morning" : "afternoon";
}

function parseMarker(desc?: string | null): {
  kind: "GRID" | "DAYFLAG" | "NONE";
  turn?: TurnKey;
  row?: string;
} {
  const text = (desc || "").trim();
  if (!text) return { kind: "NONE" };
  let m = text.match(/^\[GRID:(morning|afternoon):([^\]]+)\]/i);
  if (m) return { kind: "GRID", turn: m[1] as TurnKey, row: (m[2] || "").trim() };
  m = text.match(/^\[DAYFLAG:(morning|afternoon)\]/i);
  if (m) return { kind: "DAYFLAG", turn: m[1] as TurnKey };
  return { kind: "NONE" };
}

type Group = {
  key: string;          // `${ymd}::${turn}`
  ymd: string;
  turn: TurnKey;
  name?: string;        // NOMBRE SESIÓN
  place?: string;       // LUGAR
  flag?: "PARTIDO" | "LIBRE" | "NONE";
  creator?: string;
  any: boolean;         // si hubo cualquier celda de ese día/turno
};

// ================= page =================
export default function CTSessionsPage() {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        // Traemos hasta 50 filas crudas (suficiente para varias semanas).
        const res = await fetch("/api/sessions", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "No se pudieron cargar las sesiones");
        setRows(json.data as SessionRow[]);
      } catch (e: any) {
        setError(e.message || "Error cargando sesiones");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Agrupación por día/turno:
  const groups = useMemo(() => {
    const map = new Map<string, Group>();

    for (const r of rows) {
      const ymd = ymdUTCFromISO(r.date);
      const marker = parseMarker(r.description);
      const turn = marker.turn ?? inferTurnFromISO(r.date);
      const key = `${ymd}::${turn}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          ymd,
          turn,
          flag: "NONE",
          creator: r.user?.name || r.user?.email || undefined,
          any: false,
        });
      }
      const g = map.get(key)!;

      // Cualquier celda del GRID marca que “existe” esa sesión
      if (marker.kind === "GRID") g.any = true;

      // Meta — nombre de sesión y lugar
      if (marker.kind === "GRID" && (marker.row || "").toUpperCase() === "NOMBRE SESIÓN") {
        const t = (r.title || "").trim();
        if (t) g.name = t;
      }
      if (marker.kind === "GRID" && (marker.row || "").toUpperCase() === "LUGAR") {
        const t = (r.title || "").trim();
        if (t) g.place = t;
      }

      // Día: partido/libre
      if (marker.kind === "DAYFLAG") {
        const t = (r.title || "").trim().toUpperCase();
        if (t.startsWith("PARTIDO")) g.flag = "PARTIDO";
        else if (t.startsWith("LIBRE")) g.flag = "LIBRE";
        else g.flag = "NONE";
        g.any = true;
      }

      // Fallback para sesiones antiguas sin marker
      if (marker.kind === "NONE") {
        g.any = true;
        if (!g.name && (r.title || "").trim()) g.name = (r.title || "").trim();
      }
    }

    // Convertimos a lista y ordenamos por fecha desc + turno (mañana antes que tarde)
    const list = Array.from(map.values()).filter((g) => g.any);
    list.sort((a, b) => {
      if (a.ymd !== b.ymd) return a.ymd < b.ymd ? 1 : -1;
      return TURN_ORDER[a.turn] - TURN_ORDER[b.turn];
    });
    return list;
  }, [rows]);

  // Filtro de fecha (opcional)
  const visible = useMemo(() => {
    if (!dateFilter) return groups;
    return groups.filter((g) => g.ymd === dateFilter);
  }, [groups, dateFilter]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sesiones</h1>
          <p className="text-sm text-gray-500">
            Listado cronológico · “Ver sesión” abre el día/turno
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-lg border px-2 py-1.5 text-sm"
            title="Filtrar por fecha"
          />
          <button
            onClick={() => setDateFilter("")}
            className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50"
            disabled={!dateFilter}
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
          {visible.map((g) => {
            const href = `/ct/sessions/by-day/${g.ymd}/${g.turn}`;
            const display = g.name
              ? g.name
              : g.flag === "PARTIDO"
              ? "Partido"
              : g.flag === "LIBRE"
              ? "Día libre"
              : `Sesión`;

            return (
              <li
                key={g.key}
                className="rounded-xl border p-3 shadow-sm flex items-start justify-between bg-white"
              >
                <div>
                  <h3 className="font-semibold text-[15px]">
                    <a href={href} className="hover:underline" title="Abrir sesión">
                      {display}
                    </a>
                  </h3>

                  <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    <span>📅 {new Date(`${g.ymd}T00:00:00.000Z`).toLocaleDateString()}</span>
                    <span>🕑 {g.turn === "morning" ? "Mañana" : "Tarde"}</span>
                    {g.place && <span>📍 {g.place}</span>}
                    {g.creator && <span>👤 {g.creator}</span>}
                  </div>
                </div>

                <a
                  href={href}
                  className="text-xs px-3 py-1.5 rounded-lg border hover:bg-gray-50"
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
