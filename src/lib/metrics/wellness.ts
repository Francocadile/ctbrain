// src/lib/metrics/wellness.ts

/** ---------- Tipos ---------- */
export type WellnessRaw = {
  id: string;
  user?: { name?: string; email?: string };
  userName?: string | null;
  playerKey?: string | null;
  date: string; // YYYY-MM-DD
  sleepQuality: number; // 1..5 (5 = mejor)
  sleepHours?: number | null; // 0..14 (opcional)
  fatigue: number; // 1..5 (5 = mejor)
  muscleSoreness: number; // 1..5 (5 = mejor → menor dolor)
  stress: number; // 1..5 (5 = mejor → menor estrés)
  mood: number; // 1..5 (5 = mejor)
  comment?: string | null;
};

export type Baseline = {
  mean: number; // media SDW
  sd: number;   // desvío estándar SDW
  n: number;    // días válidos
};

/** ---------- Fechas ---------- */
export function toYMD(d: Date) {
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

/** ---------- Estadística ---------- */
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
export function computeSDW(r: Pick<WellnessRaw, "sleepQuality"|"fatigue"|"muscleSoreness"|"stress"|"mood">) {
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

/** Color por Z-score */
export type Traffic = "green" | "yellow" | "red";
export function zToColor(z: number | null): Traffic {
  if (z === null) return "yellow"; // sin baseline suficiente → atención leve
  if (z >= -0.5) return "green";
  if (z >= -1.0) return "yellow";
  return "red";
}

/** Overrides clínicos */
export function applyOverrides(base: Traffic, r: { sleepHours?: number|null; muscleSoreness: number; stress: number }): Traffic {
  let level = base; // green < yellow < red
  const sleepH = r.sleepHours ?? null;
  if (sleepH !== null && sleepH < 4) {
    level = level === "green" ? "yellow" : level;
  }
  if (r.muscleSoreness <= 2) {
    level = "red";
  }
  if (r.stress <= 2) {
    level = level === "green" ? "yellow" : level;
  }
  return level;
}

/** Helpers de baseline y Z */
export function computeBaseline(sdws: number[]): Baseline {
  const clean = sdws.filter((v) => v > 0);
  return { mean: mean(clean), sd: sdSample(clean), n: clean.length };
}
export function computeZ(sdw: number, base?: Baseline | null): number | null {
  if (!base || base.n < 7 || base.sd <= 0) return null;
  return (sdw - base.mean) / base.sd;
}
