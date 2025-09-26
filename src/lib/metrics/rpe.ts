export type RPERow = {
  rpe?: number | null;
  duration?: number | null;
  load?: number | null;
  userName?: string | null;
  playerKey?: string | null;
};

export function srpeOf(r: RPERow): number {
  const au =
    (r.load ?? null) != null
      ? Number(r.load)
      : Number(r.rpe ?? 0) * Number(r.duration ?? 0);
  return Number.isFinite(au) ? au : 0;
}

export function mean(arr: number[]): number {
  const v = arr.filter((x) => Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}
