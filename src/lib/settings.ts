// src/lib/settings.ts
export type RivalDTO = { id?: string; name: string; logoUrl?: string | null };

const PLACES_KEY = "ct_places";
const KINDS_KEY  = "ct_exercise_kinds";

const DEFAULT_PLACES = ["Complejo Deportivo","Cancha Auxiliar 1","Cancha Auxiliar 2","Gimnasio","Sala de Video"];
const DEFAULT_KINDS  = ["Rueda de pases","Circuito técnico","SSG","MSG","LSG"];

// ------- fetch helper -------
async function fetchJSON<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers||{}) } });
  if (!res.ok) throw new Error(await res.text().catch(()=>res.statusText));
  return res.json() as Promise<T>;
}
function uniqClean(list: string[]) {
  return Array.from(new Set(list.map(s => (s||"").trim()).filter(Boolean)));
}

// ------- LocalStorage fallbacks -------
function lsGet(key: string, fallback: string[]) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : fallback;
  } catch { return fallback; }
}
function lsSet(key: string, list: string[]) {
  localStorage.setItem(key, JSON.stringify(uniqClean(list)));
}

/* ===========================
 *          PLACES
 * =========================== */
export async function listPlaces(): Promise<string[]> {
  try { return await fetchJSON<string[]>("/api/ct/settings/places"); }
  catch { return lsGet(PLACES_KEY, DEFAULT_PLACES); }
}
export async function addPlace(name: string): Promise<string[]> {
  name = (name||"").trim(); if (!name) return listPlaces();
  try { return await fetchJSON<string[]>("/api/ct/settings/places", { method: "POST", body: JSON.stringify({ name }) }); }
  catch { const next = uniqClean([...lsGet(PLACES_KEY, DEFAULT_PLACES), name]); lsSet(PLACES_KEY, next); return next; }
}
export async function replacePlaces(all: string[]): Promise<string[]> {
  const clean = uniqClean(all);
  try { return await fetchJSON<string[]>("/api/ct/settings/places", { method: "PUT", body: JSON.stringify({ items: clean }) }); }
  catch { lsSet(PLACES_KEY, clean); return clean; }
}

/* ===========================
 *          KINDS
 * =========================== */
export async function listKinds(): Promise<string[]> {
  try { return await fetchJSON<string[]>("/api/ct/settings/kinds"); }
  catch { return lsGet(KINDS_KEY, DEFAULT_KINDS); }
}
export async function addKind(name: string): Promise<string[]> {
  name = (name||"").trim(); if (!name) return listKinds();
  try { return await fetchJSON<string[]>("/api/ct/settings/kinds", { method: "POST", body: JSON.stringify({ name }) }); }
  catch { const next = uniqClean([...lsGet(KINDS_KEY, DEFAULT_KINDS), name]); lsSet(KINDS_KEY, next); return next; }
}
export async function replaceKinds(all: string[]): Promise<string[]> {
  const clean = uniqClean(all);
  try { return await fetchJSON<string[]>("/api/ct/settings/kinds", { method: "PUT", body: JSON.stringify({ items: clean }) }); }
  catch { lsSet(KINDS_KEY, clean); return clean; }
}

/* ===========================
 *          RIVALS
 * =========================== */
export async function listRivals(): Promise<RivalDTO[]> {
  try { return await fetchJSON<RivalDTO[]>("/api/ct/rivals"); }
  catch { return []; }
}
export async function upsertRival(r: RivalDTO): Promise<RivalDTO> {
  try { return await fetchJSON<RivalDTO>("/api/ct/rivals", { method: "POST", body: JSON.stringify(r) }); }
  catch { return { ...r }; } // fallback sin persistencia
}
export async function deleteRival(idOrName: string): Promise<void> {
  try { await fetchJSON<void>("/api/ct/rivals", { method: "DELETE", body: JSON.stringify({ idOrName }) }); }
  catch { /* noop */ }
}
