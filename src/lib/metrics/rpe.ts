// src/lib/metrics/rpe.ts

export type RPERow = {
  id?: string;
  date?: string;            // YYYY-MM-DD (opcional)
  rpe?: number | null;      // 0..10
  duration?: number | null; // minutos
  load?: number | null;     // sRPE (AU calculada)
  userName?: string | null;
  playerKey?: string | null;
  user?: { name?: string | null; email?: string | null } | null;
};

/** sRPE = RPE × minutos (si load viene, priorizarlo) */
export function srpeOf(r: RPERow): number {
  const au =
    (r.load ?? null) != null
      ? Number(r.load)
      : Number(r.rpe ?? 0) * Number(r.duration ?? 0);
  return Number.isFinite(au) ? au : 0;
}

/** Promedio simple (ignora no finitos) */
export function mean(arr: number[]): number {
  const v = arr.filter((x) => Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}

/** Bins de AU útiles para monitoreo */
export type SRPEBin = "0–300" | "301–600" | "601–900" | "901–1200" | ">1200";
export function srpeBin(v: number): SRPEBin {
  if (v <= 300) return "0–300";
  if (v <= 600) return "301–600";
  if (v <= 900) return "601–900";
  if (v <= 1200) return "901–1200";
  return ">1200";
}
