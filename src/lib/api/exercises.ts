// src/lib/api/exercises.ts
export type KindDTO = { id: string; name: string };

export type ExerciseDTO = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  space: string | null;
  players: string | null;
  duration: string | null;
  imageUrl: string | null;
  tags: string[];
  kindId: string | null;
  kind?: KindDTO | null;
  createdAt: string;
  updatedAt: string;
};

export type SearchParams = {
  q?: string;
  /** filtrar por nombre del tipo (útil cuando no tenés IDs) */
  kind?: string;
  /** filtrar por id del tipo (si trabajás con ExerciseKind en DB) */
  kindId?: string;
  order?: "createdAt" | "title";
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

function buildQuery(p: SearchParams = {}) {
  const usp = new URLSearchParams();
  if (p.q) usp.set("q", p.q);
  if (p.kind) usp.set("kind", p.kind);
  if (p.kindId) usp.set("kindId", p.kindId);
  usp.set("order", p.order || "createdAt");
  usp.set("dir", p.dir || "desc");
  usp.set("page", String(p.page || 1));
  usp.set("pageSize", String(p.pageSize || 20));
  return usp.toString();
}

export async function searchExercises(params: SearchParams) {
  const qs = buildQuery(params);
  const res = await fetch(`/api/exercises?${qs}`, { cache: "no-store" as RequestCache });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "No se pudo buscar ejercicios");
  return json as { data: ExerciseDTO[]; meta: { total: number; page: number; pageSize: number; pages: number } };
}

export async function getExerciseById(id: string) {
  const res = await fetch(`/api/exercises/${id}`, { cache: "no-store" as RequestCache });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "No se pudo obtener el ejercicio");
  return json as { data: ExerciseDTO };
}

export async function createExercise(
  payload: Partial<ExerciseDTO> & { title: string }
) {
  const res = await fetch(`/api/exercises`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "No se pudo crear");
  return json as { data: ExerciseDTO };
}

export async function updateExercise(
  id: string,
  payload: Partial<ExerciseDTO>
) {
  const res = await fetch(`/api/exercises/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "No se pudo actualizar");
  return json as { data: ExerciseDTO };
}

export async function deleteExercise(id: string) {
  const res = await fetch(`/api/exercises/${id}`, { method: "DELETE" });
  if (!res.ok) {
    let msg = "No se pudo eliminar";
    try {
      const j = await res.json();
      msg = j?.error || msg;
    } catch {}
    throw new Error(msg);
  }
  return true;
}
