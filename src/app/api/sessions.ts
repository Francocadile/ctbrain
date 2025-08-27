// src/lib/api/sessions.ts
// Servicio centralizado para consumir los endpoints de Sessions desde el front.
// Incluye helpers tipados y manejo de errores consistente.

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
  createdBy?: string;  // userId (string) en el schema actual
  user?: UserLite | null;
  players?: UserLite[]; // por ahora no usamos, pero queda para compat futura
};

type ApiListResponse<T> = { data: T[] };
type ApiItemResponse<T> = { data: T };
type ApiError = { error: string; details?: unknown };

function isApiError(x: any): x is ApiError {
  return x && typeof x === "object" && typeof x.error === "string";
}

// --------------------
// Lectura (semana/lista/detalle)
// --------------------

/** Trae sesiones de una semana por rango YYYY-MM-DD (lunes a domingo recomendado) */
export async function getSessionsWeek(params: { start: string }): Promise<{
  weekStart: string; // YYYY-MM-DD
  weekEnd: string;   // YYYY-MM-DD
  days: Record<string, SessionDTO[]>;
}> {
  const url = `/api/sessions/week?start=${encodeURIComponent(params.start)}`;
  const res = await fetch(url, { method: "GET", cache: "no-store" });
  const json = await res.json();
  if (!res.ok) {
    const msg = isApiError(json) ? json.error : "Error al obtener la semana";
    throw new Error(msg);
  }
  return json as {
    weekStart: string;
    weekEnd: string;
    days: Record<string, SessionDTO[]>;
  };
}

/** Lista últimas sesiones (máx 50) */
export async function listSessions(): Promise<SessionDTO[]> {
  const res = await fetch("/api/sessions", { method: "GET", cache: "no-store" });
  const json = await res.json();
  if (!res.ok) {
    const msg = isApiError(json) ? json.error : "Error al listar sesiones";
    throw new Error(msg);
  }
  return (json as ApiListResponse<SessionDTO>).data;
}

/** Detalle por id */
export async function getSession(id: string): Promise<SessionDTO> {
  const res = await fetch(`/api/sessions/${id}`, { method: "GET", cache: "no-store" });
  const json = await res.json();
  if (!res.ok) {
    const msg = isApiError(json) ? json.error : "Error al obtener la sesión";
    throw new Error(msg);
  }
  return (json as ApiItemResponse<SessionDTO>).data;
}

// --------------------
// Mutaciones (crear/editar/borrar)
// --------------------

export async function createSession(input: {
  title: string;
  description?: string | null;
  date: string; // ISO
}): Promise<SessionDTO> {
  const res = await fetch("/api/sessions", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!res.ok) {
    const msg = isApiError(json) ? json.error : "Error al crear la sesión";
    throw new Error(msg);
  }
  return (json as ApiItemResponse<SessionDTO>).data;
}

export async function updateSession(id: string, input: {
  title?: string;
  description?: string | null;
  date?: string; // ISO
}): Promise<SessionDTO> {
  const res = await fetch(`/api/sessions/${id}`, {
    method: "PUT",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!res.ok) {
    const msg = isApiError(json) ? json.error : "Error al actualizar la sesión";
    throw new Error(msg);
  }
  return (json as ApiItemResponse<SessionDTO>).data;
}

export async function deleteSession(id: string): Promise<void> {
  const res = await fetch(`/api/sessions/${id}`, {
    method: "DELETE",
    cache: "no-store",
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    const msg = isApiError(json) ? json.error : "Error al borrar la sesión";
    throw new Error(msg);
  }
}

// --------------------
// Utilidades de semana (lunes-based)
// --------------------
export function getMonday(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0..6 (0 = Sunday)
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function toYYYYMMDDUTC(date: Date) {
  return date.toISOString().slice(0, 10);
}
