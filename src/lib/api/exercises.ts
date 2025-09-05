// src/lib/api/exercises.ts
export type ExerciseDTO = {
  id: string;               // sessionId::index
  sessionId: string;
  title: string;
  createdAt: string;
  kind?: { name: string } | null;
  space?: string | null;
  players?: string | null;
  duration?: string | null;
  description?: string | null;
  imageUrl?: string | null;
};

type SearchParams = {
  q?: string;
  kindName?: string;
  order?: "createdAt" | "title";
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export async function searchExercises(params: SearchParams) {
  const usp = new URLSearchParams();
  if (params.q) usp.set("q", params.q);
  if (params.kindName) usp.set("kindName", params.kindName);
  if (params.order) usp.set("order", params.order);
  if (params.dir) usp.set("dir", params.dir);
  if (params.page) usp.set("page", String(params.page));
  if (params.pageSize) usp.set("pageSize", String(params.pageSize));
  const res = await fetch(`/api/ct/exercises?${usp.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { data: ExerciseDTO[]; meta: { total: number; page: number; pageSize: number } };
}

export async function getExercise(id: string): Promise<ExerciseDTO> {
  const res = await fetch(`/api/ct/exercises/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as ExerciseDTO;
}

export async function updateExercise(id: string, patch: Partial<ExerciseDTO>) {
  const res = await fetch(`/api/ct/exercises/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { ok: true };
}

export async function deleteExercise(id: string) {
  const res = await fetch(`/api/ct/exercises/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { ok: true };
}
