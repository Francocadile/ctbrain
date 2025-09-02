// src/app/ct/sessions/by-day/[date]/[turn]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type TurnKey = "morning" | "afternoon";
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
  date: string; // ISO
  createdAt: string; // ISO
  updatedAt: string; // ISO
  createdBy?: Pick<User, "id" | "name" | "email"> | null;
  players?: User[];
};

// filas como en tu editor
const CONTENT_ROWS = ["PRE ENTREN0", "FÍSICO", "TÉCNICO–TÁCTICO", "COMPENSATORIO"] as const;
const META_ROWS = ["LUGAR", "HORA", "VIDEO"] as const;

const DAYFLAG_TAG = "DAYFLAG";

// ------- helpers -------
function ymdUTC(iso: string) {
  const d = new Date(iso);
  // Siempre al día UTC
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function humanDayUTC(ymd: string) {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });
}

function cellMarker(turn: TurnKey, row: string) {
  return `[GRID:${turn}:${row}]`;
}
function dayFlagMarker(turn: TurnKey) {
  return `[${DAYFLAG_TAG}:${turn}]`;
}

function isForDay(desc: string | null | undefined, ymd: string) {
  if (!desc) return false;
  // tus descripciones quedan: "[GRID:... ] | YYYY-MM-DD"
  return desc.includes(ymd);
}

function extractRowFromDesc(desc: string | null | undefined): string | null {
  if (!desc) return null;
  const m = desc.match(/^\[GRID:(morning|afternoon):(.+?)\]/i);
  return m?.[2] || null;
}

function parseDayFlagTitle(title: string | null | undefined): { kind: "NONE" | "PARTIDO" | "LIBRE"; rival?: string; logoUrl?: string } {
  const t = (title || "").trim();
  if (!t) return { kind: "NONE" };
  const [kind, rival, logoUrl] = t.split("|").map((x) => (x || "").trim());
  if (kind === "PARTIDO") return { kind: "PARTIDO", rival: rival || "", logoUrl: logoUrl || "" };
  if (kind === "LIBRE") return { kind: "LIBRE" };
  return { kind: "NONE" };
}

type PageParams = {
  params: {
    date: string; // YYYY-MM-DD
    turn: TurnKey;
  };
  searchParams?: { focus?: string };
};

