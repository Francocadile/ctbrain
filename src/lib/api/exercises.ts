// src/lib/api/exercises.ts
export type KindDTO = { id?: string; name: string };

export type ExerciseDTO = {
  id: string;
  userId?: string;
  title: string;
  description?: string | null;
  space?: string | null;
  players?: string | null;
  duration?: string | null;
  imageUrl?: string | null;
  tags: string[];
  createdAt: string | Date;
  updatedAt?: string | Date;
  // Si tu schema lo trae, perfecto; si no, usamos sourceSessionId
  sessionId?: string | null;
  // Siempre que el backend pueda inferirla, te la mando:
  sourceSessionId?: string | null;
  kind?: KindDTO | null;
};

export type SearchParams = {
  q?: string;
  /** filtro por nombre del tipo (compat con UI) */
  kind?: string;
  /** filtro por id del tipo (opcional) */
  kindId?: string;
  order?: "createdAt" | "title";
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export async function searchExercises(params: SearchParams) {
  const url = new URL(
    "/api/exercises",
    typeof window === "undefined" ? "http://localhost" : window.location.origin
  );
  const {
    q = "",
    kind,
    kindId,
    order = "createdAt",
    dir = "desc",
    page = 1,
    pageSize = 20,
  } = params || {};

  if (q) url.searchParams.set("q", q);
  if (kind) url.searchParams.set("kind", kind);
  if (kindId) url.searchParams.set("kindId", kindId);
  url.searchParams.set("order", order);
  url.searchParams.set("dir", dir);
  url.searchParams.set("page", String(page));
  url.searchParams.set("pageSize", String(pageSize));

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo listar ejercicios");
  return (await res.json()) as {
    data: ExerciseDTO[];
    meta: { total: number; page: number; pageSize: number; pages: number };
  };
}

export async function getExercise(id: string) {
  const res = await fetch(`/api/exercises/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo obtener el ejercicio");
  return (await res.json()) as { data: ExerciseDTO };
}

export async function createExercise(payload: Partial<ExerciseDTO>) {
  const res = await fetch(`/api/exercises`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("No se pudo crear el ejercicio");
  return (await res.json()) as { data: ExerciseDTO };
}

export async function updateExercise(id: string, payload: Partial<ExerciseDTO>) {
  const res = await fetch(`/api/exercises/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("No se pudo actualizar el ejercicio");
  return (await res.json()) as { data: ExerciseDTO };
}

export async function deleteExercise(id: string) {
  const res = await fetch(`/api/exercises/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("No se pudo eliminar");
  return (await res.json()) as { ok: true };
}

// Importar desde sesiones (todo o una)
export async function importFromSession(sessionId: string) {
  const res = await fetch(`/api/exercises/import?sessionId=${encodeURIComponent(sessionId)}`, { method: "POST" });
  if (!res.ok) return { ok: false, created: 0, updated: 0 };
  return (await res.json()) as { ok: boolean; created: number; updated: number };
}
export async function importAllFromSessions() {
  const res = await fetch(`/api/exercises/import`, { method: "POST" });
  if (!res.ok) return { ok: false, created: 0, updated: 0 };
  return (await res.json()) as { ok: boolean; created: number; updated: number };
}
