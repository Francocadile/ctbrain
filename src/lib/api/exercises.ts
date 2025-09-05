// src/lib/api/exercises.ts
export type ExerciseDTO = {
  id: string;
  title: string;
  description: string | null;
  space: string | null;
  players: string | null;
  duration: string | null;
  imageUrl: string | null;
  tags: string[];
  createdAt: string;
  kind?: { id: string; name: string } | null;
};

export type SearchParams = {
  q?: string;
  kind?: string;
  order?: "createdAt" | "title";
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  userId?: string;
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...(init || {}) });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export async function searchExercises(params: SearchParams) {
  const u = new URL("/api/exercises", typeof window === "undefined" ? "http://localhost" : window.location.origin);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    u.searchParams.set(k, String(v));
  });
  return api<{ data: ExerciseDTO[]; meta: { total: number; page: number; pageSize: number; pages: number } }>(u.toString());
}

export async function deleteExercise(id: string) {
  return api<{ ok: true }>(`/api/exercises/${id}`, { method: "DELETE" });
}

export async function importAllFromSessions() {
  return api<{ ok: boolean; created: number }>(`/api/exercises/import`, { method: "POST" });
}

export async function importFromSession(id: string) {
  return api<{ ok: boolean; created: number }>(`/api/exercises/import/from-session/${id}`, { method: "POST" });
}
