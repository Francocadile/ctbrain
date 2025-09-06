// src/lib/settings.ts
// Fuente única de verdad para "lugares", "tipos de ejercicio" y "rivales".
// Intenta API -> fallback a localStorage -> fallback a defaults.

export type Rival = { id: string; name: string; logoUrl: string | null };

const PLACES_KEY = "ct_places";
const KINDS_KEY = "ct_exercise_kinds";
const RIVALS_KEY = "ct_rivals";

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
async function safeFetch<T = any>(
  url: string,
  init?: RequestInit,
  timeoutMs = 6000
): Promise<T | null> {
  try {
    const base =
      typeof window === "undefined" ? "" : window.location.origin;
    const full = url.startsWith("http") ? url : `${base}${url}`;
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(full, {
      ...init,
      signal: ctrl.signal,
      cache: "no-store" as RequestCache,
    });
    clearTimeout(id);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    // @ts-ignore
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// ----------------- LUGARES -----------------
export async function listPlaces(): Promise<string[]> {
  const api = await safeFetch<{ data: string[] }>("/api/places");
  if (api?.data?.length) {
    try { localStorage.setItem(PLACES_KEY, JSON.stringify(api.data)); } catch {}
    return api.data;
  }
  try {
    const raw = localStorage.getItem(PLACES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_PLACES;
}

// ----------------- TIPOS DE EJERCICIO -----------------
export async function listKinds(): Promise<string[]> {
  const api = await safeFetch<{ data: string[] }>("/api/exercise-kinds");
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

/** Agrega un tipo y devuelve la lista actualizada */
export async function addKind(name: string): Promise<string[]> {
  const n = (name || "").trim();
  if (!n) return listKinds();

  // Intento API
  const api = await safeFetch<{ data: string[] }>("/api/exercise-kinds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: n }),
  });

  if (api?.data?.length) {
    try { localStorage.setItem(KINDS_KEY, JSON.stringify(api.data)); } catch {}
    return api.data;
  }

  // Local
  const current = await listKinds();
  if (!current.includes(n)) current.push(n);
  try { localStorage.setItem(KINDS_KEY, JSON.stringify(current)); } catch {}
  return current;
}

/** Reemplaza todos los tipos (p. ej., desde el editor) */
export async function replaceKinds(next: string[]): Promise<string[]> {
  const cleaned = Array.from(new Set((next || []).map((s) => s.trim()).filter(Boolean)));

  // Intento API
  const api = await safeFetch<{ data: string[] }>("/api/exercise-kinds", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ names: cleaned }),
  });

  const final = api?.data?.length ? api.data : cleaned;
  try { localStorage.setItem(KINDS_KEY, JSON.stringify(final)); } catch {}
  return final;
}

// ----------------- RIVALES -----------------
export async function getRivals(): Promise<Rival[]> {
  const api = await safeFetch<{ data: Rival[] }>("/api/rivals");
  if (api?.data) {
    try { localStorage.setItem(RIVALS_KEY, JSON.stringify(api.data)); } catch {}
    return api.data;
  }
  try {
    const raw = localStorage.getItem(RIVALS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export async function upsertRival(r: Partial<Rival> & { name: string }): Promise<Rival> {
  const body = { id: r.id, name: r.name.trim(), logoUrl: r.logoUrl ?? null };

  // Intento API (POST si no tiene id, PUT si tiene)
  const api = await safeFetch<{ data: Rival }>(
    r.id ? `/api/rivals/${encodeURIComponent(r.id)}` : "/api/rivals",
    {
      method: r.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (api?.data) {
    // refresco cache local
    const list = await getRivals();
    const idx = list.findIndex((x) => x.id === api.data.id);
    if (idx >= 0) list[idx] = api.data; else list.push(api.data);
    try { localStorage.setItem(RIVALS_KEY, JSON.stringify(list)); } catch {}
    return api.data;
  }

  // Local
  const list = await getRivals();
  const id = r.id ?? uuid();
  const rival: Rival = { id, name: body.name, logoUrl: body.logoUrl };
  const idx = list.findIndex((x) => x.id === id);
  if (idx >= 0) list[idx] = rival; else list.push(rival);
  try { localStorage.setItem(RIVALS_KEY, JSON.stringify(list)); } catch {}
  return rival;
}

export async function deleteRival(id: string): Promise<{ ok: true }> {
  // Intento API
  const api = await safeFetch<{ ok: true }>(`/api/rivals/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (api?.ok) {
    const list = (await getRivals()).filter((r) => r.id !== id);
    try { localStorage.setItem(RIVALS_KEY, JSON.stringify(list)); } catch {}
    return { ok: true };
  }

  // Local
  const list = (await getRivals()).filter((r) => r.id !== id);
  try { localStorage.setItem(RIVALS_KEY, JSON.stringify(list)); } catch {}
  return { ok: true };
}
