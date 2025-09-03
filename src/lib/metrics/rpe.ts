// src/lib/metrics/rpe.ts

export type RPERow = {
  id?: string;
  playerKey?: string | null;
  userName?: string | null;
  user?: { name?: string; email?: string };
  date?: string;
  rpe: number;              // 0..10
  duration?: number | null; // min
  load?: number | null;     // sRPE (AU)
};

/** sRPE = RPE × minutos (si load viene, priorizarlo) */
export function srpeOf(r: RPERow) {
  if (r.load != null) return Number(r.load);
  const dur = r.duration == null ? 0 : Number(r.duration);
  return Number(r.rpe ?? 0) * dur;
}

/** Promedio simple */
export function mean(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
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
