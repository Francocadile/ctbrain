// src/lib/settings.ts
// Fuente única de verdad para "lugares", "tipos de ejercicio" y "rivales".
// Intenta usar API -> fallback a localStorage -> fallback a defaults.

export type Rival = { id: string; name: string; logoUrl: string | null };

const PLACES_KEY = "ct_places";
const KINDS_KEY = "ct_exercise_kinds";

export const DEFAULT_PLACES = [
  "Complejo Deportivo",
  "Cancha Auxiliar 1",
  "Cancha Auxiliar 2",
  "Gimnasio",
  "Sala de Video",
];

export const DEFAULT_KINDS = [
  "Rueda de pases",
  "Circuito técnico",
  "SSG",
  "MSG",
  "LSG",
];

// ----------------- utils -----------------
async function safeFetch<T = any>(url: string, init?: RequestInit, timeoutMs = 6000): Promise<T | null> {
  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" as RequestCache });
    clearTimeout(id);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function readLSArray(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.map((s) => String(s)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeLSArray(key: string, list: string[]) {
  if (typeof window === "undefined") return;
  const uniq = Array.from(new Set(list.map((s) => String(s).trim()).filter(Boolean)));
  localStorage.setItem(key, JSON.stringify(uniq));
}

// =====================================================
// PLACES (LUGARES)
// =====================================================
export async function getPlaces(): Promise<string[]> {
  // 1) API
  const api = await safeFetch<string[]>("/api/ct/settings/places");
  if (api && Array.isArray(api) && api.length) {
    writeLSArray(PLACES_KEY, api); // cache en LS
    return api;
  }
  // 2) localStorage
  const ls = readLSArray(PLACES_KEY);
  if (ls.length) return ls;
  // 3) defaults
  return [...DEFAULT_PLACES];
}

export async function upsertPlace(name: string): Promise<string[]> {
  const n = String(name || "").trim();
  if (!n) return getPlaces();
  // Intentar API
  const api = await safeFetch<string[]>("/api/ct/settings/places", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: n }),
  });
  if (api && Array.isArray(api)) {
    writeLSArray(PLACES_KEY, api);
    return api;
  }
  // Fallback: LS
  const ls = Array.from(new Set([...readLSArray(PLACES_KEY), n]));
  writeLSArray(PLACES_KEY, ls);
  return ls;
}

export async function replaceAllPlaces(items: string[]): Promise<string[]> {
  const clean = Array.from(new Set(items.map((s) => String(s).trim()).filter(Boolean)));
  const api = await safeFetch<string[]>("/api/ct/settings/places", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: clean }),
  });
  if (api && Array.isArray(api)) {
    writeLSArray(PLACES_KEY, api);
    return api;
  }
  writeLSArray(PLACES_KEY, clean.length ? clean : DEFAULT_PLACES);
  return readLSArray(PLACES_KEY);
}

// Aliases para que tus páginas actuales compilen sin cambios:
export const listPlaces = getPlaces;
export const addPlace = upsertPlace;
export const replacePlaces = replaceAllPlaces;

// =====================================================
// KINDS (TIPOS DE EJERCICIO)
// =====================================================
export async function getKinds(): Promise<string[]> {
  const api = await safeFetch<string[]>("/api/ct/settings/kinds");
  if (api && Array.isArray(api) && api.length) {
    writeLSArray(KINDS_KEY, api);
    return api;
  }
  const ls = readLSArray(KINDS_KEY);
  if (ls.length) return ls;
  return [...DEFAULT_KINDS];
}

export async function upsertKind(name: string): Promise<string[]> {
  const n = String(name || "").trim();
  if (!n) return getKinds();
  const api = await safeFetch<string[]>("/api/ct/settings/kinds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: n }),
  });
  if (api && Array.isArray(api)) {
    writeLSArray(KINDS_KEY, api);
    return api;
  }
  const ls = Array.from(new Set([...readLSArray(KINDS_KEY), n]));
  writeLSArray(KINDS_KEY, ls);
  return ls;
}

export async function replaceAllKinds(items: string[]): Promise<string[]> {
  const clean = Array.from(new Set(items.map((s) => String(s).trim()).filter(Boolean)));
  const api = await safeFetch<string[]>("/api/ct/settings/kinds", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: clean }),
  });
  if (api && Array.isArray(api)) {
    writeLSArray(KINDS_KEY, api);
    return api;
  }
  writeLSArray(KINDS_KEY, clean.length ? clean : DEFAULT_KINDS);
  return readLSArray(KINDS_KEY);
}

// Aliases para que tus páginas actuales compilen sin cambios:
export const listKinds = getKinds;
export const addKind = upsertKind;
export const replaceKinds = replaceAllKinds;

// =====================================================
// RIVALS (RIVALES)
// =====================================================
export async function getRivals(): Promise<Rival[]> {
  // si el backend no tiene el modelo, la ruta devuelve []
  const api = await safeFetch<Rival[]>("/api/ct/rivals");
  return Array.isArray(api) ? api : [];
}

export async function upsertRival(input: { id?: string; name: string; logoUrl?: string | null }): Promise<Rival | null> {
  const payload = { id: input?.id || undefined, name: String(input?.name || ""), logoUrl: input?.logoUrl || null };
  const res = await safeFetch<Rival>("/api/ct/rivals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res ?? null;
}

export async function deleteRival(idOrName: string): Promise<boolean> {
  const ok = await safeFetch<{}>("/api/ct/rivals", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idOrName }),
  });
  return !!ok;
}
