// Shared constants and types for CT weekly planner

export type TurnKey = "morning" | "afternoon";
export type PaneKey = "editor" | "tools";

// Layout constants (keep in sync with planner page expectations)
export const COL_LABEL_W = 120;
export const DAY_MIN_W = 120;

// Content/meta rows
export const CONTENT_ROWS = [
  "PRE ENTREN0",
  "FÍSICO",
  "TÉCNICO–TÁCTICO",
  "COMPENSATORIO",
] as const;

export const SESSION_NAME_ROW = "NOMBRE SESIÓN";

export const META_ROWS = [SESSION_NAME_ROW, "LUGAR", "HORA", "VIDEO"] as const;
