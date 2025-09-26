// src/lib/metrics/wellness.ts

/** -------- Tipos -------- */
export type WellnessRaw = {
  // Identidad
  userName?: string | null;
  user?: { name?: string | null; email?: string | null } | null;

  // Ítems (todos opcionales porque pueden faltar en la carga)
  sleepHours?: number | null;       // horas de sueño
  muscleSoreness?: number | null;   // 1..5 (1 = muy bien, 5 = muy mal) — ajustá si tu escala es otra
  stress?: number | null;           // 1..5
  fatigue?: number | null;          // 1..5
  mood?: number | null;             // 1..5

  // Otros
  comment?: string | null;
};

/** -------- Utils de fecha -------- */
export function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}
export function fromYMD(s: string): Date {
  const [y, m, dd] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, dd ?? 1);
}
export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
export function yesterday(d: Date): Date {
  return addDays(d, -1);
}

/** -------- Estadísticos simples -------- */
export function mean(arr: number[]): number {
  const v = arr.filter((x) => Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}
export function sdSample(arr: number[]): number {
  const v = arr.filter((x) => Number.isFinite(x));
  if (v.length < 2) return 0;
  const m = mean(v);
  const s2 = v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1);
  return Math.sqrt(s2);
}

/** -------- SDW (score compuesto de wellness) --------
 * Implementación base: promedia ítems 1..5 (invertidos para que ↑ = mejor),
 * y agrega un pequeño ajuste por horas de sueño si está disponible.
 * Si tu escala es distinta, podés reemplazar esta función sin romper el resto.
 */
export function computeSDW(r: WellnessRaw): number {
  // Invertimos ítems 1..5 para que 5=mejor → 5 - (v - 1) = 6 - v
  const inv = (v: number | null | undefined) =>
    v == null ? null : 6 - Number(v);

  const parts: number[] = [];
  const ms = inv(r.muscleSoreness ?? null);
  const st = inv(r.stress ?? null);
  const fa = inv(r.fatigue ?? null);
  const mo = inv(r.mood ?? null);

  if (ms != null) parts.push(ms);
  if (st != null) parts.push(st);
  if (fa != null) parts.push(fa);
  if (mo != null) parts.push(mo);

  // Ajuste por sueño (si existe): normalizamos a 0..5 con pivote en 7h
  if (r.sleepHours != null) {
    const h = Number(r.sleepHours);
    // Clamp 0..10, luego map a 0..5 (aprox)
    const clamped = Math.max(0, Math.min(10, h));
    const sleepScore = Math.max(0, Math.min(5, (clamped / 10) * 5));
    parts.push(sleepScore);
  }

  if (!parts.length) return 0;
  // Escala final ≈ 0..5
  const score = mean(parts);
  // Redondeamos a 2 decimales para estabilidad visual
  return Number(score.toFixed(2));
}

/** -------- Colores por Z-score (opcional) -------- */
export function zToColor(z: number | null): string {
  if (z == null || !Number.isFinite(z)) return "bg-gray-100";
  if (z <= -1.0) return "bg-red-100";
  if (z <= -0.5) return "bg-amber-100";
  if (z >= 1.0) return "bg-emerald-100";
  if (z >= 0.5) return "bg-emerald-50";
  return "bg-gray-50";
}

/** -------- Reglas de override (opcional) --------
 * Podés aplicar banderines/ajustes de color segun el registro.
 * En este stub, devolvemos el color tal cual.
 */
export function applyOverrides(baseColor: string, _r: WellnessRaw): string {
  return baseColor;
}

/** -------- Baseline (media, sd, n) -------- */
export type Baseline = { mean: number; sd: number; n: number };
