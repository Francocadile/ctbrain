// src/app/ct/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getSessionsWeek,
  getMonday,
  toYYYYMMDDUTC,
  type SessionDTO,
} from "@/lib/api/sessions";

type TurnKey = "morning" | "afternoon";
const CONTENT_ROWS = ["PRE ENTREN0", "FÍSICO", "TÉCNICO–TÁCTICO"] as const;
const META_ROWS = ["LUGAR", "HORA", "VIDEO"] as const;

// ---- Helpers de fecha ----
function addDaysUTC(date: Date, days: number) {
  const x = new Date(date);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}
function humanDayUTC(ymd: string) {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });
}

// ---- Marca de celda en description ----
function cellMarker(turn: TurnKey, row: string) {
  return `[GRID:${turn}:${row}]`;
}
function isCellOf(s: SessionDTO, turn: TurnKey, row: string) {
  return typeof s.description === "string" && s.description.startsWith(cellMarker(turn, row));
}

// ---- VIDEO "titulo|url" ----
function parseVideoValue(v: string | null | undefined): { label: string; url: string } {
  const raw = (v || "").trim();
  if (!raw) return { label: "", url: "" };
  const [label, url] = raw.split("|").map((s) => s.trim());
  if (!url && label?.startsWith("http")) return { label: "Video", url: label };
  return { label: label || "", url: url || "" };
}

