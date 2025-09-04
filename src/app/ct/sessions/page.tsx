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
  createdAt: string; // ISO
  updatedAt: string; // ISO
  createdBy: Pick<User, "id" | "name" | "email"> | null;
  user?: { id: string; name: string | null; email: string | null; role?: string | null } | null;
  type?: string | null;
};

// --- constantes de filas usadas en el editor ---
const SESSION_NAME_ROW = "NOMBRE SESIÓN";
const META_LUGAR = "LUGAR";
const META_HORA = "HORA";

/* ============================
   Helpers
============================ */
function ymdUTCFromISO(iso: string) {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

// [GRID:morning|afternoon:<ROW>] | YYYY-MM-DD
const GRID_RE = /^\[GRID:(morning|afternoon):(.+?)\]/i;

function parseGrid(description?: string | null): { turn?: TurnKey; row?: string } {
  const text = (description || "").trim();
  if (!text) return {};
  const m = text.match(GRID_RE);
  if (!m) return {};
  return { turn: m[1] as TurnKey, row: (m[2] || "").trim() };
}

function inferTurnFromISO(iso: string): TurnKey {
  const h = new Date(iso).getUTCHours();
  return h < 12 ? "morning" : "afternoon";
}

function formatHumanDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

// Normaliza etiquetas: quita acentos, colapsa espacios, lowercase
function normalizeLabel(s?: string | null) {
  return (s || "")
    .normalize("NFD")
    // @ts-ignore - Unicode property escapes soportadas en runtime moderno
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const NAME_ROW_NORM = normalizeLabel(SESSION_NAME_ROW);
const LUGAR_NORM = normalizeLabel(META_LUGAR);
const HORA_NORM = normalizeLabel(META_HORA);

/** Devuelve true si la sesión es la celda de NOMBRE SESIÓN */
function isSessionNameCell(s: Session): boolean {
  const { row } = parseGrid(s.description);
  return normalizeLabel(row) === NAME_ROW_NORM;
}

/** Busca en el conjunto completo la celda META (LUGAR | HORA) del mismo día/turno */
function findMetaFor(
  all: Session[],
  dayYmd: string,
  turn: TurnKey,
  metaRow: "LUGAR" | "HORA"
): string {
  const wanted = metaRow === "LUGAR" ? LUGAR_NORM : HORA_NORM;
  const item = all.find((x) => {
    const { turn: t, row } = parseGrid(x.description);
    return (
      t === turn &&
      normalizeLabel(row) === wanted &&
      ymdUTCFromISO(x.date) === dayYmd
    );
  });
  return (item?.title || "").trim();
}

/* ============================
   Página
============================ */
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

  // 1) Nos quedamos SOLO con las celdas "NOMBRE SESIÓN" (robusto con normalización)
  const onlyNamed = useMemo(() => {
    return (sessions || []).filter(isSessionNameCell);
  }, [sessions]);

  // 2) Agrupamos por día + turno y nos quedamos con la MÁS RECIENTE (updatedAt)
  const groupedLatest = useMemo(() => {
    const map = new Map<string, Session>(); // key: ymd::turn
    for (const s of onlyNamed) {
      const { turn: tFromDesc } = parseGrid(s.description);
      const turn = (tFromDesc ?? inferTurnFromISO(s.date)) as TurnKey;
      const ymd = ymdUTCFromISO(s.date);
      const key = `${ymd}::${turn}`;
      const prev = map.get(key);
      if (!prev) {
        map.set(key, s);
      } else {
        const prevTime = new Date(prev.updatedAt || prev.date).getTime();
        const curTime = new Date(s.updatedAt || s.date).getTime();
        if (curTime >= prevTime) map.set(key, s);
      }
    }
    return Array.from(map.values());
  }, [onlyNamed]);

  // 3) Orden por fecha desc
  const ordered = useMemo(
    () => [...groupedLatest].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [groupedLatest]
  );

  // 4) Aplicar filtro por fecha si se eligió un día
  const visible = useMemo(() => {
    if (!dateFilter) return ordered;
    return ordered.filter((s) => ymdUTCFromISO(s.date) === dateFilter);
  }, [ordered, dateFilter]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sesiones</h1>
          <p className="text-sm text-gray-500">
            Lista basada en el nombre asignado en el editor semanal (fila “{SESSION_NAME_ROW}”).
          </p>
        </div>

        {/* Filtro por fecha (opcional) */}
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
          No hay sesiones para mostrar. Asegurate de haber puesto “{SESSION_NAME_ROW}” en el editor.
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((s) => {
            const parsed = parseGrid(s.description);
            const turn = (parsed.turn ?? inferTurnFromISO(s.date)) as TurnKey;
            const ymd = ymdUTCFromISO(s.date);

            // Nombre EXACTO que cargaste en el editor
            const displayTitle = (s.title || "").trim() || "(Sin nombre)";

            // Meta (se buscan en todas las sesiones del mismo día/turno)
            const lugar = findMetaFor(sessions, ymd, turn, "LUGAR");
            const hora = findMetaFor(sessions, ymd, turn, "HORA");

            // Link a la vista por día/turno
            const byDayHref = `/ct/sessions/by-day/${ymd}/${turn}`;

            return (
              <li
                key={s.id}
                className="rounded-xl border p-3 shadow-sm flex items-start justify-between bg-white"
              >
                <div>
                  <h3 className="font-semibold text-[15px]">
                    <a href={byDayHref} className="hover:underline" title="Abrir sesión (día/turno)">
                      {displayTitle}
                    </a>
                  </h3>

                  <div className="text-xs text-gray-500 mt-1 space-x-3">
                    <span>📅 {formatHumanDateTime(s.date)}</span>
                    <span>🕑 {turn === "morning" ? "Mañana" : "Tarde"}</span>
                    {hora && <span>⏰ {hora}</span>}
                    {lugar && <span>📍 {lugar}</span>}
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
