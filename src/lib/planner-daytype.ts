// src/lib/planner-daytype.ts
// UI-only DayType definitions for planner (no persistence / no API)

export type DayTypeId = string;

export type DayTypeDef = { 
  id: DayTypeId;
  label: string;
  color: string; // Tailwind bg-* class, e.g. bg-sky-50
};

export const DEFAULT_DAY_TYPES: DayTypeDef[] = [ 
  { id: "ESTRUCTURA",    label: "Estructura",    color: "bg-sky-50" },
  { id: "FUERZA",        label: "Fuerza",        color: "bg-red-50" },
  { id: "VELOCIDAD",     label: "Velocidad",     color: "bg-amber-50" },
  { id: "RECUPERACION",  label: "Recuperación",  color: "bg-emerald-50" },
  { id: "PARTIDO",       label: "Partido",       color: "bg-violet-50" },
];

export const DEFAULT_DAY_TYPE_IDS: DayTypeId[] = DEFAULT_DAY_TYPES.map((t) => t.id); 
