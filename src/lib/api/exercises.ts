// src/lib/api/exercises.ts

export type KindDTO = { id: string; name: string };

export type ExerciseDTO = {
  id: string;
  title: string;
  createdAt: string;
  space: string | null;
  players: string | null;
  duration: string | null;
  description: string | null;
  imageUrl: string | null;
  tags: string[];
  kind: KindDTO | null;
};

export type SearchParams = {
  q?: string;
  /** si tenés el id del kind */
  kindId?: string;
  /** ordenación */
  order?: "createdAt" | "title";
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

/** Listado/paginado de ejercicios */
export async function searchExercises(
  params: SearchParams
): Promise<{ data: ExerciseDTO[]; meta: { total: number; page: number; pageSize: number; pages: number } }> {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.kindId) sp.set("kindId", params.kindId);
  if (params.order) sp.set("order", params.order);
  if (params.dir) sp.set("dir", params.dir);
  if (params.page) sp.set("page", String(params.page));
  if (params.pageSize) sp.set("pageSize", String(params.pageSize));

  const res = await fetch(`/api/exercises?${sp.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Obtener un ejercicio */
export async function getExercise(id: string): Promise<ExerciseDTO> {
  const res = await fetch(`/api/exercises/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return json.data as ExerciseDTO;
}

/** Crear ejercicio */
export async function createExercise(payload: {
  title: string;
  kindId?: string | null;
  space?: string | null;
  players?: string | null;
  duration?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  tags?: string[];
}): Promise<ExerciseDTO> {
  const res = await fetch(`/api/exercises`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return json.data as ExerciseDTO;
}

/** Actualizar ejercicio */
export async function updateExercise(
  id: string,
  payload: Partial<{
    title: string;
    kindId: string | null;
    space: string | null;
    players: string | null;
    duration: string | null;
    description: string | null;
    imageUrl: string | null;
    tags: string[];
  }>
): Promise<ExerciseDTO> {
  const res = await fetch(`/api/exercises/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return json.data as ExerciseDTO;
}

/** Eliminar ejercicio */
export async function deleteExercise(id: string): Promise<void> {
  const res = await fetch(`/api/exercises/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}

/** Importar/actualizar ejercicios SOLO de una sesión */
export async function importFromSession(
  sessionId: string
): Promise<{ ok: boolean; created: number; updated: number }> {
  const res = await fetch(`/api/exercises/import/from-session/${sessionId}`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Importar/actualizar ejercicios de TODAS las sesiones (masivo) */
export async function importAllFromSessions(): Promise<{ ok: boolean; created: number; updated: number }> {
  const res = await fetch(`/api/exercises/import`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
