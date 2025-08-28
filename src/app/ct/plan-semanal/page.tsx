"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getSessionsWeek,
  createSession,
  deleteSession,
  updateSession,
  getMonday,
  toYYYYMMDDUTC,
  type SessionDTO,
} from "@/lib/api/sessions";

/**
 * Grilla editable tipo planilla:
 * - Meta: LUGAR / HORA / LINK
 * - TURNO MAÑANA: PRE ENTREN0 / FÍSICO / TÉCNICO–TÁCTICO
 * - TURNO TARDE : PRE ENTREN0 / FÍSICO / TÉCNICO–TÁCTICO
 *
 * Cada celda es contentEditable:
 *   - texto nuevo -> crea/update sesión
 *   - texto vacío -> borra sesión
 * Identificador de celda en description: [GRID:<turno>:<row>]
 * Horarios fijos (UTC) para ordenar:
 *   - meta 07:00, mañana 09:00, tarde 15:00
 */

type TurnKey = "meta" | "morning" | "afternoon";
const SECTIONS: Array<{
  key: TurnKey;
  title: string;
  rows: string[];
}> = [
  { key: "meta", title: "", rows: ["LUGAR", "HORA", "LINK"] },
  { key: "morning", title: "TURNO MAÑANA", rows: ["PRE ENTREN0", "FÍSICO", "TÉCNICO–TÁCTICO"] },
  { key: "afternoon", title: "TURNO TARDE", rows: ["PRE ENTREN0", "FÍSICO", "TÉCNICO–TÁCTICO"] },
];

// ---- Helpers de fecha ----
function addDaysUTC(date: Date, days: number) {
  const x = new Date(date);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}
function humanDay(dateISO: string) {
  const d = new Date(dateISO);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });
}
function computeISOForSlot(dayYmd: string, turn: TurnKey) {
  const base = new Date(`${dayYmd}T00:00:00.000Z`);
  const h = turn === "meta" ? 7 : turn === "morning" ? 9 : 15;
  base.setUTCHours(h, 0, 0, 0);
  return base.toISOString();
}

// ---- Marca de celda en description ----
function cellMarker(turn: TurnKey, row: string) {
  return `[GRID:${turn}:${row}]`;
}
function isCellOf(s: SessionDTO, turn: TurnKey, row: string) {
  return typeof s.description === "string" && s.description.startsWith(cellMarker(turn, row));
}

// ---- Debounce simple ----
function useDebouncedCallback<T extends (...args: any[]) => any>(fn: T, delay = 400) {
  const ref = useRef<number | undefined>(undefined);
  return (...args: Parameters<T>) => {
    if (ref.current) window.clearTimeout(ref.current);
    ref.current = window.setTimeout(() => fn(...args), delay);
  };
}

