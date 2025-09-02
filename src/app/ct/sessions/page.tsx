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

// helpers
function ymdUTCFromISO(iso: string) { return new Date(iso).toISOString().slice(0, 10); }
function isDayName(desc?: string | null) {
  return !!(desc || "").trim().match(/^\[DAYNAME:(morning|afternoon)\]/i);
}
function parseTurn(desc?: string | null): TurnKey | undefined {
  const m = (desc || "").trim().match(/^\[(?:DAYNAME|DAYFLAG|GRID):(morning|afternoon)(?::.*?)?\]/i);
  return m ? (m[1] as TurnKey) : undefined;
}
function inferTurnFromISO(iso: string): TurnKey { return new Date(iso).getUTCHours() < 12 ? "morning" : "afternoon"; }

export default function CTSessionsPage() {
  const [all, setAll] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/sessions", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "No se pudieron cargar las sesiones");
        setAll(json.data as Session[]);
      } catch (e: any) {
        setError(e.message || "Error cargando sesiones");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ✅ solo sesiones reales (con nombre de sesión)
  const sessions = useMemo(() => all.filter((s) => isDayName(s.description)), [all]);

  const sorted = useMemo(
    () => [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [sessions]
  );

  const visible = useMemo(() => {
    if (!dateFilter) return sorted;
    return sorted.filter((s) => ymdUTCFromISO(s.date) === dateFilter);
  }, [sorted, dateFilter]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sesiones</h1>
          <p className="text-sm text-gray-500">Listado cronológico · “Ver sesión” abre el día/turno</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
                 className="rounded-lg border px-2 py-1.5 text-sm" title="Filtrar por fecha" />
          <button onClick={() => setDateFilter("")} className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50"
                  disabled={!dateFilter}>Limpiar</button>
        </div>
      </header>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="text-sm text-gray-500">Cargando sesiones…</div>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border p-6 text-sm text-gray-600">No hay sesiones para mostrar.</div>
      ) : (
        <ul className="space-y-3">
          {visible.map((s) => {
            const turn = parseTurn(s.description) ?? inferTurnFromISO(s.date);
            const title = (s.title || "").trim() || "Sesión sin nombre";
            const ymd = ymdUTCFromISO(s.date);
            const byDayHref = `/ct/sessions/by-day/${ymd}/${turn}`;

            return (
              <li key={s.id} className="rounded-xl border p-3 shadow-sm flex items-start justify-between bg-white">
                <div>
                  <h3 className="font-semibold text-[15px]">
                    <a href={byDayHref} className="hover:underline">{title}</a>
                  </h3>
                  <div className="text-xs text-gray-500 mt-1">
                    <span className="inline-block mr-3">📅 {new Date(s.date).toLocaleDateString()}</span>
                    <span className="inline-block mr-3">🕑 {turn === "morning" ? "Mañana" : "Tarde"}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <a href={byDayHref} className="text-xs px-3 py-1.5 rounded-lg border hover:bg-gray-50">Ver sesión</a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
