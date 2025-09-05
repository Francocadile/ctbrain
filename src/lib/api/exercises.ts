export type Dir = "asc" | "desc";
export type Order = "createdAt" | "title";

export type ExerciseDTO = {
  id: string;
  title: string;
  description: string | null;
  space: string | null;
  players: string | null;
  duration: string | null;
  imageUrl: string | null;
  tags: string[];
  createdAt: string | Date;
  kind?: { id?: string; name?: string } | null;
  sourceSessionId?: string | null;
};

type SearchParams = {
  q?: string;
  kindId?: string;
  order?: Order;
  dir?: Dir;
  page?: number;
  pageSize?: number;
};

export async function searchExercises(params: SearchParams) {
  const url = new URL("/api/exercises", window.location.origin);
  if (params.q) url.searchParams.set("q", params.q);
  if (params.kindId) url.searchParams.set("kindId", params.kindId);
  if (params.order) url.searchParams.set("order", params.order);
  if (params.dir) url.searchParams.set("dir", params.dir);
  if (params.page) url.searchParams.set("page", String(params.page));
  if (params.pageSize) url.searchParams.set("pageSize", String(params.pageSize));
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error("searchExercises error");
  return (await res.json()) as {
    data: ExerciseDTO[];
    meta: { total: number; page: number; pageSize: number; pages: number };
  };
}

export async function deleteExercise(id: string) {
  const res = await fetch(`/api/exercises/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("deleteExercise error");
  return (await res.json()) as { ok: boolean };
}

export async function importAllFromSessions() {
  const res = await fetch("/api/exercises/import", { method: "POST" });
  if (!res.ok) throw new Error("importAllFromSessions error");
  return (await res.json()) as { ok: true; created: number; updated: number };
}

// ✅ usado por /ct/sessions/[id] (algunos archivos de tu repo lo esperan)
export async function importFromSession(sessionId: string) {
  const res = await fetch(`/api/exercises/import?sessionId=${encodeURIComponent(sessionId)}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("importFromSession error");
  return (await res.json()) as { ok: true; created: number; updated: number };
}
