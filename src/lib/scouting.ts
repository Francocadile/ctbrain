// src/lib/scouting.ts
export type ScoutingStatus = "ACTIVO" | "WATCHLIST" | "DESCARTADO";

export type ScoutingCategory = {
  id: string;
  nombre: string;
  slug: string;
  orden: number;
  color?: string | null;
  activa: boolean;
};

export type ScoutingPlayer = {
  id: string;
  fullName: string;
  positions: string[];
  club?: string | null;
  estado: ScoutingStatus;
  categoriaId?: string | null;

  agentName?: string | null;
  agentPhone?: string | null;
  agentEmail?: string | null;
  playerPhone?: string | null;
  playerEmail?: string | null;
  instagram?: string | null;

  videos: string[];
  notes?: string | null;
  rating?: number | null;
  tags: string[];

  createdAt?: string;
  updatedAt?: string;
};

// ---------- utils ----------
const CAT_KEY_BASE = "ct_scout_categories";
const PLY_KEY_BASE = "ct_scout_players"; // por categoría + team

function currentTeamSuffix(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)ctb_team=([^;]+)/);
  if (!match) return "";
  try {
    return `_${decodeURIComponent(match[1])}`;
  } catch {
    return `_${match[1]}`;
  }
}

const catCacheKey = () => `${CAT_KEY_BASE}${currentTeamSuffix()}`;
const playerCacheKey = (categoriaId: string) => `${PLY_KEY_BASE}_${categoriaId}${currentTeamSuffix()}`;

