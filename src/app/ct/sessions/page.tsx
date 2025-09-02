"use client";

import React, { useEffect, useMemo, useState } from "react";

type Role = "ADMIN" | "CT" | "MEDICO" | "JUGADOR" | "DIRECTIVO";

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
  date: string;        // ISO
  createdAt: string;   // ISO
  updatedAt: string;   // ISO
  createdBy: Pick<User, "id" | "name" | "email">;
  players: User[];
};

type TurnKey = "morning" | "afternoon";
const CONTENT_ROWS = ["PRE ENTREN0", "FÍSICO", "TÉCNICO–TÁCTICO", "COMPENSATORIO"] as const;
const META_ROWS = ["LUGAR", "HORA", "VIDEO"] as const;

function parseFromDescription(desc?: string): { ymd: string | null; turn: TurnKey | null; row: string | null; isDayFlag: boolean } {
  const t = (desc || "").trim();
  // GRID marker
  const m1 = t.match(/^\[GRID:(morning|afternoon):(.+?)\]\s*\|\s*(\d{4}-\d{2}-\d{2})/i);
  if (m1) {
    return { turn: m1[1] as TurnKey, row: m1[2] || null, ymd: m1[3], isDayFlag: false };
  }
  // DAYFLAG marker
  const m2 = t.match(/^\[DAYFLAG:(morning|afternoon)\]\s*\|\s*(\d{4}-\d{2}-\d{2})/i);
  if (m2) {
    return { turn: m2[1] as TurnKey, row: null, ymd: m2[2], isDayFlag: true };
  }
  return { ymd: null, turn: null, row: null, isDayFlag: false };
}

export default function CTSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filtro por fecha (YYYY-MM-DD)
  const [dateFilter, setDateFilter] = useState<string>("");

  useEffect(() => {
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/sessions", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "No se pudieron cargar las sesiones");
        setSessions(json.data as Session[]);
      } catch (e: any) {
        setError(e?.message || "Error cargando sesiones");
      } finally {
        setLoading(false);
      }
    }
    run();
  }, []);

  // agrupamos por día + turno
  const groups = useMemo(() => {
    const map = new Map<string, { ymd: string; turn: TurnKey; countBlocks: number; hasMeta: boolean }>();

    for (const s of sessions) {
      const p = parseFromDescription(s.description || "");
      if (!p.ymd || !p.turn) continue;
      const key = `${p.ymd}::${p.turn}`;
      const prev = map.get(key);

      // ¿este item corresponde a bloque de contenido o a meta?
      const isMeta = META_ROWS.includes((p.row || "") as any);
      const isContent = CONTENT_ROWS.includes((p.row || "") as any);

      if (!prev) {
        map.set(key, {
          ymd: p.ymd,
          turn: p.turn,
          countBlocks: isContent ? 1 : 0,
          hasMeta: !!isMeta,
        });
      } else {
        map.set(key, {
          ...prev,
          countBlocks: prev.countBlocks + (isContent ? 1 : 0),
          hasMeta: prev.hasMeta || !!isMeta,
        });
      }
    }

    let arr = Array.from(map.values());
    // filtro por fecha si se seleccionó
    if (dateFilter) arr = arr.filter((g) => g.ymd === dateFilter);

    // ordenar: fecha desc y mañana antes que tarde dentro del mismo día
    arr.sort((a, b) => {
      if (a.ymd !== b.ymd) return a.ymd < b.ymd ? 1 : -1;
      const weight = (t: TurnKey) => (t === "morning" ? 0 : 1);
      return weight(a.turn) - weight(b.turn);
    });

    return arr;
  }, [sessions, dateFilter]);

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
            className="rounded-lg border px-3 py-2 text-sm"
            title="Filtrar por fecha"
          />
          {!!dateFilter && (
            <button
              onClick={() => setDateFilter("")}
              className="text-sm px-3 py-2 rounded-lg border hover:bg-gray-50"
            >
              Limpiar
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Cargando…</div>
      ) : groups.length === 0 ? (
        <div className="rounded-lg border p-6 text-sm text-gray-600">No hay sesiones para mostrar.</div>
      ) : (
        <ul className="space-y-3">
          {groups.map((g) => (
            <li key={`${g.ymd}-${g.turn}`} className="rounded-xl border p-4 shadow-sm bg-white">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-gray-500">
                    {new Date(`${g.ymd}T00:00:00.000Z`).toLocaleDateString(undefined, {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      timeZone: "UTC",
                    })}{" "}
                    · {g.ymd}
                  </div>
                  <h3 className="text-base font-semibold">
                    Turno {g.turn === "morning" ? "Mañana" : "Tarde"}
                  </h3>
                  <div className="text-xs text-gray-500 mt-1">
                    Bloques cargados: <strong>{g.countBlocks}</strong>{" "}
                    {g.hasMeta ? "· Con meta" : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/ct/sessions/by-day/${g.ymd}/${g.turn}`}
                    className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50"
                  >
                    Ver sesión
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
