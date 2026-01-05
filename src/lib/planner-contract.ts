// src/lib/planner-contract.ts
// Contrato y helpers puros para el planner semanal (GRID / DAYFLAG / MICRO)

import type { SessionDTO } from "@/lib/api/sessions";

/* =========================================================
   Tipos compartidos
========================================================= */

export type TurnKey = "morning" | "afternoon";
export type PaneKey = "editor" | "tools";

/* ===== Estado del día (tipo) ===== */
export type DayFlagKind = "NONE" | "PARTIDO" | "LIBRE";
export type DayFlag = { kind: DayFlagKind; rivalId?: string; rival?: string; logoUrl?: string };

/* ===== MICROCICLO (intensidad) ===== */
export type MicroKey = "" | "MD+1" | "MD+2" | "MD-4" | "MD-3" | "MD-2" | "MD-1" | "MD" | "DESCANSO";

/* =========================================================
   Tags / markers
========================================================= */

export const DAYFLAG_TAG = "DAYFLAG";
export const MICRO_TAG = "MICRO";
export const GRID_TAG = "GRID";

export const dayFlagMarker = (turn: TurnKey) => `[${DAYFLAG_TAG}:${turn}]`;
export const microMarker = (turn: TurnKey) => `[${MICRO_TAG}:${turn}]`;
export const cellMarker = (turn: TurnKey, row: string) => `[${GRID_TAG}:${turn}:${row}]`;

/* =========================================================
   Predicados sobre Session.description
========================================================= */

export const isDayFlag = (s: SessionDTO, turn: TurnKey) =>
  typeof s.description === "string" && s.description.startsWith(dayFlagMarker(turn));

export const isMicrocycle = (s: SessionDTO, turn: TurnKey) =>
  typeof s.description === "string" && s.description.startsWith(microMarker(turn));

export const isCellOf = (s: SessionDTO, turn: TurnKey, row: string) =>
  typeof s.description === "string" && s.description.startsWith(cellMarker(turn, row));

/* =========================================================
   DAYFLAG helpers (PARTIDO / LIBRE / NONE)
========================================================= */

// Compat: acepta formato nuevo (PARTIDO|id|name|logo) y viejo (PARTIDO|name|logo)
export function parseDayFlagTitle(title?: string | null): DayFlag {
  const raw = (title || "").trim();
  if (!raw) return { kind: "NONE" };
  const parts = raw.split("|").map((x) => (x || "").trim());
  const kind = parts[0];
  if (kind === "PARTIDO") {
    if (parts.length >= 4) {
      const [, id, name, logo] = parts;
      return { kind: "PARTIDO", rivalId: id || undefined, rival: name || "", logoUrl: logo || "" };
    }
    if (parts.length >= 3) {
      const [, name, logo] = parts;
      return { kind: "PARTIDO", rival: name || "", logoUrl: logo || "" };
    }
    return { kind: "PARTIDO" };
  }
  if (kind === "LIBRE") return { kind: "LIBRE" };
  return { kind: "NONE" };
}

function sanitizePipes(s?: string | null) {
  const t = (s || "").trim();
  return t.replace(/\|/g, "/");
}

// Siempre guarda en formato NUEVO: PARTIDO|<id>|<name>|<logo> (vacíos si no hay)
export function buildDayFlagTitle(df: DayFlag): string {
  if (df.kind === "PARTIDO") {
    const id = (df.rivalId || "").trim();
    const name = sanitizePipes(df.rival);
    const logo = sanitizePipes(df.logoUrl);
    return `PARTIDO|${id}|${name}|${logo}`;
  }
  if (df.kind === "LIBRE") return "LIBRE";
  return "";
}

/* =========================================================
   MICRO helpers
========================================================= */

export const MICRO_CHOICES: Array<{ value: MicroKey; colorClass: string }> = [
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

export function parseMicroTitle(title?: string | null): MicroKey {
  const t = (title || "").trim();
  if (!t) return "";
  return (MICRO_CHOICES.find((c) => c.value === t)?.value || "") as MicroKey;
}

/* =========================================================
   VIDEO helpers (formato label|url)
========================================================= */

export function parseVideoValue(v: string | null | undefined): { label: string; url: string } {
  const raw = (v || "").trim();
  if (!raw) return { label: "", url: "" };
  const [label, url] = raw.split("|").map((s) => s.trim());
  if (!url && label?.startsWith("http")) return { label: "Video", url: label };
  return { label: label || "", url: url || "" };
}

export function joinVideoValue(label: string, url: string) {
  const l = (label || "").trim();
  const u = (url || "").trim();
  if (!l && !u) return "";
  if (!l && u) return u;
  return `${l}|${u}`;
}

/* =========================================================
   Otros helpers
========================================================= */

export function cellKey(dayYmd: string, turn: TurnKey, row: string) {
  return `${dayYmd}::${turn}::${row}`;
}

export function extractRivalIdFromUrl(s: string): string | undefined {
  const m = s.match(/\/ct\/rivales\/([a-z0-9]+)(?:[\/?#]|$)/i);
  return m?.[1];
}
