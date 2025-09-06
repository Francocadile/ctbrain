// src/lib/settings.ts
// Fuente única de verdad para "lugares" y "tipos de ejercicio".
// Intenta API -> localStorage -> defaults.

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
    // Evitar fetch en SSR cuando no hay window.origin
    const base = typeof window === "undefined" ? "" : window.location.origin;
    const full = url.startsWith("http") ? url : `${base}${url}`;

    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(full, { ...init, signal: ctrl.signal, cache: "no-store" as RequestCache });
    clearTimeout(id);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// Lugares
export async function listPlaces(): Promise<string[]> {
  // API opcional
  const api = await safeFetch<{ data: string[] }>("/api/places").catch(() => null);
  if (api?.data?.length) {
    try { localStorage.setItem(PLACES_KEY, JSON.stringify(api.data)); } catch {}
    return api.data;
  }
  // localStorage
  try {
    const raw = localStorage.getItem(PLACES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_PLACES;
}

// Tipos de ejercicio (nombres)
export async function listKinds(): Promise<string[]> {
  const api = await safeFetch<{ data: string[] }>("/api/exercise-kinds").catch(() => null);
  if (api?.data?.length) {
    try { localStorage.setItem(KINDS_KEY, JSON.stringify(api.data)); } catch {}
    return api.data;
  }
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(KINDS_KEY) : null;
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_KINDS;
}
