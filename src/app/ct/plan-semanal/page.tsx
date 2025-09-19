// src/app/ct/plan-semanal/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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
import PlannerActionsBar from "./PlannerActionsBar";
import PlannerMatchLink from "@/components/PlannerMatchLink"; // 👈 NUEVO

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-gray-500">Cargando…</div>}>
      <PlanSemanalInner />
    </Suspense>
  );
}

/* =========================================================
   Constantes de layout (tamaños coherentes con dashboard)
========================================================= */
const COL_LABEL_W = 120;
const DAY_MIN_W = 120;

/* =========================================================
   Tipos y filas
========================================================= */
type TurnKey = "morning" | "afternoon";
type PaneKey = "editor" | "tools";

const CONTENT_ROWS = ["PRE ENTREN0", "FÍSICO", "TÉCNICO–TÁCTICO", "COMPENSATORIO"] as const;
const SESSION_NAME_ROW = "NOMBRE SESIÓN";
const META_ROWS = [SESSION_NAME_ROW, "LUGAR", "HORA", "VIDEO"] as const;

/* ===== Estado del día (tipo) ===== */
type DayFlagKind = "NONE" | "PARTIDO" | "LIBRE";
type DayFlag = { kind: DayFlagKind; rival?: string; logoUrl?: string };
const DAYFLAG_TAG = "DAYFLAG";
const dayFlagMarker = (turn: TurnKey) => `[${DAYFLAG_TAG}:${turn}]`;
const isDayFlag = (s: SessionDTO, turn: TurnKey) =>
  typeof s.description === "string" && s.description.startsWith(dayFlagMarker(turn));
function parseDayFlagTitle(title?: string | null): DayFlag {
  const t = (title || "").trim();
  if (!t) return { kind: "NONE" };
  const [kind, rival, logoUrl] = t.split("|").map((x) => (x || "").trim());
  if (kind === "PARTIDO") return { kind: "PARTIDO", rival, logoUrl };
  if (kind === "LIBRE") return { kind: "LIBRE" };
  return { kind: "NONE" };
}
function buildDayFlagTitle(df: DayFlag): string {
  if (df.kind === "PARTIDO") return `PARTIDO|${df.rival ?? ""}|${df.logoUrl ?? ""}`;
  if (df.kind === "LIBRE") return "LIBRE";
  return "";
}

/* ===== MICROCICLO (intensidad) ===== */
type MicroKey = "" | "MD+1" | "MD+2" | "MD-4" | "MD-3" | "MD-2" | "MD-1" | "MD" | "DESCANSO";
const MICRO_TAG = "MICRO";
const MICRO_CHOICES: Array<{ value: MicroKey; colorClass: string }> = [
  { value: "",        colorClass: "" },
  { value: "MD+1",    colorClass: "bg-blue-50" },
  { value: "MD+2",    colorClass: "bg-yellow-50" },
  { value: "MD-4",    colorClass: "bg-red-50" },
  { value: "MD-3",    colorClass: "bg-orange-50" },
  { value: "MD-2",    colorClass: "bg-green-50" },
  { value: "MD-1",    colorClass: "bg-gray-50" },
  { value: "MD",      colorClass: "bg-amber-50" },
  { value: "DESCANSO",colorClass: "bg-gray-100" },
];
const microMarker = (turn: TurnKey) => `[${MICRO_TAG}:${turn}]`;
const isMicrocycle = (s: SessionDTO, turn: TurnKey) =>
  typeof s.description === "string" && s.description.startsWith(microMarker(turn));
