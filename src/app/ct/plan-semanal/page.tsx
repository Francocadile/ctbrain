// src/app/ct/plan-semanal/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  getSessionsWeek,
  createSession,
  deleteSession,
  updateSession,
  getMonday,
  toYYYYMMDDUTC,
  type SessionDTO,
} from "@/lib/api/sessions";
import {
  type DayFlag,
  type TurnKey,
  type PaneKey,
  type MicroKey,
  cellMarker,
  cellKey,
  isCellOf,
  isDayFlag,
  isMicrocycle,
  dayFlagMarker,
  microMarker,
  parseDayFlagTitle,
  buildDayFlagTitle,
  parseMicroTitle,
} from "@/lib/planner-contract";
import PlannerActionsBar from "./PlannerActionsBar";
import VideoPlayerModal from "@/components/training/VideoPlayerModal";
import TurnEditor from "./components/TurnEditor";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-gray-500">Cargando…</div>}>
      <PlanSemanalInner />
    </Suspense>
  );
}

/* =========================================================
   Tipos y filas
========================================================= */
const CONTENT_ROWS = ["PRE ENTREN0", "FÍSICO", "TÉCNICO–TÁCTICO", "COMPENSATORIO"] as const;
const SESSION_NAME_ROW = "NOMBRE SESIÓN";
const META_ROWS = [
  SESSION_NAME_ROW,
  "TIPO",
  "INTENSIDAD",
  "LUGAR",
  "HORA",
  "VIDEO",
  "RIVAL",
] as const;

