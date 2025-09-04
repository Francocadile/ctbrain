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
import HelpTip from "@/components/HelpTip";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-gray-500">Cargando…</div>}>
      <PlanSemanalInner />
    </Suspense>
  );
}

type TurnKey = "morning" | "afternoon";
type PaneKey = "editor" | "tools";

const CONTENT_ROWS = ["PRE ENTREN0", "FÍSICO", "TÉCNICO–TÁCTICO", "COMPENSATORIO"] as const;
const SESSION_NAME_ROW = "NOMBRE SESIÓN";
const META_ROWS = ["LUGAR", "HORA", "VIDEO", SESSION_NAME_ROW] as const;

type DayFlagKind = "NONE" | "PARTIDO" | "LIBRE";
type DayFlag = { kind: DayFlagKind; rival?: string; logoUrl?: string };

const DAYFLAG_TAG = "DAYFLAG";
function dayFlagMarker(turn: TurnKey) {
  return `[${DAYFLAG_TAG}:${turn}]`;
}
function isDayFlag(s: SessionDTO, turn: TurnKey) {
  return typeof s.description === "string" && s.description.startsWith(dayFlagMarker(turn));
}
function parseDayFlagTitle(title: string | null | undefined): DayFlag {
  const t = (title || "").trim();
  if (!t) return { kind: "NONE" };
  const [kind, rival, logoUrl] = t.split("|").map((x) => (x || "").trim());
  if (kind === "PARTIDO") return { kind: "PARTIDO", rival: rival || "", logoUrl: logoUrl || "" };
  if (kind === "LIBRE") return { kind: "LIBRE" };
  return { kind: "NONE" };
}
function buildDayFlagTitle(df: DayFlag): string {
  if (df.kind === "PARTIDO") return `PARTIDO|${df.rival ?? ""}|${df.logoUrl ?? ""}`;
  if (df.kind === "LIBRE") return "LIBRE";
  return "";
}

/* ========= MD± (intensidad/jornada) ========= */
type MdCode = "NONE" | "MD" | "DESCANSO" | "MD+1" | "MD+2" | "MD-4" | "MD-3" | "MD-2" | "MD-1";
type MdPlan = { code: Exclude<MdCode, "NONE">; desc: string; color: string };

const MD_TAG = "MDPLAN";
const mdMarker = (turn: TurnKey) => `[${MD_TAG}:${turn}]`;
const isMdPlan = (s: SessionDTO, turn: TurnKey) =>
  typeof s.description === "string" && s.description.startsWith(mdMarker(turn));
const buildMdTitle = (code: Exclude<MdCode, "NONE">) => code;
function parseMdTitle(title?: string | null): MdCode {
  const t = (title || "").trim();
  if (!t) return "NONE";
  const valid = ["MD", "DESCANSO", "MD+1", "MD+2", "MD-4", "MD-3", "MD-2", "MD-1"] as const;
  return (valid as readonly string[]).includes(t as any) ? (t as MdCode) : "NONE";
}

const MD_OPTIONS: MdPlan[] = [
  {
    code: "MD+1",
    desc: "Día post-partido: recup titulares / compensatorio suplentes. Intensidad muy baja.",
    color: "bg-sky-100 text-sky-900 border-sky-200",
  },
  {
    code: "MD+2",
    desc: "Reintro carga general, fuerza y volumen medio. Intensidad media.",
    color: "bg-yellow-100 text-yellow-900 border-yellow-200",
  },
  {
    code: "MD-4",
    desc: "Pico de carga: físico muy intenso y técnico–táctico exigente. Intensidad muy alta.",
    color: "bg-red-100 text-red-900 border-red-200",
  },
  {
    code: "MD-3",
    desc: "Orientación táctica específica y transiciones. Intensidad alta.",
    color: "bg-orange-100 text-orange-900 border-orange-200",
  },
  {
    code: "MD-2",
    desc: "Sesión estratégica, plan de partido y balón parado. Intensidad media-baja.",
    color: "bg-green-100 text-green-900 border-green-200",
  },
  {
    code: "MD-1",
    desc: "Activación previa, corta y ligera. Confianza y repaso final. Intensidad muy baja.",
    color: "bg-gray-100 text-gray-800 border-gray-200",
  },
  {
    code: "MD",
    desc: "Match day – día de partido. Intensidad competitiva.",
    color: "bg-amber-100 text-amber-900 border-amber-200",
  },
  {
    code: "DESCANSO",
    desc: "Día libre / descanso. Sin carga.",
    color: "bg-gray-100 text-gray-800 border-gray-200",
  },
];

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

