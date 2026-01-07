// src/lib/planner-daytype.ts
// DayType definitions for planner (shared between UI and API)

export type DayTypeId = string;

export type DayTypeDef = {
  id: DayTypeId;
  label: string;
  /** CSS color value (HEX #RRGGBB preferred) */
  color: string;
};

// Tailwind-ish soft colors expressed as HEX
export const DEFAULT_DAY_TYPES: DayTypeDef[] = [
  { id: "ESTRUCTURA", label: "Estructura", color: "#f0f9ff" }, // sky-50
  { id: "FUERZA", label: "Fuerza", color: "#fef2f2" }, // red-50
  { id: "VELOCIDAD", label: "Velocidad", color: "#fffbeb" }, // amber-50
  { id: "RECUPERACION", label: "Recuperación", color: "#ecfdf3" }, // emerald-50
  { id: "PARTIDO", label: "Partido", color: "#f5f3ff" }, // violet-50
];

export const DEFAULT_DAY_TYPE_IDS: DayTypeId[] = DEFAULT_DAY_TYPES.map((t) => t.id);

const TAILWIND_BG_TO_HEX: Record<string, string> = {
  "bg-sky-50": "#f0f9ff",
  "bg-red-50": "#fef2f2",
  "bg-amber-50": "#fffbeb",
  "bg-emerald-50": "#ecfdf3",
  "bg-violet-50": "#f5f3ff",
  "bg-blue-50": "#eff6ff",
  "bg-yellow-50": "#fefce8",
  "bg-gray-50": "#f9fafb",
};

/**
 * Normaliza un color de DayType:
 * - Convierte antiguas clases Tailwind (bg-*) a HEX soft.
 * - Acepta #RRGGBB o RRGGBB y los normaliza a #RRGGBB mayúscula.
 * - Si está vacío devuelve el fallback.
 */
export function normalizeDayTypeColor(raw: string | null | undefined, fallback = "#f9fafb"): string {
  const v = (raw || "").trim();
  if (!v) return fallback;
  if (TAILWIND_BG_TO_HEX[v]) return TAILWIND_BG_TO_HEX[v];

  const m = /^#?([0-9A-Fa-f]{6})$/.exec(v);
  if (m) {
    const hex = m[1].toUpperCase();
    return `#${hex}`;
  }

  // Valor libre: se devuelve tal cual (el backend puede validarlo si hace falta)
  return v;
}

/** Devuelve color de texto (negro/blanco) con contraste razonable para un fondo dado. */
export function getDayTypeTextColor(bg: string): string {
  const m = /^#?([0-9A-Fa-f]{6})$/.exec((bg || "").trim());
  if (!m) return "#111827"; // gray-900
  const hex = m[1];
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.7 ? "#111827" : "#ffffff";
}