/* =========================================================
   Utils
========================================================= */
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
  base.setUTCHours(turn === "morning" ? 9 : 15, 0, 0, 0);
  return base.toISOString();
}
/* =========================================================
   Página
========================================================= */
function PlanSemanalInner() {
  const qs = useSearchParams();
  const router = useRouter();
  const hideHeader = qs.get("hideHeader") === "1";

  // Pestañas
  const initialTurn = (qs.get("turn") === "afternoon" ? "afternoon" : "morning") as TurnKey;
  const initialPane: PaneKey = (qs.get("pane") === "tools" ? "tools" : "editor") as PaneKey;
  const [activeTurn, setActiveTurn] = useState<TurnKey>(initialTurn);
  const [activePane, setActivePane] = useState<PaneKey>(initialPane);

  useEffect(() => {
    const p = new URLSearchParams(qs.toString());
    p.set("turn", activeTurn);
    if (activePane === "tools") p.set("pane", "tools");
    else p.delete("pane");
    router.replace(`?${p.toString()}`);
  }, [activeTurn, activePane]); // eslint-disable-line

  // Estado semana
  const [base, setBase] = useState<Date>(() => getMonday(new Date()));
  const [loading, setLoading] = useState(false);
  const [daysMap, setDaysMap] = useState<Record<string, SessionDTO[]>>({});
  const [weekStart, setWeekStart] = useState<string>("");
  const [weekEnd, setWeekEnd] = useState<string>("");
  const [videoPreview, setVideoPreview] = useState<{
    title: string;
    zone?: string | null;
    videoUrl?: string | null;
  } | null>(null);

  // Preferencias de usuario (labels + places)
  const [rowLabels, setRowLabels] = useState<Record<string, string>>({});
  const [places, setPlaces] = useState<string[]>([]);

  async function loadPrefs() {
    try {
      const r = await fetch("/api/planner/labels", { cache: "no-store" });
      const j = await r.json();
      setRowLabels(j.rowLabels || {});
      setPlaces(j.places || []);
    } catch {
      setRowLabels({});
      setPlaces([]);
    }
  }

  useEffect(() => {
    loadPrefs();
    const onUpd = () => loadPrefs();
    window.addEventListener("planner-row-labels-updated", onUpd as any);
    window.addEventListener("planner-places-updated", onUpd as any);
    return () => {
      window.removeEventListener("planner-row-labels-updated", onUpd as any);
      window.removeEventListener("planner-places-updated", onUpd as any);
    };
  }, []);

  // Carga de semana
  async function loadWeek(d: Date) {
    setLoading(true);
    try {
      const monday = getMonday(d);
      const startYYYYMMDD = toYYYYMMDDUTC(monday);
      const res = await getSessionsWeek({ start: startYYYYMMDD });
      setDaysMap(res.days);
      setWeekStart(res.weekStart);
      setWeekEnd(res.weekEnd);
      setPending({});
    } catch (e) {
      console.error(e);
      alert("No se pudo cargar la semana.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadWeek(base);
  }, [base]); // eslint-disable-line

  // Navegación semana
  function confirmDiscardIfNeeded(action: () => void) {
    if (Object.keys(pending).length === 0) return action();
    const ok = confirm("Tenés cambios sin guardar. ¿Descartarlos?");
    if (ok) action();
  }
  const goPrevWeek = () => confirmDiscardIfNeeded(() => setBase((d) => addDaysUTC(d, -7)));
  const goNextWeek = () => confirmDiscardIfNeeded(() => setBase((d) => addDaysUTC(d, 7)));
  const goTodayWeek = () => confirmDiscardIfNeeded(() => setBase(getMonday(new Date())));

  const orderedDays = useMemo(() => {
    if (!weekStart) return [];
    const start = new Date(`${weekStart}T00:00:00.000Z`);
    return Array.from({ length: 7 }).map((_, i) => toYYYYMMDDUTC(addDaysUTC(start, i)));
  }, [weekStart]);

  const label = (id: string) => rowLabels[id] || id;

  // Helpers sesiones
  const listFor = (dayYmd: string) => daysMap[dayYmd] || [];
  function findCell(dayYmd: string, turn: TurnKey, row: string) {
    return listFor(dayYmd).find((s) => isCellOf(s, turn, row));
  }
  function findDayFlagSession(dayYmd: string, turn: TurnKey) {
    return listFor(dayYmd).find((s) => isDayFlag(s, turn));
  }
  function getDayFlag(dayYmd: string, turn: TurnKey): DayFlag {
    const s = findDayFlagSession(dayYmd, turn);
    return parseDayFlagTitle(s?.title ?? "");
  }
  async function setDayFlag(dayYmd: string, turn: TurnKey, df: DayFlag) {
    const existing = findDayFlagSession(dayYmd, turn);
    const iso = computeISOForSlot(dayYmd, turn);
    const desc = `${dayFlagMarker(turn)} | ${dayYmd}`;
    const title = buildDayFlagTitle(df);
    try {
      if (df.kind === "NONE") {
        if (existing) await deleteSession(existing.id);
        await loadWeek(base);
        return;
      }
      if (!existing) await createSession({ title, description: desc, date: iso, type: "GENERAL" });
      else await updateSession(existing.id, { title, description: desc, date: iso });
      await loadWeek(base);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "No se pudo actualizar el estado del día");
    }
  }

  // MICROCICLO helpers
  function findMicroSession(dayYmd: string, turn: TurnKey) {
    return listFor(dayYmd).find((s) => isMicrocycle(s, turn));
  }
  function getMicroValue(dayYmd: string, turn: TurnKey): MicroKey {
    const s = findMicroSession(dayYmd, turn);
    return parseMicroTitle(s?.title);
  }
  async function setMicroValue(dayYmd: string, turn: TurnKey, value: MicroKey) {
    const existing = findMicroSession(dayYmd, turn);
    const iso = computeISOForSlot(dayYmd, turn);
    const desc = `${microMarker(turn)} | ${dayYmd}`;
    const title = value || "";
    try {
      if (!value) {
        if (existing) {
          await deleteSession(existing.id);
          setDaysMap((prev) => {
            const prevDay = prev[dayYmd] || [];
            return {
              ...prev,
              [dayYmd]: prevDay.filter((s) => s.id !== existing.id),
            };
          });
        }
        return;
      }
      if (!existing) {
        const { data: created } = await createSession({ title, description: desc, date: iso, type: "GENERAL" });
        setDaysMap((prev) => {
          const prevDay = prev[dayYmd] || [];
          return {
            ...prev,
            [dayYmd]: [...prevDay, created],
          };
        });
      } else {
        const { data: updated } = await updateSession(existing.id, { title, description: desc, date: iso });
        setDaysMap((prev) => {
          const prevDay = prev[dayYmd] || [];
          return {
            ...prev,
            [dayYmd]: prevDay.map((s) => (s.id === existing.id ? updated : s)),
          };
        });
      }
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "No se pudo actualizar la intensidad");
    }
  }

  // Staging & guardado
  const [pending, setPending] = useState<Record<string, string>>({});
  const [savingAll, setSavingAll] = useState(false);

  function stageCell(dayYmd: string, turn: TurnKey, row: string, text: string) {
    const k = cellKey(dayYmd, turn, row);
    setPending((prev) => {
      const next = { ...prev };
      const existing = findCell(dayYmd, turn, row);
      const currentValue = existing?.title?.trim() ?? "";
      if ((text || "").trim() === currentValue) delete next[k];
      else next[k] = text;
      return next;
    });
  }

  async function saveAll() {
    const entries = Object.entries(pending);
    if (entries.length === 0) return;
    setSavingAll(true);
    let errorMessage: string | null = null;
    try {
      for (const [k, value] of entries) {
        const [dayYmd, turn, row] = k.split("::") as [string, TurnKey, string];
        const existing = findCell(dayYmd, turn, row);
        const iso = computeISOForSlot(dayYmd, turn);
        const marker = cellMarker(turn, row);
        const text = (value ?? "").trim();

        if (!text) {
          if (existing) await deleteSession(existing.id);
          continue;
        }
        if (!existing) {
          await createSession({ title: text, description: `${marker} | ${dayYmd}`, date: iso, type: "GENERAL" });
        } else {
          await updateSession(existing.id, {
            title: text,
            description: existing.description?.startsWith(marker) ? existing.description : `${marker} | ${dayYmd}`,
            date: iso,
          });
        }
      }
      await loadWeek(base);
    } catch (e: any) {
      console.error(e);
      errorMessage = e?.message || "Error al guardar cambios";
    } finally {
      setSavingAll(false);
      if (!errorMessage) {
        // feedback inline mínimo
        // eslint-disable-next-line no-alert
        alert("Cambios guardados");
      } else {
        // eslint-disable-next-line no-alert
        alert(errorMessage);
      }
    }
  }

  const pendingCount = Object.keys(pending).length;

  return (
    <div className="p-3 md:p-4 space-y-3">
      <style jsx>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          display: block;
        }
      `}</style>
      <style jsx global>{`
        @page { size: A4 landscape; margin: 8mm; }

        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

          /* ocultar todo excepto print-root */
          body * { visibility: hidden !important; }
          #print-root, #print-root * { visibility: visible !important; }

          /* posicionar y escalar para que ENTRE */
          #print-root {
            position: absolute;
            inset: 0;
            margin: 0;
            padding: 0;
            transform: scale(0.88);
            transform-origin: top left;
            width: 114%;
          }

          /* compactar metas sólo en print */
          #print-root .h-8 { height: 1.5rem !important; }
          #print-root .text-xs { font-size: 11px !important; }

          /* ocultar UI no imprimible si aparece dentro del root */
          nav, aside, header[role="banner"], .sidebar, .app-sidebar, .print\\:hidden, .no-print {
            display: none !important;
          }

          /* evitar que links agreguen URLs */
          a[href]:after { content: ""; }
        }
      `}</style>

      {!hideHeader && (
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between no-print">
          <div>
            <h1 className="text-lg md:text-xl font-bold">Plan semanal — Editor en tabla</h1>
            <p className="text-xs md:text-sm text-gray-500">
              Semana {weekStart || "—"} → {weekEnd || "—"} (Lun→Dom)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => confirmDiscardIfNeeded(() => setBase((d) => addDaysUTC(d, -7)))} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">◀ Semana anterior</button>
            <button onClick={() => confirmDiscardIfNeeded(() => setBase(getMonday(new Date())))} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">Hoy</button>
            <button onClick={() => confirmDiscardIfNeeded(() => setBase((d) => addDaysUTC(d, 7)))} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">Semana siguiente ▶</button>
            <div className="w-px h-6 bg-gray-200 mx-1" />
            <button
              onClick={saveAll}
              disabled={pendingCount === 0 || savingAll}
              className={`px-3 py-1.5 rounded-xl text-xs ${pendingCount === 0 || savingAll ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"}`}
              title={pendingCount ? `${pendingCount} cambio(s) por guardar` : "Sin cambios"}
            >
              {savingAll ? "Guardando..." : `Guardar cambios${pendingCount ? ` (${pendingCount})` : ""}`}
            </button>
          </div>
        </header>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 no-print">
        <button className={`px-3 py-1.5 rounded-xl border text-xs ${activePane === "editor" && activeTurn === "morning" ? "bg-black text-white" : "hover:bg-gray-50"}`} onClick={() => { setActivePane("editor"); setActiveTurn("morning"); }}>Mañana</button>
        <button className={`px-3 py-1.5 rounded-xl border text-xs ${activePane === "editor" && activeTurn === "afternoon" ? "bg-black text-white" : "hover:bg-gray-50"}`} onClick={() => { setActivePane("editor"); setActiveTurn("afternoon"); }}>Tarde</button>
        <button className={`px-3 py-1.5 rounded-xl border text-xs ${activePane === "tools" ? "bg-black text-white" : "hover:bg-gray-50"}`} onClick={() => setActivePane("tools")} title="Herramientas" aria-label="Herramientas">⚙️</button>
      </div>

      <div id="print-root">
      {/* Contenido */}
      {activePane === "tools" ? (
        <div className="rounded-2xl border bg-white shadow-sm p-3">
          <PlannerActionsBar onAfterChange={() => { loadWeek(base); loadPrefs(); }} />
        </div>
      ) : loading ? (
        <div className="text-gray-500">Cargando semana…</div>
      ) : (
        <div className="w-full overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <div className="inline-block min-w-[900px] md:min-w-full">
            <TurnEditor
              turn={activeTurn}
              orderedDays={orderedDays}
              weekStart={weekStart}
              contentRows={CONTENT_ROWS}
              metaRows={META_ROWS}
              sessionNameRowId={SESSION_NAME_ROW}
              labelForRow={label}
              getDayFlag={getDayFlag}
              getMicroValue={getMicroValue}
              setDayFlag={setDayFlag}
              setMicroValue={setMicroValue}
              findCell={findCell}
              stageCell={stageCell}
              pending={pending}
              humanDayUTC={humanDayUTC}
              places={places}
              setVideoPreview={setVideoPreview}
            />
          </div>
        </div>
      )}
      </div>

      <VideoPlayerModal
        open={!!videoPreview}
        onClose={() => setVideoPreview(null)}
        title={videoPreview?.title ?? ""}
        zone={videoPreview?.zone ?? null}
        videoUrl={videoPreview?.videoUrl ?? null}
      />

      {/* DATALIST GLOBAL */}
      <datalist id="places-datalist">
        {(places || []).map((p) => (<option key={p} value={p} />))}
      </datalist>
    </div>
  );
}
