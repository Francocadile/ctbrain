"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getSessionsWeek,
  createSession,
  deleteSession,
  updateSession,
  getMonday,
  toYYYYMMDDUTC,
  type SessionDTO,
} from "@/lib/api/sessions";

// === Lugares pre-cargados (editable luego desde admin) ===
const LUGARES = [
  "Complejo Deportivo",
  "Cancha Auxiliar 1",
  "Cancha Auxiliar 2",
  "Gimnasio",
  "Sala de Video",
];

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
function computeISOForSlot(dayYmd: string, turn: TurnKey) {
  const base = new Date(`${dayYmd}T00:00:00.000Z`);
  const h = turn === "morning" ? 9 : 15;
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

// ---- Parse/format para VIDEO "titulo|url" ----
function parseVideoValue(v: string | null | undefined): { label: string; url: string } {
  const raw = (v || "").trim();
  if (!raw) return { label: "", url: "" };
  const [label, url] = raw.split("|").map((s) => s.trim());
  if (!url && label?.startsWith("http")) return { label: "Video", url: label };
  return { label: label || "", url: url || "" };
}
function joinVideoValue(label: string, url: string) {
  const l = (label || "").trim();
  const u = (url || "").trim();
  if (!l && !u) return "";
  if (!l && u) return u; // compat
  return `${l}|${u}`;
}

export default function PlanSemanalPage() {
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
      alert(e?.message || "Error al guardar");
    }
  }

  const debouncedSave = useDebouncedCallback(saveCell, 450);

  // ==== Meta inputs (LUGAR/HORA/VIDEO) por turno ====
  function MetaInput({
    dayYmd,
    turn,
    row,
  }: {
    dayYmd: string;
    turn: TurnKey;
    row: (typeof META_ROWS)[number];
  }) {
    const current = findCell(dayYmd, turn, row);
    const value = (current?.title ?? "").trim();

    async function setImmediate(next: string) {
      await saveCell(dayYmd, turn, row, next);
    }

    if (row === "LUGAR") {
      return (
        <select
          className="h-8 w-full rounded-md border px-2 text-xs"
          value={value || ""}
          onChange={(e) => setImmediate(e.target.value)}
        >
          <option value="">— Lugar —</option>
          {LUGARES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      );
    }

    if (row === "HORA") {
      const hhmm = /^[0-9]{2}:[0-9]{2}$/.test(value) ? value : "";
      return (
        <input
          type="time"
          className="h-8 w-full rounded-md border px-2 text-xs"
          value={hhmm}
          onChange={(e) => setImmediate(e.target.value)}
        />
      );
    }

    // === VIDEO: mostrar sólo link "Sesión 1" y permitir editar con ✏️ ===
    const { label, url } = parseVideoValue(value);
    const [editing, setEditing] = useState(false);

    if (!editing && (label || url)) {
      return (
        <div className="flex items-center justify-between gap-1">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-[12px] underline text-emerald-700 truncate"
              title={label || "Video"}
            >
              {label || "Video"}
            </a>
          ) : (
            <span className="text-[12px] text-gray-500 truncate">{label}</span>
          )}
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="h-6 px-1.5 rounded border text-[11px] hover:bg-gray-50"
              onClick={() => setEditing(true)}
              title="Editar"
            >
              ✏️
            </button>
            <button
              type="button"
              className="h-6 px-1.5 rounded border text-[11px] hover:bg-gray-50"
              onClick={() => setImmediate("")}
              title="Borrar"
            >
              ❌
            </button>
          </div>
        </div>
      );
    }

    // Modo edición o vacío
    return (
      <div className="flex items-center gap-1.5">
        <input
          className="h-8 w-[45%] rounded-md border px-2 text-xs"
          placeholder="Título"
          defaultValue={label}
          onBlur={(e) => setImmediate(joinVideoValue(e.target.value, url))}
        />
        <input
          type="url"
          className="h-8 w-[55%] rounded-md border px-2 text-xs"
          placeholder="https://…"
          defaultValue={url}
          onBlur={(e) => setImmediate(joinVideoValue(label, e.target.value))}
        />
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
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          className="min-h-[90px] w-full rounded-xl border p-2 text-[13px] leading-5 outline-none focus:ring-2 focus:ring-emerald-400 whitespace-pre-wrap"
          data-placeholder="Escribir…"
          dangerouslySetInnerHTML={{ __html: titulo.replace(/\n/g, "<br/>") }}
        />
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 space-y-3">
      {/* placeholder visual para contentEditable */}
      <style jsx>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          display: block;
        }
      `}</style>

      {/* Header: solo si NO pediste ocultarlo */}
      {!hideHeader && (
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-bold">Plan semanal — Editor en tabla</h1>
            <p className="text-xs md:text-sm text-gray-500">
              Semana {weekStart || "—"} → {weekEnd || "—"} (Lun→Dom)
            </p>
            <p className="mt-1 text-[10px] text-gray-400">
              Tip: <kbd className="rounded border px-1">Ctrl</kbd>/<kbd className="rounded border px-1">⌘</kbd>{" "}
              + <kbd className="rounded border px-1">Enter</kbd> para guardar al instante.
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
                    <MetaInput dayYmd={ymd} turn="morning" row={rowName} />
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
                    <EditableCell dayYmd={ymd} turn="morning" row={rowName} />
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
                    <MetaInput dayYmd={ymd} turn="afternoon" row={rowName} />
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
                    <EditableCell dayYmd={ymd} turn="afternoon" row={rowName} />
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
