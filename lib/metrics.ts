// src/lib/metrics.ts
// MVP sin tablas nuevas: persistimos en localStorage.
// Luego migraremos a Prisma. Las claves están namespaced.

export type PlayerId = string;
export type YYYYMMDD = string;

const LS_RPE_KEY = "ct_metrics_rpe_v1";
const LS_WELL_KEY = "ct_metrics_wellness_v1";
const LS_PLAYERS_KEY = "ct_players_demo_v1";

// -------------------- Players (demo para CT) --------------------
export type Player = { id: PlayerId; name: string; number?: number };

const DEMO_PLAYERS: Player[] = [
  { id: "p1", name: "Jugador 1", number: 1 },
  { id: "p2", name: "Jugador 2", number: 2 },
  { id: "p3", name: "Jugador 3", number: 3 },
];

export function getPlayers(): Player[] {
  if (typeof window === "undefined") return DEMO_PLAYERS;
  try {
    const raw = localStorage.getItem(LS_PLAYERS_KEY);
    if (!raw) {
      localStorage.setItem(LS_PLAYERS_KEY, JSON.stringify(DEMO_PLAYERS));
      return DEMO_PLAYERS;
    }
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr;
  } catch {}
  return DEMO_PLAYERS;
}

export function upsertPlayer(p: Player) {
  if (typeof window === "undefined") return;
  const all = getPlayers();
  const idx = all.findIndex((x) => x.id === p.id);
  if (idx === -1) all.push(p);
  else all[idx] = { ...all[idx], ...p };
  localStorage.setItem(LS_PLAYERS_KEY, JSON.stringify(all));
}

export function deletePlayer(id: PlayerId) {
  if (typeof window === "undefined") return;
  const all = getPlayers().filter((p) => p.id !== id);
  localStorage.setItem(LS_PLAYERS_KEY, JSON.stringify(all));
}

// -------------------- RPE --------------------
// El jugador reporta rpe (0..10). CT define duración (min). sRPE = rpe * duration.
export type RPEEntry = {
  playerId: PlayerId;
  ymd: YYYYMMDD;
  rpe: number; // 0..10
  durationMin: number; // minutos (definido por CT)
};

type RPEState = Record<YYYYMMDD, Record<PlayerId, RPEEntry>>;

function readRPE(): RPEState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LS_RPE_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}
function writeRPE(state: RPEState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_RPE_KEY, JSON.stringify(state));
}

export function setRPEValue(ymd: YYYYMMDD, playerId: PlayerId, rpe: number) {
  const s = readRPE();
  const day = s[ymd] || {};
  const prev = day[playerId] || { playerId, ymd, rpe: 0, durationMin: 0 };
  day[playerId] = { ...prev, rpe: Math.max(0, Math.min(10, Number(rpe) || 0)) };
  s[ymd] = day;
  writeRPE(s);
}
export function setDurationValue(ymd: YYYYMMDD, playerId: PlayerId, durationMin: number) {
  const s = readRPE();
  const day = s[ymd] || {};
  const prev = day[playerId] || { playerId, ymd, rpe: 0, durationMin: 0 };
  day[playerId] = { ...prev, durationMin: Math.max(0, Math.floor(Number(durationMin) || 0)) };
  s[ymd] = day;
  writeRPE(s);
}

export function getRPEByDay(ymd: YYYYMMDD): RPEEntry[] {
  const s = readRPE();
  const day = s[ymd] || {};
  return Object.values(day);
}

export function getRPEBetween(startYMD: YYYYMMDD, endYMD: YYYYMMDD): RPEEntry[] {
  // rango inclusive
  const s = readRPE();
  const res: RPEEntry[] = [];
  const allDays = Object.keys(s).sort();
  for (const d of allDays) {
    if (d >= startYMD && d <= endYMD) res.push(...Object.values(s[d]));
  }
  return res;
}

