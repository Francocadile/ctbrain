// src/lib/api/sessions.ts
export type Role = "ADMIN" | "CT" | "MEDICO" | "JUGADOR" | "DIRECTIVO";

export type UserLite = {
  id: string;
  name: string | null;
  email: string | null;
  role?: Role;
};

export type SessionDTO = {
  id: string;
  title: string;
  description: string | null;
  date: string;        // ISO
  createdAt?: string;  // ISO
  updatedAt?: string;  // ISO
  createdBy?: string;  // userId
  user?: UserLite | null;
  players?: UserLite[]; // reservado para futuro M2M
};

type ApiListResponse<T> = { data: T[] };
type ApiItemResponse<T> = { data: T };
type ApiError = { error: string; details?: unknown };

function isApiError(x: any): x is ApiError {
  return x && typeof x === "object" && typeof x.error === "string";
}

// ---- Lectura ----
export async function getSessionsWeek(params: { start: string }): Promise<{
  weekStart: string; weekEnd: string; days: Record<string, SessionDTO[]>;
}> {
  const res = await fetch(`/api/sessions/week?start=${encodeURIComponent(params.start)}`, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(isApiError(json) ? json.error : "Error al obtener la semana");
  return json;
}

export async function listSessions(): Promise<SessionDTO[]> {
  const res = await fetch("/api/sessions", { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(isApiError(json) ? json.error : "Error al listar sesiones");
  return (json as ApiListResponse<SessionDTO>).data;
}

export async function getSession(id: string): Promise<SessionDTO> {
  const res = await fetch(`/api/sessions/${id}`, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(isApiError(json) ? json.error : "Error al obtener la sesión");
  return (json as ApiItemResponse<SessionDTO>).data;
}

// ---- Mutaciones ----
export async function createSession(input: {
  title: string; description?: string | null; date: string; // ISO
}): Promise<SessionDTO> {
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(isApiError(json) ? json.error : "Error al crear la sesión");
  return (json as ApiItemResponse<SessionDTO>).data;
}

export async function updateSession(id: string, input: {
  title?: string; description?: string | null; date?: string; // ISO
}): Promise<SessionDTO> {
  const res = await fetch(`/api/sessions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(isApiError(json) ? json.error : "Error al actualizar la sesión");
  return (json as ApiItemResponse<SessionDTO>).data;
}

export async function deleteSession(id: string): Promise<void> {
  const res = await fetch(`/api/sessions/${id}`, { method: "DELETE", cache: "no-store" });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(isApiError(json) ? json.error : "Error al borrar la sesión");
  }
}

// ---- Util semana (lunes-based, UTC) ----
export function getMonday(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0..6 (0=Dom)
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
export function toYYYYMMDDUTC(date: Date) {
  return date.toISOString().slice(0, 10);
}
