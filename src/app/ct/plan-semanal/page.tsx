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
import { listPlaces, addPlace as apiAddPlace, replacePlaces } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-gray-500">Cargando…</div>}>
      <PlanSemanalInner />
    </Suspense>
  );
}

type TurnKey = "morning" | "afternoon";
const CONTENT_ROWS = ["PRE ENTREN0", "FÍSICO", "TÉCNICO–TÁCTICO", "COMPENSATORIO"] as const;
const META_ROWS = ["LUGAR", "HORA", "VIDEO"] as const;

// ---------- TAGS ----------
type DayFlagKind = "NONE" | "PARTIDO" | "LIBRE";
type DayFlag = { kind: DayFlagKind; rival?: string; logoUrl?: string };

const DAYFLAG_TAG = "DAYFLAG";   // description: [DAYFLAG:<turn>] | YYYY-MM-DD  -> title = "PARTIDO|rival|logo" | "LIBRE" | ""
const DAYNAME_TAG = "DAYNAME";   // description: [DAYNAME:<turn>] | YYYY-MM-DD  -> title = "<nombre de sesión>"

function marker(tag: string, turn: TurnKey) { return `[${tag}:${turn}]`; }
function isTag(s: SessionDTO, tag: string, turn: TurnKey) {
  return typeof s.description === "string" && s.description.startsWith(marker(tag, turn));
}
function isDayFlag(s: SessionDTO, turn: TurnKey) { return isTag(s, DAYFLAG_TAG, turn); }
function isDayName(s: SessionDTO, turn: TurnKey) { return isTag(s, DAYNAME_TAG, turn); }

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
function cellMarker(turn: TurnKey, row: string) { return `[GRID:${turn}:${row}]`; }
function isCellOf(s: SessionDTO, turn: TurnKey, row: string) {
  return typeof s.description === "string" && s.description.startsWith(cellMarker(turn, row));
}
function parseVideoValue(v: string | null | undefined): { label: string; url: string } {
  const raw = (v || "").trim(); if (!raw) return { label: "", url: "" };
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

// ---------- helpers de semana para un día arbitrario ----------
function mondayOfYMD(ymd: string) {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  return getMonday(d);
}

function PlanSemanalInner() {
  const qs = useSearchParams();
  const router = useRouter();
  const hideHeader = qs.get("hideHeader") === "1";

  const initialTurn = (qs.get("turn") === "afternoon" ? "afternoon" : "morning") as TurnKey;
  const [activeTurn, setActiveTurn] = useState<TurnKey>(initialTurn);
  useEffect(() => {
    const p = new URLSearchParams(qs.toString());
    p.set("turn", activeTurn);
    router.replace(`?${p.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTurn]);

  const [base, setBase] = useState<Date>(() => getMonday(new Date()));
  const [loading, setLoading] = useState(false);
  const [daysMap, setDaysMap] = useState<Record<string, SessionDTO[]>>({});
  const [weekStart, setWeekStart] = useState<string>("");
  const [weekEnd, setWeekEnd] = useState<string>("");

  // Lugares
  const [places, setPlaces] = useState<string[]>([]);
  useEffect(() => { (async () => setPlaces(await listPlaces()))(); }, []);

  // Cambios pendientes (GRID/META)
  const [pending, setPending] = useState<Record<string, string>>({});
  const [videoEditing, setVideoEditing] = useState<Record<string, boolean>>({});
  const [savingAll, setSavingAll] = useState(false);

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
      setVideoEditing({});
    } catch (e) {
      console.error(e);
      alert("No se pudo cargar la semana.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadWeek(base); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [base]);

  function confirmDiscardIfNeeded(action: () => void) {
    if (Object.keys(pending).length === 0) return action();
    const ok = confirm("Tenés cambios sin guardar. ¿Descartarlos?");
    if (ok) action();
  }
  const goPrevWeek  = () => confirmDiscardIfNeeded(() => setBase((d) => addDaysUTC(d, -7)));
  const goNextWeek  = () => confirmDiscardIfNeeded(() => setBase((d) => addDaysUTC(d, +7)));
  const goTodayWeek = () => confirmDiscardIfNeeded(() => setBase(getMonday(new Date())));

  const orderedDays = useMemo(() => {
    if (!weekStart) return [];
    const start = new Date(`${weekStart}T00:00:00.000Z`);
    return Array.from({ length: 7 }).map((_, i) => toYYYYMMDDUTC(addDaysUTC(start, i)));
  }, [weekStart]);

  // ------- helpers búsqueda -------
  function findCell(dayYmd: string, turn: TurnKey, row: string): SessionDTO | undefined {
    const list = daysMap[dayYmd] || [];
    return list.find((s) => isCellOf(s, turn, row));
  }
  function findDayFlagSession(dayYmd: string, turn: TurnKey): SessionDTO | undefined {
    const list = daysMap[dayYmd] || [];
    return list.find((s) => isDayFlag(s, turn));
  }
  function findDayNameSession(dayYmd: string, turn: TurnKey): SessionDTO | undefined {
    const list = daysMap[dayYmd] || [];
    return list.find((s) => isDayName(s, turn));
  }

  function getDayFlag(dayYmd: string, turn: TurnKey): DayFlag {
    const s = findDayFlagSession(dayYmd, turn);
    return parseDayFlagTitle(s?.title ?? "");
  }
  function getDayName(dayYmd: string, turn: TurnKey): string {
    const s = findDayNameSession(dayYmd, turn);
    return (s?.title || "").trim();
  }

  // ---------- refresh de UN día (sin tocar pending) ----------
  async function refreshOneDay(ymd: string) {
    try {
      const monday = mondayOfYMD(ymd);
      const res = await getSessionsWeek({ start: toYYYYMMDDUTC(monday) });
      const fresh = res.days?.[ymd] || [];
      setDaysMap((prev) => ({ ...prev, [ymd]: fresh }));
    } catch (e) {
      console.error("No se pudo refrescar el día:", ymd, e);
    }
  }

  // 🟢 OPTIMISTA para FLAG: actualiza daysMap antes de la IO
  function upsertDayFlagLocal(ymd: string, turn: TurnKey, df: DayFlag, server?: SessionDTO | null) {
    setDaysMap((prev) => {
      const list = [...(prev[ymd] || [])];
      const idx = list.findIndex((s) => isDayFlag(s, turn));
      if (df.kind === "NONE") {
        if (idx >= 0) list.splice(idx, 1);
      } else {
        const title = buildDayFlagTitle(df);
        const desc  = `${marker(DAYFLAG_TAG, turn)} | ${ymd}`;
        const base: SessionDTO = server ?? {
          id: `local-${ymd}-${turn}-flag`,
          title,
          description: desc,
          date: computeISOForSlot(ymd, turn),
          type: "GENERAL",
        };
        const updated: SessionDTO = { ...base, title, description: desc };
        if (idx >= 0) list[idx] = updated; else list.push(updated);
      }
      return { ...prev, [ymd]: list };
    });
  }

  async function setDayFlag(ymd: string, turn: TurnKey, df: DayFlag) {
    // 🔸 Optimista inmediato (evita “reset” del select, incluso en Domingo)
    upsertDayFlagLocal(ymd, turn, df);

    const existing = findDayFlagSession(ymd, turn);
    const iso = computeISOForSlot(ymd, turn);
    const desc = `${marker(DAYFLAG_TAG, turn)} | ${ymd}`;
    const title = buildDayFlagTitle(df);

    try {
      if (df.kind === "NONE") {
        if (existing) await deleteSession(existing.id);
        await refreshOneDay(ymd);
        return;
      }
      if (!existing) {
        const res = await createSession({ title, description: desc, date: iso, type: "GENERAL" });
        upsertDayFlagLocal(ymd, turn, df, res.data);
      } else {
        const res = await updateSession(existing.id, { title, description: desc, date: iso });
        upsertDayFlagLocal(ymd, turn, df, res.data);
      }
      await refreshOneDay(ymd);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "No se pudo guardar el Tipo del día");
      // 🔸 Revertir a lo que diga el servidor
      await refreshOneDay(ymd);
    }
  }

  // 🟢 OPTIMISTA para NOMBRE de sesión
  function upsertDayNameLocal(ymd: string, turn: TurnKey, name: string, server?: SessionDTO | null) {
    setDaysMap((prev) => {
      const list = [...(prev[ymd] || [])];
      const idx = list.findIndex((s) => isDayName(s, turn));
      const title = (name || "").trim();
      const desc  = `${marker(DAYNAME_TAG, turn)} | ${ymd}`;
      if (!title) {
        if (idx >= 0) list.splice(idx, 1);
      } else {
        const base: SessionDTO = server ?? {
          id: `local-${ymd}-${turn}-name`,
          title,
          description: desc,
          date: computeISOForSlot(ymd, turn),
          type: "GENERAL",
        };
        const updated: SessionDTO = { ...base, title, description: desc };
        if (idx >= 0) list[idx] = updated; else list.push(updated);
      }
      return { ...prev, [ymd]: list };
    });
  }

  async function setDayName(dayYmd: string, turn: TurnKey, name: string) {
    // 🔸 optimista
    upsertDayNameLocal(dayYmd, turn, name);

    const existing = findDayNameSession(dayYmd, turn);
    const iso = computeISOForSlot(dayYmd, turn);
    const desc = `${marker(DAYNAME_TAG, turn)} | ${dayYmd}`;
    const title = (name || "").trim();

    try {
      if (!title) {
        if (existing) await deleteSession(existing.id);
        await refreshOneDay(dayYmd);
        return;
      }

      if (!existing) {
        const res = await createSession({ title, description: desc, date: iso, type: "GENERAL" });
        upsertDayNameLocal(dayYmd, turn, title, res.data);
      } else {
        const res = await updateSession(existing.id, { title, description: desc, date: iso });
        upsertDayNameLocal(dayYmd, turn, title, res.data);
      }
      await refreshOneDay(dayYmd);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "No se pudo guardar el Nombre de sesión");
      await refreshOneDay(dayYmd);
    }
  }

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
        const m = cellMarker(turn, row);
        const text = (value ?? "").trim();

        if (!text) {
          if (existing) {
            await deleteSession(existing.id);
            setDaysMap((prev) => {
              const list = [...(prev[dayYmd] || [])].filter((s) => !isCellOf(s, turn, row));
              return { ...prev, [dayYmd]: list };
            });
          }
          await refreshOneDay(dayYmd);
          continue;
        }

        if (!existing) {
          const res = await createSession({ title: text, description: `${m} | ${dayYmd}`, date: iso, type: "GENERAL" });
          setDaysMap((prev) => {
            const list = [...(prev[dayYmd] || []), res.data];
            return { ...prev, [dayYmd]: list };
          });
        } else {
          const res = await updateSession(existing.id, {
            title: text,
            description: existing.description?.startsWith(m) ? existing.description : `${m} | ${dayYmd}`,
            date: iso,
          });
          setDaysMap((prev) => {
            const list = [...(prev[dayYmd] || [])];
            const idx = list.findIndex((s) => s.id === existing.id);
            if (idx >= 0) list[idx] = res.data;
            return { ...prev, [dayYmd]: list };
          });
        }
        await refreshOneDay(dayYmd);
      }
      setPending({});
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Error al guardar cambios");
    } finally {
      setSavingAll(false);
    }
  }

  function discardAll() {
    if (Object.keys(pending).length === 0) return;
    const ok = confirm("¿Descartar todos los cambios sin guardar?");
    if (!ok) return;
    setPending({});
    setVideoEditing({});
    loadWeek(base);
  }

  // ===== Lugares (gestión) =====
  function managePlaces() {
    (async () => {
      const edited = prompt(
        "Gestionar lugares (una línea por lugar). Borrá líneas para eliminar, editá para renombrar:",
        places.join("\n")
      );
      if (edited === null) return;
      const list = edited.split("\n").map((s) => s.trim()).filter(Boolean);
      const unique = await replacePlaces(list);
      setPlaces(unique);
    })();
  }

  // =======================
  // MetaInput (LUGAR/HORA/VIDEO)
  // =======================
  function MetaInput({ dayYmd, turn, row }: { dayYmd: string; turn: TurnKey; row: (typeof META_ROWS)[number]; }) {
    const existing = findCell(dayYmd, turn, row);
    const original = (existing?.title ?? "").trim();
    const k = cellKey(dayYmd, turn, row);
    const pendingValue = pending[k];
    const value = pendingValue !== undefined ? pendingValue : original;

    if (row === "LUGAR") {
      const [localPlaces, setLocalPlaces] = useState<string[]>(places);
      useEffect(() => setLocalPlaces(places), [places]);

      const addPlace = () => {
        (async () => {
          const n = prompt("Nuevo lugar:");
          if (!n) return;
          const updated = await apiAddPlace(n);
          setLocalPlaces(updated);
          setPlaces(updated);
          stageCell(dayYmd, turn, row, n.trim());
        })();
      };

      return (
        <div className="flex gap-1">
          <select
            className="h-8 w-full rounded-md border px-2 text-xs"
            value={value || ""}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__add__") return addPlace();
              if (v === "__manage__") return managePlaces();
              stageCell(dayYmd, turn, row, v);
            }}
          >
            <option value="">— Lugar —</option>
            {localPlaces.map((l) => <option key={l} value={l}>{l}</option>)}
            <option value="__add__">➕ Agregar…</option>
            <option value="__manage__">⚙️ Gestionar…</option>
          </select>
        </div>
      );
    }

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

    const parsed = parseVideoValue(value || "");
    const isEditing = !!videoEditing[k];
    const [localLabel, setLocalLabel] = useState(parsed.label);
    const [localUrl, setLocalUrl] = useState(parsed.url);

    useEffect(() => {
      setLocalLabel(parsed.label);
      setLocalUrl(parsed.url);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [k, isEditing]);

    if (!isEditing && (parsed.label || parsed.url)) {
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
            <button type="button" className="h-6 px-1.5 rounded border text-[11px] hover:bg-gray-50" onClick={() => setVideoEditing((m) => ({ ...m, [k]: true }))}>
              ✏️
            </button>
            <button type="button" className="h-6 px-1.5 rounded border text-[11px] hover:bg-gray-50" onClick={() => stageCell(dayYmd, turn, row, "")}>
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
            setVideoEditing((m) => ({ ...m, [k]: false }));
          }}
          title="Listo"
        >
          ✓
        </button>
      </div>
    );
  }

  // =======================
  // Celda de contenido GRID
  // =======================
  function EditableCell({ dayYmd, turn, row }: { dayYmd: string; turn: TurnKey; row: string; }) {
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
        <span className="text-[10px] bg-amber-100 border px-1.5 py-0.5 rounded">PARTIDO {flag.rival ? `vs ${flag.rival}` : ""}</span>
      ) : null;

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div>{flagBadge}</div>
          {sessionHref ? (
            <a href={sessionHref} className="text-[11px] rounded-lg border px-2 py-0.5 hover:bg-gray-50" title="Editar ejercicio">
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

  // =======================
  // Tipo de día (Normal/Partido/Libre) — OPTIMISTA + refresh de día
  // =======================
  function DayFlagCell({ ymd, turn }: { ymd: string; turn: TurnKey }) {
    const df = getDayFlag(ymd, turn);

    const [localKind, setLocalKind] = useState<DayFlagKind>(df.kind);
    const [rival, setRival] = useState(df.rival || "");
    const [logo, setLogo]   = useState(df.logoUrl || "");
    const [saving, setSaving] = useState(false);

    // Si cambia lo que viene de server para ESTE ymd/turn, sincronizamos
    useEffect(() => {
      setLocalKind(df.kind);
      setRival(df.rival || "");
      setLogo(df.logoUrl || "");
      // solo reacciona cuando llega algo distinto desde server
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ymd, turn, df.kind, df.rival, df.logoUrl]);

    const commit = async (next: DayFlag) => {
      setSaving(true);
      try {
        await setDayFlag(ymd, turn, next);
      } finally {
        setSaving(false);
      }
    };

    const onChangeKind = (k: DayFlagKind) => {
      setLocalKind(k); // mantiene el select estable inmediatamente
      if (k === "NONE") return commit({ kind: "NONE" });
      if (k === "LIBRE") return commit({ kind: "LIBRE" });
      return commit({ kind: "PARTIDO", rival, logoUrl: logo });
    };

    return (
      <div className="p-1">
        <div className="flex items-center gap-1">
          <select
            className="h-7 w-[110px] rounded-md border px-1.5 text-[11px]"
            value={localKind}
            onChange={(e) => onChangeKind(e.target.value as DayFlagKind)}
            disabled={saving}
          >
            <option value="NONE">Normal</option>
            <option value="PARTIDO">Partido</option>
            <option value="LIBRE">Libre</option>
          </select>

          {localKind === "PARTIDO" && (
            <>
              <input
                className="h-7 flex-1 rounded-md border px-2 text-[11px]"
                placeholder="Rival"
                value={rival}
                onChange={(e) => setRival(e.target.value)}
                onBlur={() => commit({ kind: "PARTIDO", rival, logoUrl: logo })}
                disabled={saving}
              />
              <input
                className="h-7 w-[120px] rounded-md border px-2 text-[11px]"
                placeholder="Logo URL"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                onBlur={() => commit({ kind: "PARTIDO", rival, logoUrl: logo })}
                disabled={saving}
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
          <DayFlagCell key={`${ymd}-${turn}-flag`} ymd={ymd} turn={turn} />
        ))}
      </div>
    );
  }

  // =======================
  // Nombre de sesión (solo guarda en blur/Enter) — OPTIMISTA + refresh día
  // =======================
  function DayNameCell({ ymd, turn }: { ymd: string; turn: TurnKey }) {
    const initial = getDayName(ymd, turn);
    const [text, setText] = useState(initial);
    const [saving, setSaving] = useState(false);

    useEffect(() => { setText(initial); }, [initial, ymd, turn]);

    const commit = async () => {
      setSaving(true);
      try {
        await setDayName(ymd, turn, text);
      } finally {
        setSaving(false);
      }
    };
    const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
      if (e.key === "Enter") { e.preventDefault(); (e.currentTarget as HTMLInputElement).blur(); }
    };

    return (
      <div className="p-1">
        <input
          className="h-8 w-full rounded-md border px-2 text-xs"
          placeholder="Nombre de sesión (ej. Sesión 1 TM)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          disabled={saving}
        />
      </div>
    );
  }
  function DayNameRow({ turn }: { turn: TurnKey }) {
    return (
      <div
        className="grid items-center border-b"
        style={{ gridTemplateColumns: `120px repeat(7, minmax(120px, 1fr))` }}
      >
        <div className="bg-gray-50/60 border-r px-2 py-1.5 text-[11px] font-medium text-gray-600">Nombre sesión</div>
        {orderedDays.map((ymd) => <DayNameCell key={`${ymd}-${turn}-name`} ymd={ymd} turn={turn} />)}
      </div>
    );
  }

  const pendingCount = Object.keys(pending).length;

  function TurnEditor({ turn }: { turn: TurnKey }) {
    return (
      <>
        {/* Cabecera días */}
        <div className="grid text-xs" style={{ gridTemplateColumns: `120px repeat(7, minmax(120px, 1fr))` }}>
          <div className="bg-gray-50 border-b px-2 py-1.5 font-semibold text-gray-600"></div>
          {orderedDays.map((ymd) => (
            <div key={`${turn}-${ymd}`} className="bg-gray-50 border-b px-2 py-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide">{humanDayUTC(ymd)}</div>
              <div className="text-[10px] text-gray-400">{ymd}</div>
            </div>
          ))}
        </div>

        {/* Tipo del día */}
        <DayStatusRow turn={turn} />

        {/* Nombre de sesión */}
        <DayNameRow turn={turn} />

        {/* META */}
        <div className="border-t">
          <div className="bg-emerald-50 text-emerald-900 font-semibold px-2 py-1 border-b uppercase tracking-wide text-[12px]">
            {turn === "morning" ? "TURNO MAÑANA · Meta" : "TURNO TARDE · Meta"}
          </div>
          {META_ROWS.map((rowName) => (
            <div key={`${turn}-meta-${rowName}`} className="grid items-center" style={{ gridTemplateColumns: `120px repeat(7, minmax(120px, 1fr))` }}>
              <div className="bg-gray-50/60 border-r px-2 py-1.5 text-[11px] font-medium text-gray-600">{rowName}</div>
              {orderedDays.map((ymd) => (
                <div key={`${ymd}-${turn}-${rowName}`} className="p-1">
                  <MetaInput dayYmd={ymd} turn={turn} row={rowName} />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* BLOQUES */}
        <div className="border-t">
          <div className="bg-emerald-100/70 text-emerald-900 font-semibold px-2 py-1 border-b uppercase tracking-wide text-[12px]">
            {turn === "morning" ? "TURNO MAÑANA" : "TURNO TARDE"}
          </div>
          {CONTENT_ROWS.map((rowName) => (
            <div key={`${turn}-${rowName}`} className="grid items-stretch" style={{ gridTemplateColumns: `120px repeat(7, minmax(120px, 1fr))` }}>
              <div className="bg-gray-50/60 border-r px-2 py-2 text-[11px] font-medium text-gray-600 whitespace-pre-line">{rowName}</div>
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

  return (
    <div className="p-3 md:p-4 space-y-3">
      <style jsx>{`[contenteditable][data-placeholder]:empty:before{content:attr(data-placeholder);color:#9ca3af;pointer-events:none;display:block;}`}</style>

      {!hideHeader && (
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-bold">Plan semanal — Editor en tabla</h1>
            <p className="text-xs md:text-sm text-gray-500">
              Semana {weekStart || "—"} → {weekEnd || "—"} (Lun→Dom)
            </p>
            <p className="mt-1 text-[10px] text-gray-400">
              Tip: <kbd className="rounded border px-1">Ctrl</kbd>/<kbd className="rounded border px-1">⌘</kbd> + <kbd className="rounded border px-1">Enter</kbd> marca una celda sin guardar aún.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={goPrevWeek} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">◀ Semana anterior</button>
            <button onClick={goTodayWeek} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">Hoy</button>
            <button onClick={goNextWeek} className="px-2.5 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">Semana siguiente ▶</button>
            <div className="w-px h-6 bg-gray-200 mx-1" />
            <button
              onClick={() => {
                if (typeof document !== "undefined") (document.activeElement as HTMLElement | null)?.blur?.();
                setTimeout(saveAll, 0);
              }}
              disabled={pendingCount === 0 || savingAll}
              className={`px-3 py-1.5 rounded-xl text-xs ${pendingCount === 0 || savingAll ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"}`}
              title={pendingCount ? `${pendingCount} cambio(s) por guardar` : "Sin cambios"}
            >
              {savingAll ? "Guardando..." : `Guardar cambios${pendingCount ? ` (${pendingCount})` : ""}`}
            </button>
            <button onClick={discardAll} disabled={pendingCount === 0 || savingAll} className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">
              Descartar
            </button>
          </div>
        </header>
      )}

      {/* Pestañas turno */}
      <div className="flex items-center gap-2">
        <button className={`px-3 py-1.5 rounded-xl border text-xs ${activeTurn === "morning" ? "bg-black text-white" : "hover:bg-gray-50"}`} onClick={() => setActiveTurn("morning")}>Mañana</button>
        <button className={`px-3 py-1.5 rounded-xl border text-xs ${activeTurn === "afternoon" ? "bg-black text-white" : "hover:bg-gray-50"}`} onClick={() => setActiveTurn("afternoon")}>Tarde</button>
      </div>

      {loading ? (
        <div className="text-gray-500">Cargando semana…</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <TurnEditor turn={activeTurn} />
        </div>
      )}
    </div>
  );
}