function parseMicroTitle(title?: string | null): MicroKey {
  const t = (title || "").trim();
  if (!t) return "";
  return (MICRO_CHOICES.find((c) => c.value === t)?.value || "") as MicroKey;
}

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
function cellMarker(turn: TurnKey, row: string) {
  return `[GRID:${turn}:${row}]`;
}
function isCellOf(s: SessionDTO, turn: TurnKey, row: string) {
  return typeof s.description === "string" && s.description.startsWith(cellMarker(turn, row));
}
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
  if (!l && u) return u;
  return `${l}|${u}`;
}
function cellKey(dayYmd: string, turn: TurnKey, row: string) {
  return `${dayYmd}::${turn}::${row}`;
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

  // Preferencias de usuario (labels + places)
  const [rowLabels, setRowLabels] = useState<Record<string, string>>({});
  const [places, setPlaces] = useState<string[]>([]);

  async function loadPrefs() {
    try {
      const r = await fetch("/api/planner/labels", { cache: "no-store" });
      if (!r.ok) throw new Error("fail");
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
        if (existing) await deleteSession(existing.id);
        await loadWeek(base);
        return;
      }
      if (!existing) await createSession({ title, description: desc, date: iso, type: "GENERAL" });
      else await updateSession(existing.id, { title, description: desc, date: iso });
      await loadWeek(base);
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
      alert(e?.message || "Error al guardar cambios");
    } finally {
      setSavingAll(false);
    }
  }

  /* ============================
     Componentes de celdas
  ============================ */

  // ---- Inputs META
  function MetaInput({
    dayYmd,
    turn,
    row,
  }: {
    dayYmd: string;
    turn: TurnKey;
    row: (typeof META_ROWS)[number];
  }) {
    const existing = findCell(dayYmd, turn, row);
    const original = (existing?.title ?? "").trim();
    const k = cellKey(dayYmd, turn, row);
    const value = pending[k] !== undefined ? pending[k] : original;

    // NOMBRE SESIÓN
    if (row === SESSION_NAME_ROW) {
      const [local, setLocal] = useState(value || "");
      useEffect(() => setLocal(value || ""), [value, k]);
      const commit = () => {
        const v = (local || "").trim();
        if (v !== (original || "")) stageCell(dayYmd, turn, row, v);
      };
      return (
        <input
          className="h-8 w-full rounded-md border px-2 text-xs"
          placeholder="Nombre de sesión (ej: Sesión 7 TM)"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        />
      );
    }

    // LUGAR
    if (row === "LUGAR") {
      const [local, setLocal] = useState(value || "");
      useEffect(() => setLocal(value || ""), [value, k]);
      return (
        <input
          list="places-datalist"
          className="h-8 w-full rounded-md border px-2 text-xs"
          placeholder="Lugar (texto libre o sugerencias)"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => stageCell(dayYmd, turn, row, (local || "").trim())}
        />
      );
    }

    // HORA
    if (row === "HORA") {
      const hhmm = /^[0-9]{2}:[0-9]{2}$/.test(value || "") ? value : "";
      return (
        <input
          type="time"
          className="h-8 w-full rounded-md border px-2 text-xs"
          value={hhmm}
          onChange={(e) => stageCell(dayYmd, turn, row, e.target.value)}
        />
      );
    }

    // VIDEO
    if (row === "VIDEO") {
      const parsed = parseVideoValue(value || "");
      const [isEditing, setIsEditing] = useState(!(parsed.label || parsed.url));
      const [localLabel, setLocalLabel] = useState(parsed.label);
      const [localUrl, setLocalUrl] = useState(parsed.url);
      useEffect(() => { setLocalLabel(parsed.label); setLocalUrl(parsed.url); }, [k, value]);

      if (!isEditing) {
        return (
          <div className="flex items-center justify-between gap-1">
            {parsed.url ? (
              <a href={parsed.url} target="_blank" rel="noreferrer" className="text-[12px] underline text-emerald-700 truncate" title={parsed.label || "Video"}>
                {parsed.label || "Video"}
              </a>
            ) : (
              <span className="text-[12px] text-gray-500 truncate">{parsed.label}</span>
            )}
            <div className="flex items-center gap-1">
              <button type="button" className="h-6 px-1.5 rounded border text-[11px] hover:bg-gray-50" onClick={() => setIsEditing(true)} title="Editar">✏️</button>
              <button type="button" className="h-6 px-1.5 rounded border text-[11px] hover:bg-gray-50" onClick={() => stageCell(dayYmd, turn, row, "")} title="Borrar">❌</button>
            </div>
          </div>
        );
      }

      return (
        <div className="flex items-center gap-1.5">
          <input className="h-8 w-[45%] rounded-md border px-2 text-xs" placeholder="Título" value={localLabel} onChange={(e) => setLocalLabel(e.target.value)} />
          <input type="url" className="h-8 w-[55%] rounded-md border px-2 text-xs" placeholder="https://…" value={localUrl} onChange={(e) => setLocalUrl(e.target.value)} />
          <button type="button" className="h-8 px-2 rounded border text-[11px] hover:bg-gray-50" onClick={() => { stageCell(dayYmd, turn, row, joinVideoValue(localLabel, localUrl)); setIsEditing(false); }} title="Listo">✓</button>
        </div>
      );
    }

    return null;
  }

  // ---- Celdas de contenido
  function EditableCell({ dayYmd, turn, row }: { dayYmd: string; turn: TurnKey; row: string }) {
    const existing = findCell(dayYmd, turn, row);
    const ref = useRef<HTMLDivElement | null>(null);
    const k = cellKey(dayYmd, turn, row);
    const staged = pending[k];
    const initialText = staged !== undefined ? staged : existing?.title ?? "";

    const onBlur = () => {
      const txt = ref.current?.innerText ?? "";
      stageCell(dayYmd, turn, row, txt);
    };
    const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        const txt = ref.current?.innerText ?? "";
        stageCell(dayYmd, turn, row, txt);
      }
    };

    const sessionHref = existing?.id ? `/ct/sessions/${existing.id}` : "";

    const flag = getDayFlag(dayYmd, turn);
    const flagBadge =
      flag.kind === "LIBRE" ? (
        <span className="text-[10px] bg-gray-100 border px-1.5 py-0.5 rounded">DÍA LIBRE</span>
      ) : flag.kind === "PARTIDO" ? (
        <span className="text-[10px] bg-amber-100 border px-1.5 py-0.5 rounded">
          PARTIDO {flag.rival ? `vs ${flag.rival}` : ""}
        </span>
      ) : null;

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div>{flagBadge}</div>
          {sessionHref ? (
            <a href={sessionHref} className="text-[11px] rounded-lg border px-2 py-0.5 hover:bg-gray-50" title="Abrir el ejercicio completo">
              Ejercicio completo
            </a>
          ) : null}
        </div>

        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          className="min-h-[90px] w-full rounded-xl border p-2 text-[13px] leading-5 outline-none focus:ring-2 focus:ring-emerald-400 whitespace-pre-wrap"
          data-placeholder="Contenidos / títulos (breves)…"
          dangerouslySetInnerHTML={{ __html: (initialText || "").replace(/\n/g, "<br/>") }}
        />
      </div>
    );
  }

  // ---- Tipo de día (fila) — sólo selector
  function DayStatusCell({ ymd, turn }: { ymd: string; turn: TurnKey }) {
    const df = getDayFlag(ymd, turn);
    const [kind, setKind] = useState<DayFlagKind>(df.kind);

    useEffect(() => {
      setKind(getDayFlag(ymd, turn).kind);
    }, [weekStart, ymd, turn]); // eslint-disable-line

    const save = (next: DayFlag) => setDayFlag(ymd, turn, next);

    return (
      <div className="p-1">
        <select
          className="h-7 w-[140px] rounded-md border px-1.5 text-[11px]"
          value={kind}
          onChange={(e) => {
            const k = e.target.value as DayFlagKind;
            setKind(k);
            if (k === "NONE") return save({ kind: "NONE" });
            if (k === "LIBRE") return save({ kind: "LIBRE" });
            if (k === "PARTIDO") return save({ kind: "PARTIDO", rival: "", logoUrl: "" });
          }}
        >
          <option value="NONE">Normal</option>
          <option value="PARTIDO">Partido (MD)</option>
          <option value="LIBRE">Descanso</option>
        </select>
      </div>
    );
  }

  function DayStatusRow({ turn }: { turn: TurnKey }) {
    return (
      <div
        className="grid items-center border-b bg-gray-50/60"
        style={{ gridTemplateColumns: `${COL_LABEL_W}px repeat(7, minmax(${DAY_MIN_W}px, 1fr))` }}
      >
        <div className="px-2 py-1.5 text-[11px] font-medium text-gray-600">Tipo</div>
        {orderedDays.map((ymd) => (
          <DayStatusCell key={`${ymd}-${turn}-status`} ymd={ymd} turn={turn} />
        ))}
      </div>
    );
  }

  // ---- Partido (Rival + Logo) — UI igual a VIDEO
  function PartidoCell({ ymd, turn }: { ymd: string; turn: TurnKey }) {
    const df = getDayFlag(ymd, turn);
    const isMatch = df.kind === "PARTIDO";

    if (!isMatch) {
      return <div className="h-6 text-[11px] text-gray-400 italic px-1 flex items-center">—</div>;
    }

    const [isEditing, setIsEditing] = useState(!(df.rival || df.logoUrl));
    const [localRival, setLocalRival] = useState(df.rival || "");
    const [localLogo, setLocalLogo] = useState(df.logoUrl || "");

    useEffect(() => {
      const fresh = getDayFlag(ymd, turn);
      setIsEditing(!(fresh.rival || fresh.logoUrl));
      setLocalRival(fresh.rival || "");
      setLocalLogo(fresh.logoUrl || "");
    }, [weekStart, ymd, turn]); // eslint-disable-line

    const commit = async () => {
      await setDayFlag(ymd, turn, {
        kind: "PARTIDO",
        rival: (localRival || "").trim(),
        logoUrl: (localLogo || "").trim(),
      });
      setIsEditing(false);
    };

    if (!isEditing) {
      return (
        <div className="flex items-center justify-between gap-1">
          <div className="h-6 text-[11px] px-1 flex items-center truncate gap-1">
            {localLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={localLogo} alt="Logo" className="w-[16px] h-[16px] object-contain rounded" />
            ) : null}
            <span className="truncate">{localRival || "—"}</span>
          </div>
          <div className="flex items-center gap-1">
            {/* 👇 Link directo al plan del rival */}
            <PlannerMatchLink
              rivalName={(localRival || df.rival || "").trim()}
              label="Plan rival"
              className="h-6 px-1.5 rounded border text-[11px] hover:bg-gray-50"
            />
            <button
              type="button"
              className="h-6 px-1.5 rounded border text-[11px] hover:bg-gray-50"
              onClick={() => setIsEditing(true)}
              title="Editar"
            >
              ✏️
            </button>
            <button
              type="button"
              className="h-6 px-1.5 rounded border text-[11px] hover:bg-gray-50"
              onClick={async () => {
                setLocalRival("");
                setLocalLogo("");
                await setDayFlag(ymd, turn, { kind: "PARTIDO", rival: "", logoUrl: "" });
              }}
              title="Borrar"
            >
              ❌
            </button>
          </div>
        </div>
      );
    }

    // Modo edición — exactamente como VIDEO: dos inputs + ✓ (mismos tamaños)
    return (
      <div className="flex items-center gap-1.5">
        <input
          className="h-8 w-[45%] rounded-md border px-2 text-xs"
          placeholder="Rival"
          value={localRival}
          onChange={(e) => setLocalRival(e.target.value)}
        />
        <input
          type="url"
          className="h-8 w-[55%] rounded-md border px-2 text-xs"
          placeholder="Logo URL"
          value={localLogo}
          onChange={(e) => setLocalLogo(e.target.value)}
        />
        <button
          type="button"
          className="h-8 px-2 rounded border text-[11px] hover:bg-gray-50"
          onClick={commit}
          title="Listo"
        >
          ✓
        </button>
      </div>
    );
  }

  function PartidoRow({ turn }: { turn: TurnKey }) {
    return (
      <div
        className="grid items-center border-b"
        style={{ gridTemplateColumns: `${COL_LABEL_W}px repeat(7, minmax(${DAY_MIN_W}px, 1fr))` }}
      >
        <div className="px-2 py-1.5 text-[11px] font-medium text-gray-600">Partido</div>
        {orderedDays.map((ymd) => (
          <div key={`${ymd}-${turn}-partido`} className="p-1">
            <PartidoCell ymd={ymd} turn={turn} />
          </div>
        ))}
      </div>
    );
  }

  // ---- Intensidad (MICRO) fila
  function MicroCell({ ymd, turn }: { ymd: string; turn: TurnKey }) {
    const [val, setVal] = useState<MicroKey>(getMicroValue(ymd, turn));
    useEffect(() => { setVal(getMicroValue(ymd, turn)); }, [weekStart, ymd, turn]); // eslint-disable-line
    const cls = MICRO_CHOICES.find((c) => c.value === val)?.colorClass || "";
    return (
      <div className={`p-1 ${cls}`}>
        <select
          className={`h-7 w-full rounded-md border px-1.5 text-[11px] ${cls}`}
          value={val}
          onChange={async (e) => {
            const nextVal = e.target.value as MicroKey;
            setVal(nextVal);
            await setMicroValue(ymd, turn, nextVal);
          }}
        >
          {MICRO_CHOICES.map((opt) => (
            <option key={opt.value || "none"} value={opt.value}>
              {opt.value || "—"}
            </option>
          ))}
        </select>
      </div>
    );
  }
  function MicroRow({ turn }: { turn: TurnKey }) {
    return (
      <div
        className="grid items-center border-b"
        style={{ gridTemplateColumns: `${COL_LABEL_W}px repeat(7, minmax(${DAY_MIN_W}px, 1fr))` }}
      >
        <div className="px-2 py-1.5 text-[11px] font-medium text-gray-600">Intensidad</div>
        {orderedDays.map((ymd) => <MicroCell key={`${ymd}-${turn}-micro`} ymd={ymd} turn={turn} />)}
      </div>
    );
  }

  function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
      <div className="bg-emerald-50 text-emerald-900 font-semibold px-2 py-1 border-b uppercase tracking-wide text-[12px]">
        {children}
      </div>
    );
  }

  function TurnEditor({ turn }: { turn: TurnKey }) {
    return (
      <>
        {/* Encabezado de días */}
        <div
          className="grid text-xs"
          style={{ gridTemplateColumns: `${COL_LABEL_W}px repeat(7, minmax(${DAY_MIN_W}px, 1fr))` }}
        >
          <div className="bg-gray-50 border-b px-2 py-1.5 font-semibold text-gray-600"></div>
          {orderedDays.map((ymd) => (
            <div key={`${turn}-${ymd}`} className="bg-gray-50 border-b px-2 py-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide">{humanDayUTC(ymd)}</div>
              <div className="text-[10px] text-gray-400">{ymd}</div>
            </div>
          ))}
        </div>

        {/* MICROCICLO */}
        <SectionLabel>MICROCICLO</SectionLabel>
        <DayStatusRow turn={turn} />
        <MicroRow turn={turn} />
        <PartidoRow turn={turn} />

        {/* DETALLES */}
        <SectionLabel>DETALLES</SectionLabel>
        {META_ROWS.map((rowName) => (
          <div
            key={`${turn}-meta-${rowName}`}
            className="grid items-center"
            style={{ gridTemplateColumns: `${COL_LABEL_W}px repeat(7, minmax(${DAY_MIN_W}px, 1fr))` }}
          >
            <div className="bg-gray-50/60 border-r px-2 py-1.5 text-[11px] font-medium text-gray-600">
              {rowName}
            </div>
            {orderedDays.map((ymd) => (
              <div key={`${ymd}-${turn}-${rowName}`} className="p-1">
                <MetaInput dayYmd={ymd} turn={turn} row={rowName} />
              </div>
            ))}
          </div>
        ))}

        {/* CONTENIDOS */}
        <div className="border-t">
          <div className="px-2 py-1 text-[10px] text-gray-600 border-b bg-gray-50">
            Escribí el <b>contenido general</b> (títulos). El detalle se edita en <b>“Ejercicio completo”</b>.
          </div>
          <div className="bg-emerald-100/70 text-emerald-900 font-semibold px-2 py-1 border-b uppercase tracking-wide text-[12px]">
            {turn === "morning" ? "TURNO MAÑANA" : "TURNO TARDE"}
          </div>
          {CONTENT_ROWS.map((rowName) => (
            <div
              key={`${turn}-${rowName}`}
              className="grid items-stretch"
              style={{ gridTemplateColumns: `${COL_LABEL_W}px repeat(7, minmax(${DAY_MIN_W}px, 1fr))` }}
            >
              <div className="bg-gray-50/60 border-r px-2 py-2 text-[11px] font-medium text-gray-600 whitespace-pre-line">
                {label(rowName)}
              </div>
              {orderedDays.map((ymd) => (
                <div key={`${ymd}-${turn}-${rowName}`} className="p-1">
                  <EditableCell dayYmd={ymd} turn={turn} row={rowName} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </>
    );
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

      {!hideHeader && (
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
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
      <div className="flex items-center gap-2">
        <button className={`px-3 py-1.5 rounded-xl border text-xs ${activePane === "editor" && activeTurn === "morning" ? "bg-black text-white" : "hover:bg-gray-50"}`} onClick={() => { setActivePane("editor"); setActiveTurn("morning"); }}>Mañana</button>
        <button className={`px-3 py-1.5 rounded-xl border text-xs ${activePane === "editor" && activeTurn === "afternoon" ? "bg-black text-white" : "hover:bg-gray-50"}`} onClick={() => { setActivePane("editor"); setActiveTurn("afternoon"); }}>Tarde</button>
        <button className={`px-3 py-1.5 rounded-xl border text-xs ${activePane === "tools" ? "bg-black text-white" : "hover:bg-gray-50"}`} onClick={() => setActivePane("tools")} title="Herramientas" aria-label="Herramientas">⚙️</button>
      </div>

      {/* Contenido */}
      {activePane === "tools" ? (
        <div className="rounded-2xl border bg-white shadow-sm p-3">
          <PlannerActionsBar onAfterChange={() => { loadWeek(base); loadPrefs(); }} />
        </div>
      ) : loading ? (
        <div className="text-gray-500">Cargando semana…</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <TurnEditor turn={activeTurn} />
        </div>
      )}

      {/* DATALIST GLOBAL */}
      <datalist id="places-datalist">
        {(places || []).map((p) => (<option key={p} value={p} />))}
      </datalist>
    </div>
  );
}