async function safeFetch<T = any>(
  url: string,
  init?: RequestInit,
  timeoutMs = 6000
): Promise<T | null> {
  try {
    const base = typeof window === "undefined" ? "" : window.location.origin;
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

// ---------- Categorías ----------
export async function listCategories(): Promise<ScoutingCategory[]> {
  const api = await safeFetch<{ data: ScoutingCategory[] }>("/api/ct/scouting/categories");
  if (api?.data) {
    try { localStorage.setItem(catCacheKey(), JSON.stringify(api.data)); } catch {}
    return api.data;
  }
  try {
    const raw = localStorage.getItem(catCacheKey());
    if (raw) return JSON.parse(raw) as ScoutingCategory[];
  } catch {}
  return [];
}

export async function createCategory(nombre: string): Promise<ScoutingCategory> {
  const api = await safeFetch<{ data: ScoutingCategory }>("/api/ct/scouting/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre }),
  });
  if (api?.data) {
    const list = await listCategories();
    list.push(api.data);
    try { localStorage.setItem(catCacheKey(), JSON.stringify(list)); } catch {}
    return api.data;
  }
  // local (fallback simple)
  const slug = nombre.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
  const cat: ScoutingCategory = {
    id: `local_${Date.now()}`,
    nombre,
    slug,
    orden: Date.now(),
    activa: true,
    color: undefined,
  };
  const list = await listCategories();
  list.push(cat);
  try { localStorage.setItem(catCacheKey(), JSON.stringify(list)); } catch {}
  return cat;
}

export async function updateCategory(
  id: string,
  patch: Partial<ScoutingCategory>
): Promise<ScoutingCategory | undefined> {
  const api = await safeFetch<{ data: ScoutingCategory }>(`/api/ct/scouting/categories/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (api?.data) {
    const list = await listCategories();
    const idx = list.findIndex((c: ScoutingCategory) => c.id === id);
    if (idx >= 0) list[idx] = api.data;
    try { localStorage.setItem(catCacheKey(), JSON.stringify(list)); } catch {}
    return api.data;
  }
  // local
  const list = await listCategories();
  const idx = list.findIndex((c: ScoutingCategory) => c.id === id);
  if (idx >= 0) list[idx] = { ...list[idx], ...patch } as ScoutingCategory;
  try { localStorage.setItem(catCacheKey(), JSON.stringify(list)); } catch {}
  return list[idx];
}

export async function deleteCategory(id: string): Promise<{ ok: true } | { error: string }> {
  try {
    const res = await fetch(`/api/ct/scouting/categories/${id}`, { method: "DELETE", cache: "no-store" });
    let payload: any = null;
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }

    if (!res.ok) {
      const msg = payload?.error || `HTTP ${res.status}`;
      return { error: msg };
    }

    // Actualizo cache local igualmente
    const list = (await listCategories()).filter((c: ScoutingCategory) => c.id !== id);
    try { localStorage.setItem(catCacheKey(), JSON.stringify(list)); } catch {}
    return { ok: true };
  } catch (err: any) {
    return { error: err?.message || "Error de red al borrar categoría" };
  }
}

// ---------- Jugadores ----------
export async function listPlayers(
  params?: { categoriaId?: string; q?: string; estado?: ScoutingStatus }
): Promise<ScoutingPlayer[]> {
  const qs = new URLSearchParams();
  if (params?.categoriaId) qs.set("categoriaId", params.categoriaId);
  if (params?.q) qs.set("q", params.q);
  if (params?.estado) qs.set("estado", params.estado);

  const api = await safeFetch<{ data: ScoutingPlayer[] }>(
    `/api/ct/scouting/players?${qs.toString()}`
  );
  if (api?.data) {
    if (params?.categoriaId) {
      try { localStorage.setItem(playerCacheKey(params.categoriaId), JSON.stringify(api.data)); } catch {}
    }
    return api.data;
  }
  // local
  if (params?.categoriaId) {
    try {
      const raw = localStorage.getItem(playerCacheKey(params.categoriaId));
      if (raw) return JSON.parse(raw) as ScoutingPlayer[];
    } catch {}
  }
  return [];
}

export async function getPlayer(id: string): Promise<ScoutingPlayer | null> {
  const api = await safeFetch<{ data: ScoutingPlayer }>(`/api/ct/scouting/players/${id}`);
  return api?.data ?? null;
}

export async function upsertPlayer(
  payload: Partial<ScoutingPlayer> & { fullName: string }
): Promise<ScoutingPlayer> {
  const body = { ...payload };
  const url = payload.id ? `/api/ct/scouting/players/${payload.id}` : "/api/ct/scouting/players";
  const method = payload.id ? "PUT" : "POST";

  const api = await safeFetch<{ data: ScoutingPlayer }>(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (api?.data) {
    if (api.data.categoriaId) {
      const list = await listPlayers({ categoriaId: api.data.categoriaId });
      const idx = list.findIndex((p: ScoutingPlayer) => p.id === api.data.id);
      if (idx >= 0) list[idx] = api.data; else list.push(api.data);
      try { localStorage.setItem(playerCacheKey(api.data.categoriaId), JSON.stringify(list)); } catch {}
    }
    return api.data;
  }

  // local simple
  const p: ScoutingPlayer = {
    id: payload.id ?? `local_${Date.now()}`,
    fullName: payload.fullName,
    positions: payload.positions ?? [],
    club: payload.club ?? null,
    estado: (payload.estado ?? "ACTIVO") as ScoutingStatus,
    categoriaId: payload.categoriaId ?? null,
    agentName: payload.agentName ?? null,
    agentPhone: payload.agentPhone ?? null,
    agentEmail: payload.agentEmail ?? null,
    playerPhone: payload.playerPhone ?? null,
    playerEmail: payload.playerEmail ?? null,
    instagram: payload.instagram ?? null,
    videos: payload.videos ?? [],
    notes: payload.notes ?? null,
    rating: payload.rating ?? null,
    tags: payload.tags ?? [],
  };

  if (p.categoriaId) {
    const list = await listPlayers({ categoriaId: p.categoriaId });
    const idx = list.findIndex((x: ScoutingPlayer) => x.id === p.id);
    if (idx >= 0) list[idx] = p; else list.push(p);
    try { localStorage.setItem(playerCacheKey(p.categoriaId), JSON.stringify(list)); } catch {}
  }
  return p;
}

export async function deletePlayer(id: string): Promise<{ ok: true }> {
  await safeFetch<{ ok: true }>(`/api/ct/scouting/players/${id}`, { method: "DELETE" });
  return { ok: true };
}
