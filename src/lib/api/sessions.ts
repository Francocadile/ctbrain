// src/lib/api/sessions.ts

// ===== Tipos =====
export type SessionDTO = {
  id: string;
  title: string | null;
  description: string | null;
  date: string; // ISO
  type: "GENERAL" | "FUERZA" | "TACTICA" | "AEROBICO" | "RECUPERACION";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  user?: { id: string; name: string | null; email: string | null; role: any } | null;
};

// ===== Utilidades de fecha (usadas por la UI) =====
export function toYYYYMMDDUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// devuelve el lunes de la semana de la fecha dada (modo UTC)
export function getMonday(d: Date) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay() || 7; // 1..7 (lunes=1)
  if (day !== 1) x.setUTCDate(x.getUTCDate() - (day - 1));
  return x;
}

// ===== Helpers de fetch =====
async function jsonFetch(input: RequestInfo | URL, init?: RequestInit) {
  const res = await fetch(input, {
    // usar rutas relativas (funciona en server y client)
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// ===== API: Semana (GET ?start=YYYY-MM-DD) =====
export async function getSessionsWeek(params: { start: string }) {
  const q = new URLSearchParams({ start: params.start }).toString();
  // no-store para ver cambios al instante
  const res = await fetch(`/api/sessions?${q}`, { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo obtener la semana");
  return res.json() as Promise<{
    days: Record<string, SessionDTO[]>;
    weekStart: string;
    weekEnd: string;
  }>;
}

// ===== API: Crear sesión =====
export async function createSession(payload: {
  title: string;
  description?: string | null;
  date: string; // ISO
  type?: SessionDTO["type"];
}) {
  return jsonFetch(`/api/sessions`, {
    method: "POST",
    body: JSON.stringify(payload),
  }) as Promise<{ data: SessionDTO }>;
}

// ===== API: Actualizar sesión =====
export async function updateSession(
  id: string,
  payload: Partial<{
    title: string;
    description: string | null;
    date: string; // ISO
    type: SessionDTO["type"];
  }>
) {
  return jsonFetch(`/api/sessions/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }) as Promise<{ data: SessionDTO }>;
}

// ===== API: Borrar sesión =====
export async function deleteSession(id: string) {
  return jsonFetch(`/api/sessions/${id}`, {
    method: "DELETE",
  }) as Promise<{ ok: true }>;
}

// ===== API: Obtener sesión por id =====
export async function getSessionById(id: string) {
  const res = await fetch(`/api/sessions/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo obtener la sesión");
  return res.json() as Promise<{ data: SessionDTO }>;
}