export default function SessionByDayTurnPage({ params, searchParams }: PageParams) {
  const { date, turn } = params;
  const focusRow = (searchParams?.focus || "").trim();

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState<string | null>(null);

  const focusRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        // Traigo todo y filtro en cliente (no rompo tu API actual)
        const res = await fetch("/api/sessions", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "No se pudieron cargar las sesiones");
        setSessions((json?.data || []) as Session[]);
      } catch (e: any) {
        setError(e?.message || "Error cargando sesiones");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filtramos por día y por turno, usando los marcadores de descripción
  const byDayTurn = useMemo(() => {
    const list = sessions.filter((s) => {
      const sameDay = isForDay(s.description, date) || ymdUTC(s.date) === date;
      if (!sameDay) return false;
      if (!s.description) return false;
      // Debe empezar con GRID del turno o ser DAYFLAG del turno
      return (
        s.description.startsWith(cellMarker(turn, ""))
          || s.description.startsWith(dayFlagMarker(turn))
          || s.description.startsWith(`[GRID:${turn}:`)
      );
    });
    return list;
  }, [sessions, date, turn]);

  // Day flag (si existe)
  const dayFlagSession = useMemo(
    () => byDayTurn.find((s) => s.description?.startsWith(dayFlagMarker(turn))),
    [byDayTurn, turn]
  );
  const dayFlag = parseDayFlagTitle(dayFlagSession?.title);

  // Mapear por fila (meta + contenido)
  const cellByRow = useMemo(() => {
    const map = new Map<string, Session>();
    for (const s of byDayTurn) {
      const row = extractRowFromDesc(s.description);
      if (row) map.set(row, s);
    }
    return map;
  }, [byDayTurn]);

  // Auto-scroll si vino focus
  useEffect(() => {
    if (focusRow && focusRef.current) {
      focusRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusRow, loading]);

  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">
            Sesión — {humanDayUTC(date)} · {date} / {turn === "morning" ? "Mañana" : "Tarde"}
          </h1>
          <p className="text-sm text-gray-500">Solo lectura · enlaces al detalle por ID</p>
        </div>
        <div className="flex gap-2">
          <Link href="/ct/sessions" className="text-sm rounded-lg border px-2 py-1 hover:bg-gray-50">
            ← Volver a “Sesiones”
          </Link>
          <Link href="/ct/plan-semanal" className="text-sm rounded-lg border px-2 py-1 hover:bg-gray-50">
            ✏️ Editor semanal
          </Link>
        </div>
      </header>

      {/* Estado del día */}
      <div className="rounded-xl border bg-white p-3">
        <div className="text-sm font-medium mb-2">Estado del día</div>
        {dayFlag.kind === "LIBRE" ? (
          <span className="text-[11px] bg-gray-100 border px-1.5 py-0.5 rounded">DÍA LIBRE</span>
        ) : dayFlag.kind === "PARTIDO" ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] bg-amber-100 border px-1.5 py-0.5 rounded">
              PARTIDO {dayFlag.rival ? `vs ${dayFlag.rival}` : ""}
            </span>
            {dayFlag.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dayFlag.logoUrl} alt="Logo rival" className="h-6 w-6 object-contain" />
            ) : null}
          </div>
        ) : (
          <span className="text-sm text-gray-500">Normal</span>
        )}
      </div>

      {/* Meta (LUGAR / HORA / VIDEO) */}
      <section className="rounded-xl border bg-white">
        <div className="bg-gray-50 border-b px-3 py-2 text-[12px] font-semibold uppercase tracking-wide">
          Meta
        </div>
        <div className="grid" style={{ gridTemplateColumns: `160px 1fr` }}>
          {META_ROWS.map((row) => {
            const s = cellByRow.get(row);
            const isFocus = focusRow && focusRow === row;
            return (
              <div
                key={`meta-${row}`}
                ref={isFocus ? focusRef : undefined}
                className={`contents ${isFocus ? "bg-amber-50" : ""}`}
              >
                <div className="border-r px-3 py-2 text-[12px] font-medium text-gray-600">{row}</div>
                <div className="px-3 py-2">
                  {s ? (
                    <div className="flex items-center justify-between">
                      <div className="text-sm">{s.title || <span className="text-gray-400">—</span>}</div>
                      <a
                        href={`/ct/sessions/${s.id}`}
                        className="text-[11px] rounded-lg border px-2 py-0.5 hover:bg-gray-50"
                      >
                        Ver / Editar
                      </a>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bloques de contenido */}
      <section className="rounded-xl border bg-white">
        <div className="bg-gray-50 border-b px-3 py-2 text-[12px] font-semibold uppercase tracking-wide">
          Bloques
        </div>
        <div className="grid" style={{ gridTemplateColumns: `160px 1fr` }}>
          {CONTENT_ROWS.map((row) => {
            const s = cellByRow.get(row);
            const isFocus = focusRow && focusRow === row;
            return (
              <div
                key={`row-${row}`}
                ref={isFocus ? focusRef : undefined}
                className={`contents ${isFocus ? "bg-amber-50" : ""}`}
              >
                <div className="border-r px-3 py-3 text-[12px] font-medium text-gray-600 whitespace-pre-line">
                  {row}
                </div>
                <div className="px-3 py-3">
                  {loading ? (
                    <div className="text-sm text-gray-500">Cargando…</div>
                  ) : error ? (
                    <div className="text-sm text-red-600">{error}</div>
                  ) : s ? (
                    <div className="space-y-1">
                      <div className="text-[13px] leading-5 whitespace-pre-wrap">
                        {s.title || <span className="text-gray-400">Sin contenido</span>}
                      </div>
                      <div className="pt-1">
                        <a
                          href={`/ct/sessions/${s.id}`}
                          className="text-[11px] rounded-lg border px-2 py-0.5 hover:bg-gray-50"
                          title="Abrir detalle de ejercicios"
                        >
                          Ver / Editar ejercicio
                        </a>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Estado general */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
