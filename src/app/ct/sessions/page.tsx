// src/app/ct/sessions/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  getSessionsWeek,
  getMonday,
  toYYYYMMDDUTC,
  type SessionDTO,
} from "@/lib/api/sessions";

type TurnKey = "morning" | "afternoon";

const SESSION_NAME_ROW = "NOMBRE SESIÓN";
const META_LUGAR = "LUGAR";
const META_HORA = "HORA";

// ===== helpers =====================================================

function ymdUTCFromISO(iso: string) {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

// [GRID:morning|afternoon:<ROW>]
const GRID_RE = /^\[GRID:(morning|afternoon):(.+?)\]/i;

function parseGrid(description?: string | null): { turn?: TurnKey; row?: string } {
  const text = (description || "").trim();
  if (!text) return {};
  const m = text.match(GRID_RE);
  if (!m) return {};
  return { turn: m[1] as TurnKey, row: (m[2] || "").trim() };
}

function isRow(s: SessionDTO, turn: TurnKey, row: string) {
  const m = parseGrid(s.description);
  return m.turn === turn && (m.row || "").toUpperCase() === row.toUpperCase();
}

function formatHumanDate(ymd: string) {
  // Formatea YYYY-MM-DD en local sin que el TZ lo corra un día
  const [y, m, d] = ymd.split("-").map(Number);
  // Usa toLocaleDateString con timeZone UTC para evitar shift
  const dt = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  return dt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  });
}

function formatHumanDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

// ===== page ========================================================