export default function PlanSemanalPage() {
  // Semana base (lunes)
  const [base, setBase] = useState<Date>(() => getMonday(new Date()));

  // Datos de la semana
  const [loading, setLoading] = useState(false);
  const [daysMap, setDaysMap] = useState<Record<string, SessionDTO[]>>({});
  const [weekStart, setWeekStart] = useState<string>("");
  const [weekEnd, setWeekEnd] = useState<string>("");

  // Búsqueda (opcional)
  const [query, setQuery] = useState("");

  // Cargar datos de la semana
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

  // Días de la semana (YYYY-MM-DD) en orden
  const orderedDays = useMemo(() => {
    if (!weekStart) return [];
    const start = new Date(`${weekStart}T00:00:00.000Z`);
    return Array.from({ length: 7 }).map((_, i) => toYYYYMMDDUTC(addDaysUTC(start, i)));
  }, [weekStart]);

  // --- Buscar/actualizar/borrar celdas ---
  function findCell(dayYmd: string, turn: TurnKey, row: string): SessionDTO | undefined {
    const list = daysMap[dayYmd] || [];
    return list.find((s) => isCellOf(s, turn, row));
  }

  async function saveCell(dayYmd: string, turn: TurnKey, row: string, text: string) {
    const existing = findCell(dayYmd, turn, row);
    const iso = computeISOForSlot(dayYmd, turn);
    const marker = cellMarker(turn, row);

    try {
      if (!text.trim()) {
        // vacío -> borrar si existía
        if (existing) {
          await deleteSession(existing.id);
          await loadWeek(base);
        }
        return;
      }

      if (!existing) {
        await createSession({
          title: text.trim(),
          description: `${marker} | ${dayYmd}`,
          date: iso,
          type: "GENERAL",
        });
      } else {
        await updateSession(existing.id, {
          title: text.trim(),
          description: existing.description?.startsWith(marker)
            ? existing.description
            : `${marker} | ${dayYmd}`,
          date: iso,
        });
      }

      await loadWeek(base);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Error al guardar la celda");
    }
  }

  const debouncedSave = useDebouncedCallback(saveCell, 450);

  // Estilo de celda editable (placeholder simulado con data-attribute)
  function EditableCell({
    dayYmd,
    turn,
    row,
    placeholder,
  }: {
    dayYmd: string;
    turn: TurnKey;
    row: string;
    placeholder?: string;
  }) {
    const current = findCell(dayYmd, turn, row);
    const ref = useRef<HTMLDivElement | null>(null);

    const onBlur = () => {
      const txt = ref.current?.innerText ?? "";
      debouncedSave(dayYmd, turn, row, txt);
    };
    const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        const txt = ref.current?.innerText ?? "";
        saveCell(dayYmd, turn, row, txt);
      }
    };

    return (
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className="min-h-[88px] w-full rounded-xl border p-3 outline-none focus:ring-2 focus:ring-emerald-400 whitespace-pre-wrap"
        data-placeholder={placeholder}
        // mostrar valor actual
        dangerouslySetInnerHTML={{ __html: (current?.title ?? "").replace(/\n/g, "<br/>") }}
      />
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Placeholder CSS para contentEditable */}
      <style jsx>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af; /* text-gray-400 */
          pointer-events: none;
          display: block;
        }
      `}</style>

      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plan semanal — Editor en tabla</h1>
          <p className="text-sm text-gray-500">
            Semana {weekStart || "—"} → {weekEnd || "—"}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Tip: <kbd className="rounded border px-1">Ctrl</kbd>/<kbd className="rounded border px-1">⌘</kbd>{" "}
            + <kbd className="rounded border px-1">Enter</kbd> para guardar al instante.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar texto en la semana…"
            className="px-3 py-2 rounded-xl border min-w-[260px]"
          />
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <button onClick={goPrevWeek} className="px-3 py-2 rounded-xl border hover:bg-gray-50">
            ◀ Semana anterior
          </button>
          <button onClick={goTodayWeek} className="px-3 py-2 rounded-xl border hover:bg-gray-50">
            Hoy
          </button>
          <button onClick={goNextWeek} className="px-3 py-2 rounded-xl border hover:bg-gray-50">
            Semana siguiente ▶
          </button>
        </div>
      </header>

      {loading ? (
        <div className="text-gray-500">Cargando semana…</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          {/* Cabecera de días */}
          <div className="grid" style={{ gridTemplateColumns: `180px repeat(7, minmax(220px, 1fr))` }}>
            <div className="bg-gray-50 border-b px-3 py-2 font-semibold text-gray-600"> </div>
            {orderedDays.map((ymd) => (
              <div key={ymd} className="bg-gray-50 border-b px-4 py-2">
                <div className="text-sm font-semibold uppercase tracking-wide">
                  {humanDay(`${ymd}T00:00:00Z`)}
                </div>
                <div className="text-xs text-gray-400">{ymd}</div>
              </div>
            ))}
          </div>

          {/* Secciones */}
          {SECTIONS.map((sec) => (
            <div key={sec.key} className="border-t">
              {sec.title ? (
                <div className="bg-emerald-100/70 text-emerald-900 font-semibold px-4 py-2 border-b uppercase tracking-wide">
                  {sec.title}
                </div>
              ) : null}

              {sec.rows.map((rowName) => (
                <div
                  key={`${sec.key}-${rowName}`}
                  className="grid items-stretch"
                  style={{ gridTemplateColumns: `180px repeat(7, minmax(220px, 1fr))` }}
                >
                  {/* etiqueta fila */}
                  <div className="bg-gray-50/60 border-r px-3 py-3 text-sm font-medium text-gray-600">
                    {rowName}
                  </div>

                  {/* celdas por día */}
                  {orderedDays.map((ymd) => (
                    <div key={`${ymd}-${sec.key}-${rowName}`} className="p-2">
                      <EditableCell
                        dayYmd={ymd}
                        turn={sec.key}
                        row={rowName}
                        placeholder="Escribir…"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {query && (
        <div className="text-xs text-gray-500">
          Buscando “{query}” en la semana…
        </div>
      )}
    </div>
  );
}