function PlanSemanalInner() {
  const qs = useSearchParams();
  const router = useRouter();
  const hideHeader = qs.get("hideHeader") === "1";

  // Pestañas
  const initialTurn = (qs.get("turn") === "afternoon" ? "afternoon" : "morning") as TurnKey;
  the const initialPane: PaneKey = qs.get("pane") === "tools" ? "tools" : "editor";
  const [activeTurn, setActiveTurn] = useState<TurnKey>(initialTurn);
  const [activePane, setActivePane] = useState<PaneKey>(initialPane);

  useEffect(() => {
    const p = new URLSearchParams(qs.toString());
    p.set("turn", activeTurn);
    if (activePane === "tools") p.set("pane", "tools");
    else p.delete("pane");
    router.replace(`?${p.toString()}`);
  }, [activeTurn, activePane]); // eslint-disable-line react-hooks/exhaustive-deps

  // Estado semana
  const [base, setBase] = useState<Date>(() => getMonday(new Date()));
  const [loading, setLoading] = useState(false);
  const [daysMap, setDaysMap] = useState<Record<string, SessionDTO[]>>({});
  const [weekStart, setWeekStart] = useState<string>("");
  const [weekEnd, setWeekEnd] = useState<string>("");

  // Preferencias (labels + lugares)
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
  }, [base]); // eslint-disable-line react-hooks/exhaustive-deps

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
  function findCell(dayYmd: string, turn: TurnKey, row: string): SessionDTO | undefined {
    const list = daysMap[dayYmd] || [];
    return list.find((s) => isCellOf(s, turn, row));
  }
  function findDayFlagSession(dayYmd: string, turn: TurnKey): SessionDTO | undefined {
    const list = daysMap[dayYmd] || [];
    return list.find((s) => isDayFlag(s, turn));
  }
  function getDayFlag(dayYmd: string, turn: TurnKey): DayFlag {
    const s = findDayFlagSession(dayYmd, turn);
    return parseDayFlagTitle(s?.title ?? "");
  }
  async function setDayFlag(dayYmd: string, turn: TurnKey, df: DayFlag) {
    const existing = findDayFlagSession(dayYmd, turn);
    const iso = computeISOForSlot(dayYmd, turn);
    const marker = dayFlagMarker(turn);
    const desc = `${marker} | ${dayYmd}`;
    const title = buildDayFlagTitle(df);
    try {
      if (df.kind === "NONE") {
        if (existing) await deleteSession(existing.id);
        await loadWeek(base);
        return;
      }
      if (!existing) {
        await createSession({ title, description: desc, date: iso, type: "GENERAL" });
      } else {
        await updateSession(existing.id, { title, description: desc, date: iso });
      }

      // ajuste de MD según tipo
      if (df.kind === "PARTIDO") await setMd(dayYmd, turn, "MD");
      if (df.kind === "LIBRE") await setMd(dayYmd, turn, "DESCANSO");

      await loadWeek(base);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "No se pudo actualizar el estado del día");
    }
  }

  // ---- MD± helpers
  function findMdSession(dayYmd: string, turn: TurnKey) {
    const list = daysMap[dayYmd] || [];
    return list.find((s) => isMdPlan(s, turn));
  }
  function getMd(dayYmd: string, turn: TurnKey): MdCode {
    const s = findMdSession(dayYmd, turn);
    return parseMdTitle(s?.title);
  }
  async function setMd(dayYmd: string, turn: TurnKey, code: MdCode) {
    const existing = findMdSession(dayYmd, turn);
    const iso = computeISOForSlot(dayYmd, turn);
    const desc = `${mdMarker(turn)} | ${dayYmd}`;
    try {
      if (code === "NONE") {
        if (existing) await deleteSession(existing.id);
        await loadWeek(base);
        return;
      }
      const title = buildMdTitle(code as Exclude<MdCode, "NONE">);
      if (!existing) {
        await createSession({ title, description: desc, date: iso, type: "GENERAL" });
      } else {
        await updateSession(existing.id, { title, description: desc, date: iso });
      }
      await loadWeek(base);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "No se pudo actualizar MD±");
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
          await createSession({
            title: text,
            description: `${marker} | ${dayYmd}`,
            date: iso,
            type: "GENERAL",
          });
        } else {
          await updateSession(existing.id, {
            title: text,
            description: existing.description?.startsWith(marker)
              ? existing.description
              : `${marker} | ${dayYmd}`,
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
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
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
      useEffect(() => {
        setLocalLabel(parsed.label);
        setLocalUrl(parsed.url);
      }, [k, value]); // eslint-disable-line

      if (!isEditing) {
        return (
          <div className="flex items-center justify-between gap-1">
            {parsed.url ? (
              <a
                href={parsed.url}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] underline text-emerald-700 truncate"
                title={parsed.label || "Video"}
              >
                {parsed.label || "Video"}
              </a>
            ) : (
              <span className="text-[12px] text-gray-500 truncate">{parsed.label}</span>
            )}
            <div className="flex items-center gap-1">
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
                onClick={() => stageCell(dayYmd, turn, row, "")}
                title="Borrar"
              >
                ❌
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="flex items-center gap-1.5">
          <input
            className="h-8 w-[45%] rounded-md border px-2 text-xs"
            placeholder="Título"
            value={localLabel}
            onChange={(e) => setLocalLabel(e.target.value)}
          />
          <input
            type="url"
            className="h-8 w-[55%] rounded-md border px-2 text-xs"
            placeholder="https://…"
            value={localUrl}
            onChange={(e) => setLocalUrl(e.target.value)}
          />
          <button
            type="button"
            className="h-8 px-2 rounded border text-[11px] hover:bg-gray-50"
            onClick={() => {
              stageCell(dayYmd, turn, row, joinVideoValue(localLabel, localUrl));
              setIsEditing(false);
            }}
            title="Listo"
          >
            ✓
          </button>
        </div>
      );
    }

    return null;
  }

  // ---- Celdas de contenido
  function EditableCell({
    dayYmd,
    turn,
    row,
  }: {
    dayYmd: string;
    turn: TurnKey;
    row: string;
  }) {
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
            <a
              href={sessionHref}
              className="text-[11px] rounded-lg border px-2 py-0.5 hover:bg-gray-50"
              title="Editar ejercicio"
            >
              Editar ejercicio
            </a>
          ) : null}
        </div>

        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          className={`min-h-[90px] w-full rounded-xl border p-2 text-[13px] leading-5 outline-none focus:ring-2 ${
            staged !== undefined ? "border-emerald-400 ring-emerald-200" : "focus:ring-emerald-400"
          } whitespace-pre-wrap`}
          data-placeholder="Escribir…"
          dangerouslySetInnerHTML={{ __html: (initialText || "").replace(/\n/g, "<br/>") }}
        />
      </div>
    );
  }

  // ---- Tipo de día
  function DayStatusCell({ ymd, turn }: { ymd: string; turn: TurnKey }) {
    const df = getDayFlag(ymd, turn);
    const [kind, setKind] = useState<DayFlagKind>(df.kind);
    const [rival, setRival] = useState(df.rival || "");
    const [logo, setLogo] = useState(df.logoUrl || "");

    useEffect(() => {
      const fresh = getDayFlag(ymd, turn);
      setKind(fresh.kind);
      setRival(fresh.rival || "");
      setLogo(fresh.logoUrl || "");
    }, [weekStart, ymd, turn]); // eslint-disable-line

    const save = (next: DayFlag) => setDayFlag(ymd, turn, next);

    return (
      <div className="p-1">
        <div className="flex items-center gap-1">
          <select
            className="h-7 w-[110px] rounded-md border px-1.5 text-[11px]"
            value={kind}
            onChange={async (e) => {
              const k = e.target.value as DayFlagKind;
              setKind(k);
              if (k === "NONE") await save({ kind: "NONE" });
              if (k === "LIBRE") await save({ kind: "LIBRE" });
              if (k === "PARTIDO") await save({ kind: "PARTIDO", rival, logoUrl: logo });
              // setMd automático según tipo (también se hace dentro de save)
            }}
          >
            <option value="NONE">Normal</option>
            <option value="PARTIDO">Partido</option>
            <option value="LIBRE">Libre</option>
          </select>

          {kind === "PARTIDO" && (
            <>
              <input
                className="h-7 flex-1 rounded-md border px-2 text-[11px]"
                placeholder="Rival"
                value={rival}
                onChange={(e) => setRival(e.target.value)}
                onBlur={() => save({ kind: "PARTIDO", rival, logoUrl: logo })}
              />
              <input
                className="h-7 w-[120px] rounded-md border px-2 text-[11px]"
                placeholder="Logo URL"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                onBlur={() => save({ kind: "PARTIDO", rival, logoUrl: logo })}
              />
            </>
          )}
        </div>
      </div>
    );
  }

  function DayStatusRow({ turn }: { turn: TurnKey }) {
    return (
      <div
        className="grid items-center border-b bg-gray-50/60"
        style={{ gridTemplateColumns: `120px repeat(7, minmax(120px, 1fr))` }}
      >
        <div className="px-2 py-1.5 text-[11px] font-medium text-gray-600">Tipo</div>
        {orderedDays.map((ymd) => (
          <DayStatusCell key={`${ymd}-${turn}-status`} ymd={ymd} turn={turn} />
        ))}
      </div>
    );
  }

  /* ======= Fila: MD (intensidad) ======= */
  function MdStatusCell({ ymd, turn }: { ymd: string; turn: TurnKey }) {
    const current = getMd(ymd, turn);
    const [code, setCode] = useState<MdCode>(current);

    useEffect(() => {
      setCode(getMd(ymd, turn));
    }, [weekStart, ymd, turn]); // eslint-disable-line

    const selected = MD_OPTIONS.find((o) => o.code === code);

    return (
      <div className="p-1">
        <div className="flex items-center gap-1.5">
          <select
            className="h-7 w-[120px] rounded-md border px-1.5 text-[11px]"
            value={code}
            onChange={(e) => {
              const c = e.target.value as MdCode;
              setCode(c);
              setMd(ymd, turn, c);
            }}
          >
            <option value="NONE">—</option>
            {MD_OPTIONS.map((o) => (
              <option key={o.code} value={o.code}>
                {o.code}
              </option>
            ))}
          </select>

          {selected ? (
            <>
              <span className={`text-[10px] rounded border px-2 py-0.5 ${selected.color}`}>
                {selected.code}
              </span>
              <HelpTip text={selected.desc} />
            </>
          ) : null}
        </div>
      </div>
    );
  }

  function MdStatusRow({ turn }: { turn: TurnKey }) {
    const help =
      "MD+1: recuperación / compensatorio (muy baja) · MD+2: fuerza y volumen medio (media) · MD-4: pico de carga (muy alta) · MD-3: táctica específica (alta) · MD-2: plan de partido/BP (media-baja) · MD-1: activación corta (muy baja) · MD: día de partido · DESCANSO: libre/sin carga.";
    return (
      <div
        className="grid items-center border-b bg-gray-50/60"
        style={{ gridTemplateColumns: `120px repeat(7, minmax(120px, 1fr))` }}
      >
        <div className="px-2 py-1.5 text-[11px] font-medium text-gray-600 flex items-center gap-1">
          MD (intensidad) <HelpTip text={help} />
        </div>
        {orderedDays.map((ymd) => (
          <MdStatusCell key={`${ymd}-${turn}-md`} ymd={ymd} turn={turn} />
        ))}
      </div>
    );
  }

  function TurnEditor({ turn }: { turn: TurnKey }) {
    return (
      <>
        <div
          className="grid text-xs"
          style={{ gridTemplateColumns: `120px repeat(7, minmax(120px, 1fr))` }}
        >
          <div className="bg-gray-50 border-b px-2 py-1.5 font-semibold text-gray-600"></div>
          {orderedDays.map((ymd) => (
            <div key={`${turn}-${ymd}`} className="bg-gray-50 border-b px-2 py-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide">
                {humanDayUTC(ymd)}
              </div>
              <div className="text-[10px] text-gray-400">{ymd}</div>
            </div>
          ))}
        </div>

        <DayStatusRow turn={turn} />
        <MdStatusRow turn={turn} /> {/* ← debajo de Tipo */}

        <div className="border-t">
          <div className="bg-emerald-50 text-emerald-900 font-semibold px-2 py-1 border-b uppercase tracking-wide text-[12px]">
            {turn === "morning" ? "TURNO MAÑANA · Meta" : "TURNO TARDE · Meta"}
          </div>
          {META_ROWS.map((rowName) => (
            <div
              key={`${turn}-meta-${rowName}`}
              className="grid items-center"
              style={{ gridTemplateColumns: `120px repeat(7, minmax(120px, 1fr))` }}
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
        </div>

        <div className="border-t">
          <div className="bg-emerald-100/70 text-emerald-900 font-semibold px-2 py-1 border-b uppercase tracking-wide text-[12px]">
            {turn === "morning" ? "TURNO MAÑANA" : "TURNO TARDE"}
          </div>
          {CONTENT_ROWS.map((rowName) => (
            <div
              key={`${turn}-${rowName}`}
              className="grid items-stretch"
              style={{ gridTemplateColumns: `120px repeat(7, minmax(120px, 1fr))` }}
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
            <h1 className="text-lg md:text-xl font-bold flex items-center gap-2">
              Plan semanal — Editor en tabla
            </h1>
            <p className="text-xs md:text-sm text-gray-500">
              Semana {weekStart || "—"} → {weekEnd || "—"} (Lun→Dom)
            </p>
            <p className="mt-1 text-[10px] text-gray-400">
              Tip: <kbd className="rounded border px-1">Ctrl</kbd>/<kbd className="rounded border px-1">⌘</kbd>{" "}
              + <kbd className="rounded border px-1">Enter</kbd> marca una celda sin guardar aún.
            </p>
          </div>

          {activePane === "editor" ? (
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
              <div className="w-px h-6 bg-gray-200 mx-1" />
              <button
                onClick={saveAll}
                disabled={pendingCount === 0 || savingAll}
                className={`px-3 py-1.5 rounded-xl text-xs ${
                  pendingCount === 0 || savingAll ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"
                }`}
                title={pendingCount ? `${pendingCount} cambio(s) por guardar` : "Sin cambios"}
              >
                {savingAll ? "Guardando..." : `Guardar cambios${pendingCount ? ` (${pendingCount})` : ""}`}
              </button>
            </div>
          ) : (
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
          )}
        </header>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          className={`px-3 py-1.5 rounded-xl border text-xs ${
            activePane === "editor" && activeTurn === "morning" ? "bg-black text-white" : "hover:bg-gray-50"
          }`}
          onClick={() => {
            setActivePane("editor");
            setActiveTurn("morning");
          }}
        >
          Mañana
        </button>
        <button
          className={`px-3 py-1.5 rounded-xl border text-xs ${
            activePane === "editor" && activeTurn === "afternoon" ? "bg-black text-white" : "hover:bg-gray-50"
          }`}
          onClick={() => {
            setActivePane("editor");
            setActiveTurn("afternoon");
          }}
        >
          Tarde
        </button>
        <button
          className={`px-3 py-1.5 rounded-xl border text-xs ${
            activePane === "tools" ? "bg-black text-white" : "hover:bg-gray-50"
          }`}
          onClick={() => setActivePane("tools")}
          title="Herramientas"
          aria-label="Herramientas"
        >
          ⚙️
        </button>
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

      {/* DATALIST GLOBAL (sirve para Mañana y Tarde) */}
      <datalist id="places-datalist">
        {(places || []).map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
    </div>
  );
}