export function sRPE(e: RPEEntry) {
  return (Number(e.rpe) || 0) * (Number(e.durationMin) || 0);
}

// Rangos de referencia (AU) — Foster / Impellizzeri / Gabbett (resumen práctico)
export const RPE_BANDS = [
  { band: "Ligera",    min: 0,   max: 399,  color: "green",  label: "< 400 AU" },
  { band: "Moderada",  min: 400, max: 699,  color: "yellow", label: "400–700 AU" },
  { band: "Alta",      min: 700, max: 999,  color: "orange", label: "700–1000 AU" },
  { band: "Muy alta",  min: 1000, max: Infinity, color: "red", label: "> 1000 AU" },
] as const;

export type BandColor = (typeof RPE_BANDS)[number]["color"];

export function bandForAU(au: number) {
  return RPE_BANDS.find((b) => au >= b.min && au <= b.max);
}

// KPIs semanales
export function weeklyTotals(entries: RPEEntry[]) {
  const byDay: Record<YYYYMMDD, number> = {};
  for (const e of entries) {
    byDay[e.ymd] = (byDay[e.ymd] || 0) + sRPE(e);
  }
  const days = Object.keys(byDay).sort();
  const dayLoads = days.map((d) => byDay[d]);
  const total = dayLoads.reduce((a, b) => a + b, 0);
  const mean = dayLoads.length ? total / dayLoads.length : 0;
  const sd =
    dayLoads.length > 1
      ? Math.sqrt(dayLoads.map((x) => (x - mean) ** 2).reduce((a, b) => a + b, 0) / dayLoads.length)
      : 0;
  const monotony = mean && sd ? mean / sd : 0; // si sd ~0 → grande
  const strain = total * (monotony || 0);
  return { byDay, days, dayLoads, total, mean, sd, monotony, strain };
}

// ACWR: aguda (última semana) / crónica (promedio 3–4 semanas previas)
export function computeACWR(acute: number, chronicMean: number) {
  if (!chronicMean) return 0;
  return acute / chronicMean;
}

// -------------------- Wellness --------------------
export type WellnessKeys =
  | "sleepQuality"       // 1..5
  | "sleepDurationH"     // horas (0..14, libre)
  | "fatigue"            // 1..5
  | "muscleSoreness"     // 1..5
  | "stress"             // 1..5 (inverso: 1 alto, 5 bajo)
  | "mood";              // 1..5

export type WellnessResponse = {
  playerId: PlayerId;
  ymd: YYYYMMDD;
  sleepQuality: number;
  sleepDurationH: number;
  fatigue: number;
  muscleSoreness: number;
  stress: number;
  mood: number;
  comment?: string;
};

type WellnessState = Record<YYYYMMDD, Record<PlayerId, WellnessResponse>>;

function readWell(): WellnessState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LS_WELL_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}
function writeWell(state: WellnessState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_WELL_KEY, JSON.stringify(state));
}

export function upsertWellness(resp: WellnessResponse) {
  const s = readWell();
  const day = s[resp.ymd] || {};
  day[resp.playerId] = resp;
  s[resp.ymd] = day;
  writeWell(s);
}

export function getWellnessByDay(ymd: YYYYMMDD): WellnessResponse[] {
  const s = readWell();
  const day = s[ymd] || {};
  return Object.values(day);
}

export function getWellnessBetween(startYMD: YYYYMMDD, endYMD: YYYYMMDD): WellnessResponse[] {
  const s = readWell();
  const res: WellnessResponse[] = [];
  const allDays = Object.keys(s).sort();
  for (const d of allDays) {
    if (d >= startYMD && d <= endYMD) res.push(...Object.values(s[d]));
  }
  return res;
}

// Total (sin horas de sueño): 5 ítems de 1..5 → 5..25
export function wellnessSum(w: WellnessResponse) {
  return (w.sleepQuality || 0) + (w.fatigue || 0) + (w.muscleSoreness || 0) + (w.stress || 0) + (w.mood || 0);
}
