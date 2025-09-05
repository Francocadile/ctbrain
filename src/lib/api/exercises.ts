export type ExerciseKindDTO = { id: string; name: string };
export type ExerciseDTO = {
  id: string;
  userId: string;
  title: string;
  kindId: string | null;
  kind?: ExerciseKindDTO | null;
  space: string | null;
  players: string | null;
  duration: string | null;
  description: string | null;
  imageUrl: string | null;
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
};

export type SearchParams = {
  q?: string;
  kindId?: string;   // filtro por id
  kind?: string;     // o por nombre
  order?: "createdAt" | "title";
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export async function searchExercises(params: SearchParams) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.kindId) qs.set("kindId", params.kindId);
  if (params.kind) qs.set("kind", params.kind);
  qs.set("order", params.order || "createdAt");
  qs.set("dir", params.dir || "desc");
  qs.set("page", String(params.page || 1));
  qs.set("pageSize", String(params.pageSize || 20));

  const res = await fetch(`/api/exercises?${qs.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("searchExercises failed");
  return (await res.json()) as { data: ExerciseDTO[]; meta: { total: number; page: number; pageSize: number; pages: number } };
}

export async function getExercise(id: string) {
  const res = await fetch(`/api/exercises/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("getExercise failed");
  return (await res.json()) as { data: ExerciseDTO };
}

export async function createExercise(input: Partial<ExerciseDTO>) {
  const res = await fetch(`/api/exercises`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("createExercise failed");
  return (await res.json()) as { data: ExerciseDTO };
}

export async function updateExercise(id: string, input: Partial<ExerciseDTO>) {
  const res = await fetch(`/api/exercises/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("updateExercise failed");
  return (await res.json()) as { data: ExerciseDTO };
}

export async function deleteExercise(id: string) {
  const res = await fetch(`/api/exercises/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("deleteExercise failed");
  return (await res.json()) as { ok: boolean };
}

// NEW: importar los ejercicios embebidos en sesiones del usuario
export async function importFromSessions() {
  const res = await fetch(`/api/exercises/import`, { method: "POST" });
  if (!res.ok) throw new Error("import failed");
  return (await res.json()) as { ok: true; imported: number; scanned: number };
}
