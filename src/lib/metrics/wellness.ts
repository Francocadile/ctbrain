export type WellnessRaw = {
  userId?: string;
  userName?: string;
  user?: { name?: string | null; email?: string | null } | null;
  playerKey?: string;
  sleepQuality?: number;
  fatigue?: number;
  muscleSoreness?: number;
  stress?: number;
  mood?: number;
};

export function toYMD(d: Date) { return d.toISOString().slice(0, 10); }
export function fromYMD(s: string) { const [y, m, dd] = s.split("-").map(Number); return new Date(y, m - 1, dd); }
export function addDays(d: Date, days: number) { const x = new Date(d); x.setDate(x.getDate() + days); return x; }

/** SDW simple (promedio de los 5 ítems 1–5). */
export function computeSDW(row: WellnessRaw): number {
  const vals = [row.sleepQuality, row.fatigue, row.muscleSoreness, row.stress, row.mood]
    .map((v) => (v == null ? NaN : Number(v)));
  const ok = vals.filter((n) => Number.isFinite(n));
  return ok.length ? Number((ok.reduce((a, b) => a + b, 0) / ok.length).toFixed(2)) : 0;
}
