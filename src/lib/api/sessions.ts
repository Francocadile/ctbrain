// src/lib/api/sessions.ts

export type SessionDTO = {
  id: string;
  title: string | null;
  description: string | null;
  content?: unknown;
  date: string; // ISO
  type?: "GENERAL" | "FUERZA" | "TACTICA" | "AEROBICO" | "RECUPERACION";
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  user?: { id: string; name: string | null; email: string | null; role?: string | null } | null;
};

export type WeekResponse = {
  weekStart: string; // YYYY-MM-DD
  weekEnd: string;   // YYYY-MM-DD
  days: Record<string, SessionDTO[]>;
};

/** ---------- Utilidades de fecha ---------- **/
export function toYYYYMMDDUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Lunes de la semana en UTC (Lun=1..Dom=7)
export function getMonday(base: Date) {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  const dow = d.getUTCDay() || 7;
  if (dow !== 1) d.setUTCDate(d.getUTCDate() - (dow - 1));
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** ---------- Llamadas a API ---------- **/
// Lista de la semana (nuestro GET /api/sessions?start=YYYY-MM-DD)
export async function getSessionsWeek({ start }: { start: string }): Promise<WeekResponse> {
  const res = await fetch(`/api/sessions?start=${encodeURIComponent(start)}`, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "No se pudo cargar la semana");
  return json as WeekResponse;
}

// Crear sesión (POST /api/sessions) -> { data: SessionDTO }
export async function createSession(payload: {
  title: string;
  description: string | null;
  date: string; // ISO
  type?: SessionDTO["type"];
  content?: unknown;
}) {
  const res = await fetch(`/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) {
    // Log detallado para diagnóstico (incluye issues de Zod si están presentes)
    // Se ejecuta en el cliente (navegador) al usar el editor de plan semanal.
    console.error("createSession error response", json);
    throw new Error(json?.error || "Error al crear la sesión");
  }
  return json as { data: SessionDTO };
}

// Editar sesión (PUT /api/sessions/[id]) -> { data: SessionDTO }
export async function updateSession(
  id: string,
  payload: Partial<{ title: string; description: string | null; date: string; type: SessionDTO["type"]; content: unknown }>
) {
  const res = await fetch(`/api/sessions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error("updateSession error response", json);
    throw new Error(json?.error || "Error al actualizar la sesión");
  }
  return json as { data: SessionDTO };
}

// Borrar sesión (DELETE /api/sessions/[id]) -> { ok: true }
export async function deleteSession(id: string) {
  const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
  const json = await res.json();
  if (!res.ok) {
    console.error("deleteSession error response", json);
    throw new Error(json?.error || "Error al borrar la sesión");
  }
  return json as { ok: boolean };
}

// Detalle (GET /api/sessions/[id]) -> { data: SessionDTO }
export async function getSessionById(id: string) {
  const res = await fetch(`/api/sessions/${id}`, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Sesión no encontrada");
  return json as { data: SessionDTO };
}
