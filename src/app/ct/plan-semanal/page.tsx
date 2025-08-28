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

// === Configurable: Lugares pre-cargados (editable más adelante desde admin) ===
const LUGARES = [
  "Predio Principal",
  "Cancha Auxiliar 1",
  "Cancha Auxiliar 2",
  "Gimnasio",
  "Video-Room",
];

// Bloques
type TurnKey = "meta" | "morning" | "afternoon";
const SECTIONS: Array<{ key: TurnKey; title: string; rows: string[] }> = [
  { key: "meta", title: "", rows: ["LUGAR", "HORA", "VIDEO"] },
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
    weekday: "short",
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

  // Días Lunes→Domingo
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

  // ==== Meta inputs (LUGAR/HORA/VIDEO) ====
  function MetaInput({
    dayYmd,
    row, // "LUGAR" | "HORA" | "VIDEO"
  }: {
    dayYmd: string;
    row: "LUGAR" | "HORA" | "VIDEO";
  }) {
    const turn: TurnKey = "meta";
    const current = findCell(dayYmd, turn, row);
    const value = (current?.title ?? "").trim();

    async function setValue(next: string) {
      // Guardar directo
      await saveCell(dayYmd, turn, row, next);
    }

    if (row === "LUGAR") {
      return (
        <select
          className="h-9 w-full rounded-lg border px-2 text-sm"
          value={value || ""}
          onChange={(e) => setValue(e.target.value)}
        >
          <option value="">— Seleccionar lugar —</option>
          {LUGARES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      );
    }

    if (row === "HORA") {
      // value en formato HH:MM si existe
      const hhmm = /^[0-9]{2}:[0-9]{2}$/.test(value) ? value : "";
      return (
        <input
          type="time"
          className="h-9 w-full rounded-lg border px-2 text-sm"
          value={hhmm}
          onChange={(e) => setValue(e.target.value)}
        />
      );
    }

    // VIDEO (URL)
    return (
      <div className="flex items-center gap-2">
        <input
          type="url"
          className="h-9 flex-1 rounded-lg border px-2 text-sm"
          placeholder="https://…"
          value={value || ""}
          onChange={(e) => debouncedSave(dayYmd, turn, row, e.target.value)}
          onBlur={(e) => saveCell(dayYmd, turn, row, e.target.value)}
        />
        {value ? (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="text-xs underline text-emerald-700"
            title="Abrir video"
          >
            Abrir
          </a>
        ) : null}
      </div>
    );
  }

  // ==== Celda editable grande ====
  function EditableCell({
    dayYmd,
    turn,
    row,
  }: {
    dayYmd: string;
    turn: TurnKey;
    row: string;
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

    const titulo = current?.title ?? "";
    const sessionId = current?.id;

    return (
      <div className="space-y-1">
        {/* Encabezado con link a sesión si existe */}
        {sessionId ? (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {row} — {new Date(`${dayYmd}T00:00:00Z`).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" })}{" "}
              {turn === "morning" ? "Mañana" : turn === "afternoon" ? "Tarde" : ""}
            </span>
            <a
              href={`/ct/sesiones/${sessionId}`}
              className="text-xs rounded-lg border px-2 py-1 hover:bg-gray-50"
              title="Abrir sesión del día"
            >
              Abrir sesión
            </a>
          </div>
        ) : (
          <div className="h-4" />
        )}

        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          className="min-h-[110px] w-full rounded-xl border p-3 text-[14px] leading-5 outline-none focus:ring-2 focus:ring-emerald-400 whitespace-pre-wrap"
          data-placeholder="Escribir…"
          // mostrar valor actual
          dangerouslySetInnerHTML={{ __html: titulo.replace(/\n/g, "<br/>") }}
        />
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 space-y-4">
      {/* Placeholder CSS para contentEditable */}
      <style jsx>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          display: block;
        }
      `}</style>

      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Plan semanal — Editor en tabla</h1>
          <p className="text-xs md:text-sm text-gray-500">
            Semana {weekStart || "—"} → {weekEnd || "—"} (Lun→Dom)
          </p>
          <p className="mt-1 text-[11px] text-gray-400">
            Tip: <kbd className="rounded border px-1">Ctrl</kbd>/<kbd className="rounded border px-1">⌘</kbd>{" "}
            + <kbd className="rounded border px-1">Enter</kbd> para guardar al instante.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={goPrevWeek} className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-sm">
            ◀ Semana anterior
          </button>
          <button onClick={goTodayWeek} className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-sm">
            Hoy
          </button>
          <button onClick={goNextWeek} className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-sm">
            Semana siguiente ▶
          </button>
        </div>
      </header>

      {loading ? (
        <div className="text-gray-500">Cargando semana…</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          {/* Cabecera de días (columnas compactas para que entren) */}
          <div
            className="grid text-sm"
            style={{ gridTemplateColumns: `140px repeat(7, minmax(160px, 1fr))` }}
          >
            <div className="bg-gray-50 border-b px-2 py-1.5 font-semibold text-gray-600"></div>
            {orderedDays.map((ymd) => (
              <div key={ymd} className="bg-gray-50 border-b px-3 py-1.5">
                <div className="text-[12px] font-semibold uppercase tracking-wide">
                  {humanDay(`${ymd}T00:00:00Z`)}
                </div>
                <div className="text-[11px] text-gray-400">{ymd}</div>
              </div>
            ))}
          </div>

          {/* META compacta */}
          <div className="border-t">
            {["LUGAR", "HORA", "VIDEO"].map((rowName) => (
              <div
                key={`meta-${rowName}`}
                className="grid items-center"
                style={{ gridTemplateColumns: `140px repeat(7, minmax(160px, 1fr))` }}
              >
                <div className="bg-gray-50/60 border-r px-2 py-2 text-xs font-medium text-gray-600">
                  {rowName}
                </div>
                {orderedDays.map((ymd) => (
                  <div key={`${ymd}-meta-${rowName}`} className="p-1.5">
                    <MetaInput dayYmd={ymd} row={rowName as "LUGAR" | "HORA" | "VIDEO"} />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Secciones de celdas grandes */}
          {SECTIONS.filter((s) => s.key !== "meta").map((sec) => (
            <div key={sec.key} className="border-t">
              <div className="bg-emerald-100/70 text-emerald-900 font-semibold px-3 py-1.5 border-b uppercase tracking-wide text-sm">
                {sec.title}
              </div>

              {sec.rows.map((rowName) => (
                <div
                  key={`${sec.key}-${rowName}`}
                  className="grid items-stretch"
                  style={{ gridTemplateColumns: `140px repeat(7, minmax(160px, 1fr))` }}
                >
                  {/* etiqueta fila */}
                  <div className="bg-gray-50/60 border-r px-2 py-2 text-xs font-medium text-gray-600">
                    {rowName}
                  </div>

                  {/* celdas por día */}
                  {orderedDays.map((ymd) => (
                    <div key={`${ymd}-${sec.key}-${rowName}`} className="p-1.5">
                      <EditableCell dayYmd={ymd} turn={sec.key} row={rowName} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
