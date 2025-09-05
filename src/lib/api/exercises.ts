export type ExerciseDTO = {
  id: string;
  userId: string;
  title: string;
  kindId?: string | null;
  kind?: { id: string; name: string } | null;
  space?: string | null;
  players?: string | null;
  duration?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
};

export async function searchExercises(params: {
  q?: string;
  kindName?: string;            // <- por nombre
  order?: "createdAt" | "title";
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}) {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length) qs.set(k, String(v));
  });
  const r = await fetch(`/api/ct/exercises?${qs.toString()}`, { cache: "no-store" });
  if (!r.ok) throw new Error("No se pudieron cargar los ejercicios");
  return r.json() as Promise<{ data: ExerciseDTO[]; meta: { total: number; page: number; pageSize: number; pages: number } }>;
}

export async function getExercise(id: string) {
  const r = await fetch(`/api/ct/exercises/${id}`, { cache: "no-store" });
  if (!r.ok) throw new Error("No encontrado");
  return r.json() as Promise<{ data: ExerciseDTO }>;
}

export async function createExercise(payload: Partial<ExerciseDTO>) {
  const r = await fetch(`/api/ct/exercises`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("No se pudo crear");
  return r.json() as Promise<{ data: ExerciseDTO }>;
}

export async function updateExercise(id: string, payload: Partial<ExerciseDTO>) {
  const r = await fetch(`/api/ct/exercises/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("No se pudo actualizar");
  return r.json() as Promise<{ data: ExerciseDTO }>;
}

export async function deleteExercise(id: string) {
  const r = await fetch(`/api/ct/exercises/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error("No se pudo eliminar");
  return r.json() as Promise<{ ok: boolean }>;
}
