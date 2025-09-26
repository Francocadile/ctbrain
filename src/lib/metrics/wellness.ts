// src/lib/metrics/wellness.ts
// Utilidades y tipos compartidos para Wellness (CT)

export type WellnessRaw = {
  id: string;
  user?: { name?: string; email?: string } | null;
  userName?: string | null; // compat con API
  playerKey?: string | null; // compat con API
  date: string; // YYYY-MM-DD
  sleepQuality: number; // 1..5 (5=mejor)
  sleepHours?: number | null; // 0..14
  fatigue: number; // 1..5 (5=mejor)
  muscleSoreness: number; // 1..5 (5=mejor → menor dolor)
  stress: number; // 1..5 (5=mejor → menor estrés)
  mood: number; // 1..5 (5=mejor)
  comment?: string | null;
};

export type Baseline = {
  mean: number; // media SDW (21d)
  sd: number; // desvío estándar SDW (21d)
  n: number; // días válidos
};

/** ---------- Fechas ---------- */
export function toYMD(d: Date) {
  // ISO local-date
  return d.toISOString().slice(0, 10);
}
export function fromYMD(s: string) {
  const [y, m, dd] = s.split("-").map(Number);
  return new Date(y, m - 1, dd);
}
export function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
export function yesterday(ymd: string) {
  return toYMD(addDays(fromYMD(ymd), -1));
}

/** ---------- Stats ---------- */
export function mean(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
export function sdSample(arr: number[]) {
  const n = arr.length;
  if (n < 2) return 0;
  const m = mean(arr);
  const v = arr.reduce((acc, v) => acc + (v - m) * (v - m), 0) / (n - 1);
  return Math.sqrt(v);
}

/** SDW = promedio (1..5) de los 5 ítems orientados a 5=mejor */
export function computeSDW(r: Partial<WellnessRaw>) {
  const vals = [
    Number(r.sleepQuality ?? 0),
    Number(r.fatigue ?? 0),
    Number(r.muscleSoreness ?? 0),
    Number(r.stress ?? 0),
    Number(r.mood ?? 0),
  ];
  const valid = vals.filter((v) => v > 0);
  if (!valid.length) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

/** Semáforo por Z-score según especificación */
export function zToColor(z: number | null): "green" | "yellow" | "red" {
  if (z === null) return "yellow"; // sin baseline suficiente → atención leve
  if (z >= -0.5) return "green";
  if (z >= -1.0) return "yellow";
  return "red";
}

/** Eleva severidad de color según overrides clínicos */
export function applyOverrides<
  T extends { sleepHours?: number | null; muscleSoreness?: number; stress?: number }
>(base: "green" | "yellow" | "red", r: T) {
  let level = base; // green < yellow < red
  const sleepH = r.sleepHours ?? null;
  if (sleepH !== null && sleepH < 4) {
    level = level === "green" ? "yellow" : level;
  }
  if ((r.muscleSoreness ?? 3) <= 2) {
    level = "red";
  }
  if ((r.stress ?? 3) <= 2) {
    level = level === "green" ? "yellow" : level;
  }
  return level;
}