export default function CTSessionsPage() {
  const [base, setBase] = useState<Date>(() => getMonday(new Date())); // lunes actual
  const [daysMap, setDaysMap] = useState<Record<string, SessionDTO[]>>({});
  const [weekStart, setWeekStart] = useState<string>("");
  const [weekEnd, setWeekEnd] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<string>(""); // YYYY-MM-DD

  // helpers de navegación semanal (para el pill)
  const goPrevWeek = () =>
    setBase((d) => {
      const x = new Date(d);
      x.setUTCDate(x.getUTCDate() - 7);
      return x;
    });
  const goToday = () => setBase(getMonday(new Date()));
  const goNextWeek = () =>
    setBase((d) => {
      const x = new Date(d);
      x.setUTCDate(x.getUTCDate() + 7);
      return x;
    });

  // NUEVO: cuando el usuario elige una fecha, movemos la "base" a ese lunes
  function onDateChange(value: string) {
    setDateFilter(value);
    if (!value) return;
    // Parse seguro en UTC
    const picked = new Date(`${value}T00:00:00.000Z`);
    const monday = getMonday(picked);
    setBase(monday);
  }

  async function loadWeek(d: Date) {
    setLoading(true);
    try {
      const start = toYYYYMMDDUTC(getMonday(d));
      const res = await getSessionsWeek({ start });
      setDaysMap(res.days);
      setWeekStart(res.weekStart);
      setWeekEnd(res.weekEnd);
    } catch (e) {
      console.error(e);
      alert("No se pudieron cargar las sesiones.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWeek(base);
  }, [base]);

  // Construimos la lista SÓLO con la fila "NOMBRE SESIÓN" de cada día/turno
  type Item = {
    id: string;
    title: string;
    ymd: string;
    turn: TurnKey;
    dateISO: string;
    lugar?: string;
    hora?: string;
  };

  const items: Item[] = useMemo(() => {
    const out: Item[] = [];
    if (!weekStart) return out;

    const orderedDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(`${weekStart}T00:00:00.000Z`);
      d.setUTCDate(d.getUTCDate() + i);
      return toYYYYMMDDUTC(d);
    });

    for (const ymd of orderedDays) {
      const list = daysMap[ymd] || [];
      (["morning", "afternoon"] as TurnKey[]).forEach((turn) => {
        // 1) celda nombre sesión (si existe)
        const nameCell = list.find((s) => isRow(s, turn, SESSION_NAME_ROW));
        if (!nameCell) return;

        // 2) meta
        const lugar = (list.find((s) => isRow(s, turn, META_LUGAR))?.title || "").trim();
        const hora = (list.find((s) => isRow(s, turn, META_HORA))?.title || "").trim();

        out.push({
          id: nameCell.id,
          title: (nameCell.title || "").trim() || "(Sin nombre)",
          ymd,
          turn,
          dateISO: nameCell.date,
          lugar,
          hora,
        });
      });
    }

    // Orden por fecha (asc) y turno (mañana antes que tarde)
    return out.sort((a, b) => {
      if (a.ymd !== b.ymd) return a.ymd.localeCompare(b.ymd);
      if (a.turn !== b.turn) return a.turn === "morning" ? -1 : 1;
      return 0;
    });
  }, [daysMap, weekStart]);

  // Filtro opcional por fecha
  const visible = useMemo(() => {
    if (!dateFilter) return items;
    return items.filter((x) => x.ymd === dateFilter);
  }, [items, dateFilter]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sesiones</h1>
          <p className="text-sm text-gray-500">
            Basadas en la fila “{SESSION_NAME_ROW}” del editor semanal.
          </p>
          <p className="text-xs text-gray-400">
            Semana {weekStart ? formatHumanDate(weekStart) : "—"} →{" "}
            {weekEnd ? formatHumanDate(weekEnd) : "—"} (Lun→Dom)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* === Navegación semanal – estilo pill segmentado === */}
          <div className="inline-flex rounded-xl border overflow-hidden">
            <button
              onClick={goPrevWeek}
              className="px-2.5 py-1.5 text-xs hover:bg-gray-50"
              title="Semana anterior"
            >
              ◀ Semana anterior
            </button>
            <div className="w-px bg-gray-200" />
            <button
              onClick={goToday}
              className="px-2.5 py-1.5 text-xs hover:bg-gray-50"
              title="Volver a esta semana"
            >
              Hoy
            </button>
            <div className="w-px bg-gray-200" />
            <button
              onClick={goNextWeek}
              className="px-2.5 py-1.5 text-xs hover:bg-gray-50"
              title="Semana siguiente ▶"
            >
              Semana siguiente ▶
            </button>
          </div>

          {/* Filtro por fecha */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => onDateChange(e.target.value)}
            className="rounded-xl border px-2 py-1.5 text-sm"
            title="Filtrar por fecha"
          />
          <button
            onClick={() => setDateFilter("")}
            className="text-sm px-3 py-1.5 rounded-xl border hover:bg-gray-50"
            disabled={!dateFilter}
            title="Quitar filtro"
          >
            Limpiar
          </button>
        </div>
      </header>

      {loading ? (
        <div className="text-sm text-gray-500">Cargando sesiones…</div>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border p-6 text-sm text-gray-600">
          No hay sesiones para mostrar en esta semana/fecha.
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((s) => {
            const byDayHref = `/ct/sessions/by-day/${s.ymd}/${s.turn}`;
            return (
              <li
                key={s.id}
                className="rounded-xl border p-3 shadow-sm flex items-start justify-between bg-white"
              >
                <div>
                  <h3 className="font-semibold text-[15px]">
                    <a
                      href={byDayHref}
                      className="hover:underline"
                      title="Abrir sesión (día/turno)"
                    >
                      {s.title}
                    </a>
                  </h3>

                  <div className="text-xs text-gray-500 mt-1 space-x-3">
                    <span>📅 {formatHumanDateTime(s.dateISO)}</span>
                    <span>🕑 {s.turn === "morning" ? "Mañana" : "Tarde"}</span>
                    {s.hora && <span>⏰ {s.hora}</span>}
                    {s.lugar && <span>📍 {s.lugar}</span>}
                  </div>
                </div>

                <a
                  href={byDayHref}
                  className="text-xs px-3 py-1.5 rounded-lg border hover:bg-gray-50"
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
