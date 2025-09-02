// src/app/ct/sessions/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

type Role = "ADMIN" | "CT" | "MEDICO" | "JUGADOR" | "DIRECTIVO";
type TurnKey = "morning" | "afternoon";

type User = { id: string; name: string | null; email: string | null; role: Role; };
type SessionRow = {
  id: string;
  title: string | null;
  description?: string | null;
  date: string; // ISO
  createdAt?: string;
  updatedAt?: string;
  createdBy?: Pick<User, "id" | "name" | "email"> | null;
  user?: { id: string; name: string | null; email: string | null; role?: string | null } | null;
  type?: string | null;
};

type GroupItem = { key: string; ymd: string; turn: TurnKey; dateISO: string; name: string; place?: string; };

function ymdUTCFromISO(iso: string) {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

const RE = /^\[(GRID|DAYFLAG):(morning|afternoon)(?::(.+?))?\]\s*\|\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i;

function parse(description?: string | null) {
  const m = (description || "").match(RE);
  if (!m) return {};
  return { kind: m[1] as "GRID" | "DAYFLAG", turn: m[2] as TurnKey, row: (m[3] || "").trim(), ymd: m[4] };
}

export default function CTSessionsPage() {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("");

  async function fetchAll() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/sessions", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudieron cargar las sesiones");
      setRows(json.data as SessionRow[]);
    } catch (e: any) {
      setError(e.message || "Error cargando sesiones");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { fetchAll(); }, []);

  const groups: GroupItem[] = useMemo(() => {
    const map = new Map<string, GroupItem>();
    for (const s of rows) {
      const { turn, row, ymd } = parse(s.description);
      if (!turn || !ymd) continue;
      const key = `${ymd}::${turn}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          ymd,
          turn,
          dateISO: new Date(`${ymd}T00:00:00.000Z`).toISOString(),
          name: "",
          place: undefined,
        });
      }
      const g = map.get(key)!;

      const rowUp = (row || "").toUpperCase();
      // Nombre de sesión: fila "TITULO" o que empiece con "NOMBRE"
      if (rowUp === "TITULO" || rowUp.startsWith("NOMBRE")) {
        const t = (s.title || "").trim();
        if (t) g.name = t;
      }
      if (rowUp === "LUGAR") {
        const t = (s.title || "").trim();
        if (t) g.place = t;
      }
    }

    let idx = 1;
    return Array.from(map.values())
      .sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1))
      .map((g) => ({ ...g, name: g.name || `Sesión ${idx++} ${g.turn === "morning" ? "TM" : "TT"}` }));
  }, [rows]);

  const visible = useMemo(() => (!dateFilter ? groups : groups.filter((g) => g.ymd === dateFilter)), [groups, dateFilter]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sesiones</h1>
          <p className="text-sm text-gray-500">Listado cronológico · “Ver sesión” abre el día/turno</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
                 className="rounded-lg border px-2 py-1.5 text-sm" />
          <button onClick={() => setDateFilter("")} className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50" disabled={!dateFilter}>
            Limpiar
          </button>
        </div>
      </header>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="text-sm text-gray-500">Cargando…</div>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border p-6 text-sm text-gray-600">No hay sesiones para mostrar.</div>
      ) : (
        <ul className="space-y-3">
          {visible.map((g) => {
            const byDayHref = `/ct/sessions/by-day/${g.ymd}/${g.turn}`;
            return (
              <li key={g.key} className="rounded-xl border p-3 shadow-sm flex items-center justify-between bg-white">
                <div>
                  <h3 className="font-semibold text-[15px]">
                    <a href={byDayHref} className="hover:underline">{g.name}</a>
                  </h3>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-3">
                    <span>📅 {g.ymd}</span>
                    <span>🕑 {g.turn === "morning" ? "Mañana" : "Tarde"}</span>
                    {g.place ? <span>📍 {g.place}</span> : null}
                  </div>
                </div>
                <a href={byDayHref} className="text-xs px-3 py-1.5 rounded-lg border hover:bg-gray-50">Ver sesión</a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
