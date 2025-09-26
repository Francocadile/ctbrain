// src/lib/metrics/wellness.ts

/** Tipado mínimo compatible con tu UI */
export type WellnessRaw = {
  userId?: string;
  userName?: string;
  user?: { name?: string | null; email?: string | null } | null;

  date?: string; // YYYY-MM-DD
  sleepQuality?: number;   // 1..5
  sleepHours?: number | null;
  fatigue?: number;        // 1..5
  muscleSoreness?: number; // 1..5
  stress?: number;         // 1..5
  mood?: number;           // 1..5
  comment?: string | null;

  total?: number | null;   // opcional (precalculado)
};

/** Utiles de fecha */
export function toYMD(d: Date) { return d.toISOString().slice(0, 10); }
export function fromYMD(s: string) {
  const [y, m, dd] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, dd || 1);
}
export function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
export function yesterday(base = new Date()) {
  return toYMD(addDays(base, -1));
}

/** Estadística simple */
export function mean(nums: number[]): number {
  const v = nums.filter((x) => Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}
export function sdSample(nums: number[]): number {
  const v = nums.filter((x) => Number.isFinite(x));
  const n = v.length;
  if (n <= 1) return 0;
  const m = mean(v);
  const varS = v.reduce((acc, x) => acc + (x - m) ** 2, 0) / (n - 1);
  return Math.sqrt(varS);
}

/**
 * computeSDW: “score” simple de wellness para graficar/alertar.
 * Escala 1–5 en 5 dimensiones (fatigue, soreness, stress, mood, sleepQuality).
 * Devuelve promedio (1..5) centrado en 3 y escalado a z ~ [-2..+2] aproximado.
 */
export function computeSDW(row: WellnessRaw): number {
  const vals = [
    Number(row.fatigue ?? 0),
    Number(row.muscleSoreness ?? 0),
    Number(row.stress ?? 0),
    Number(row.mood ?? 0),
    Number(row.sleepQuality ?? 0),
  ].filter((x) => x > 0);

  if (!vals.length) return 0;

  const avg = mean(vals); // 1..5
  // z-score aproximado usando media 3 y sd=1 como referencia práctica
  const z = (avg - 3) / 1;
  // para tu UI, devolvemos un número con 2 decimales
  return Number(z.toFixed(2));
}

/** Coloreo rápido por z-score (negativo=mejor, positivo=alerta) */
export function zToColor(z: number): string {
  if (!Number.isFinite(z)) return "#9ca3af"; // gray-400
  if (z >= 1.0) return "#ef4444";   // red-500
  if (z >= 0.5) return "#f59e0b";   // amber-500
  if (z <= -0.5) return "#10b981";  // emerald-500
  return "#6b7280";                 // gray-500 neutro
}

/**
 * applyOverrides: reglas simples de alerta (MVP).
 * Devuelve un objeto con flags que tu UI puede usar.
 */
export function applyOverrides(row: WellnessRaw) {
  const stress = Number(row.stress ?? 0);
  const soreness = Number(row.muscleSoreness ?? 0);
  const fatigue = Number(row.fatigue ?? 0);
  const mood = Number(row.mood ?? 0);
  const sleepQ = Number(row.sleepQuality ?? 0);
  const flags: { alert: boolean; reasons: string[] } = { alert: false, reasons: [] };

  if (stress >= 4) { flags.alert = true; flags.reasons.push("Estrés alto"); }
  if (soreness >= 4) { flags.alert = true; flags.reasons.push("Dolor muscular alto"); }
  if (fatigue >= 4) { flags.alert = true; flags.reasons.push("Fatiga alta"); }
  if (mood > 0 && mood <= 2) { flags.alert = true; flags.reasons.push("Ánimo bajo"); }
  if (sleepQ > 0 && sleepQ <= 2) { flags.alert = true; flags.reasons.push("Sueño pobre"); }

  return flags;
}
