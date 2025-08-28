// src/lib/api/sessions.ts

/** ==== Tipos compartidos con la API ==== */
export type UserMini = {
  id: string;
  name: string | null;
  email: string | null;
  role?: string;
};

export type SessionDTO = {
  id: string;
  title: string | null;
  description: string | null;
  date: string; // ISO
  type?: "GENERAL" | "FUERZA" | "TACTICA" | "AEROBICO" | "RECUPERACION";
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  user?: UserMini | null;
};

export type WeekResponse = {
  weekStart: string; // YYYY-MM-DD
  weekEnd: string;   // YYYY-MM-DD
  days: Record<string, SessionDTO[]>;
};

/** ==== Utilidades de fecha (UTC) ==== */
export function getMonday(d: Date) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay(); // 0..6 (0=Dom)
  const diff = day === 0 ? -6 : 1 - day; // llevar al lunes
  x.setUTCDate(x.getUTCDate() + diff);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export function toYYYYMMDDUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** ==== Fetch helpers (sin caché) ==== */
async function doFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || "Error de red");
  }
  return json as T;
}

/** GET semana (usa /api/sessions?start=YYYY-MM-DD) */
export async function getSessionsWeek(params: { start: string }): Promise<WeekResponse> {
  // El endpoint server acepta ?start=YYYY-MM-DD (mismo que ya tenías)
  return doFetch<WeekResponse>(`/api/sessions?start=${encodeURIComponent(params.start)}`);
}

/** POST crear sesión */
export async function createSession(data: {
  title: string;
  description: string | null;
  date: string; // ISO
  type?: SessionDTO["type"];
}): Promise<{ data: SessionDTO }> {
  return doFetch<{ data: SessionDTO }>(`/api/sessions`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** PUT editar sesión */
export async function updateSession(
  id: string,
  data: {
    title?: string;
    description?: string | null;
    date?: string; // ISO
    type?: SessionDTO["type"];
  }
): Promise<{ data: SessionDTO }> {
  return doFetch<{ data: SessionDTO }>(`/api/sessions/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/** DELETE borrar sesión */
export async function deleteSession(id: string): Promise<{ ok: true }> {
  return doFetch<{ ok: true }>(`/api/sessions/${id}`, {
    method: "DELETE",
  });
}