export default function DashboardSemanaPage() {
  const qs = useSearchParams();
  const hideHeader = qs.get("hideHeader") === "1";

  // Semana base (lunes)
  const [base, setBase] = useState<Date>(() => getMonday(new Date()));

  // Datos de la semana
  const [loading, setLoading] = useState(false);
  const [daysMap, setDaysMap] = useState<Record<string, SessionDTO[]>>({});
  const [weekStart, setWeekStart] = useState<string>("");
  const [weekEnd, setWeekEnd] = useState<string>("");

  async function loadWeek(d: Date) {
    setLoading(true);
    try {
      const monday = getMonday(d);
      const startYYYYMMDD = toYYYYMMDDUTC(monday);
      const res = await getSessionsWeek({ start: startYYYYMMDD });
      setDaysMap(res.days);
      setWeekStart(res.weekStart);
      setWeekEnd(res.weekEnd);
    } catch (e) {
      console.error(e);
      alert("No se pudo cargar la semana.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWeek(base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  // Navegación de semanas
  const goPrevWeek = () => setBase((d) => addDaysUTC(d, -7));
  const goNextWeek = () => setBase((d) => addDaysUTC(d, 7));
  const goTodayWeek = () => setBase(getMonday(new Date()));

  // Días Lunes→Domingo
  const orderedDays = useMemo(() => {
    if (!weekStart) return [];
    const start = new Date(`${weekStart}T00:00:00.000Z`);
    return Array.from({ length: 7 }).map((_, i) => toYYYYMMDDUTC(addDaysUTC(start, i)));
  }, [weekStart]);

  // --- Buscar celdas existentes ---
  function findCell(dayYmd: string, turn: TurnKey, row: string): SessionDTO | undefined {
    const list = daysMap[dayYmd] || [];
    return list.find((s) => isCellOf(s, turn, row));
  }

  // ---- Celdas READONLY ----
  function ReadonlyMetaCell({
    dayYmd,
    turn,
    row,
  }: {
    dayYmd: string;
    turn: TurnKey;
    row: (typeof META_ROWS)[number];
  }) {
    const existing = findCell(dayYmd, turn, row);
    const text = (existing?.title ?? "").trim();

    if (!text) return <div className="h-8 text-[12px] text-gray-400 italic px-1.5 flex items-center">—</div>;

    if (row === "VIDEO") {
      const { label, url } = parseVideoValue(text);
      if (url) {
        return (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="h-8 text-[12px] underline text-emerald-700 px-1.5 flex items-center truncate"
            title={label || "Video"}
          >
            {label || "Video"}
          </a>
        );
      }
      return <div className="h-8 text-[12px] px-1.5 flex items-center truncate">{label}</div>;
    }

    // LUGAR / HORA
    return <div className="h-8 text-[12px] px-1.5 flex items-center truncate">{text}</div>;
  }

  function ReadonlyContentCell({
    dayYmd,
    turn,
    row,
  }: {
    dayYmd: string;
    turn: TurnKey;
    row: string;
  }) {
    const existing = findCell(dayYmd, turn, row);
    const text = (existing?.title ?? "").trim();
    const sessionId = existing?.id;

    return (
      <div className="space-y-1">
        {sessionId ? (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500">
              {row} —{" "}
              {new Date(`${dayYmd}T00:00:00Z`).toLocaleDateString(undefined, {
                day: "2-digit",
                month: "2-digit",
                timeZone: "UTC",
              })}{" "}
              {turn === "morning" ? "Mañana" : "Tarde"}
            </span>
            <a
              href={`/ct/sesiones/${sessionId}`}
              className="text-[11px] rounded-lg border px-2 py-0.5 hover:bg-gray-50"
              title="Abrir ejercicio"
            >
              Abrir ejercicio
            </a>
          </div>
        ) : (
          <div className="h-3" />
        )}

        <div
          className="min-h-[90px] w-full rounded-xl border p-2 text-[13px] leading-5 whitespace-pre-wrap bg-gray-50"
          title={text || ""}
        >
          {text ? text : <span className="text-gray-400 italic">—</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 space-y-3">
      {/* Header */}
      {!hideHeader && (
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-bold">Dashboard — Plan semanal (solo lectura)</h1>
            <p className="text-xs md:text-sm text-gray-500">
              Semana {weekStart || "—"} → {weekEnd || "—"} (Lun→Dom)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={goPrevWeek} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">
              ◀ Semana anterior
            </button>
            <button onClick={goTodayWeek} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">
              Hoy
            </button>
            <button onClick={goNextWeek} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">
              Semana siguiente ▶
            </button>
          </div>
        </header>
      )}

      {loading ? (
        <div className="text-gray-500">Cargando semana…</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          {/* Cabecera de días */}
          <div
            className="grid text-xs"
            style={{ gridTemplateColumns: `120px repeat(7, minmax(120px, 1fr))` }}
          >
            <div className="bg-gray-50 border-b px-2 py-1.5 font-semibold text-gray-600"></div>
            {orderedDays.map((ymd) => (
              <div key={ymd} className="bg-gray-50 border-b px-2 py-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wide">
                  {humanDayUTC(ymd)}
                </div>
                <div className="text-[10px] text-gray-400">{ymd}</div>
              </div>
            ))}
          </div>

          {/* META MAÑANA */}
          <div className="border-t">
            <div className="bg-emerald-50 text-emerald-900 font-semibold px-2 py-1 border-b uppercase tracking-wide text-[12px]">
              TURNO MAÑANA · Meta
            </div>
            {META_ROWS.map((rowName) => (
              <div
                key={`morning-meta-${rowName}`}
                className="grid items-center"
                style={{ gridTemplateColumns: `120px repeat(7, minmax(120px, 1fr))` }}
              >
                <div className="bg-gray-50/60 border-r px-2 py-1.5 text-[11px] font-medium text-gray-600">
                  {rowName}
                </div>
                {orderedDays.map((ymd) => (
                  <div key={`${ymd}-morning-${rowName}`} className="p-1">
                    <ReadonlyMetaCell dayYmd={ymd} turn="morning" row={rowName} />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* BLOQUES MAÑANA */}
          <div className="border-t">
            <div className="bg-emerald-100/70 text-emerald-900 font-semibold px-2 py-1 border-b uppercase tracking-wide text-[12px]">
              TURNO MAÑANA
            </div>
            {CONTENT_ROWS.map((rowName) => (
              <div
                key={`morning-${rowName}`}
                className="grid items-stretch"
                style={{ gridTemplateColumns: `120px repeat(7, minmax(120px, 1fr))` }}
              >
                <div className="bg-gray-50/60 border-r px-2 py-2 text-[11px] font-medium text-gray-600">
                  {rowName}
                </div>
                {orderedDays.map((ymd) => (
                  <div key={`${ymd}-morning-${rowName}`} className="p-1">
                    <ReadonlyContentCell dayYmd={ymd} turn="morning" row={rowName} />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* META TARDE */}
          <div className="border-t">
            <div className="bg-emerald-50 text-emerald-900 font-semibold px-2 py-1 border-b uppercase tracking-wide text-[12px]">
              TURNO TARDE · Meta
            </div>
            {META_ROWS.map((rowName) => (
              <div
                key={`afternoon-meta-${rowName}`}
                className="grid items-center"
                style={{ gridTemplateColumns: `120px repeat(7, minmax(120px, 1fr))` }}
              >
                <div className="bg-gray-50/60 border-r px-2 py-1.5 text-[11px] font-medium text-gray-600">
                  {rowName}
                </div>
                {orderedDays.map((ymd) => (
                  <div key={`${ymd}-afternoon-${rowName}`} className="p-1">
                    <ReadonlyMetaCell dayYmd={ymd} turn="afternoon" row={rowName} />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* BLOQUES TARDE */}
          <div className="border-t">
            <div className="bg-emerald-100/70 text-emerald-900 font-semibold px-2 py-1 border-b uppercase tracking-wide text-[12px]">
              TURNO TARDE
            </div>
            {CONTENT_ROWS.map((rowName) => (
              <div
                key={`afternoon-${rowName}`}
                className="grid items-stretch"
                style={{ gridTemplateColumns: `120px repeat(7, minmax(120px, 1fr))` }}
              >
                <div className="bg-gray-50/60 border-r px-2 py-2 text-[11px] font-medium text-gray-600">
                  {rowName}
                </div>
                {orderedDays.map((ymd) => (
                  <div key={`${ymd}-afternoon-${rowName}`} className="p-1">
                    <ReadonlyContentCell dayYmd={ymd} turn="afternoon" row={rowName} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
