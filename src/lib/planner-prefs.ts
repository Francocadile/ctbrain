// src/lib/planner-prefs.ts
export type RowLabels = Record<string, string>;

type GetResp = {
  rowLabels: RowLabels | null;
  places: string[];
};

export async function fetchPrefs(): Promise<GetResp> {
  const r = await fetch("/api/planner/labels", { cache: "no-store" });
  if (!r.ok) throw new Error("No se pudo cargar preferencias");
  const j = (await r.json()) as GetResp;
  return {
    rowLabels: j.rowLabels || {},
    places: j.places || [],
  };
}

export async function fetchRowLabels(): Promise<RowLabels> {
  const { rowLabels } = await fetchPrefs();
  return rowLabels || {};
}

export async function saveRowLabels(labels: RowLabels): Promise<void> {
  const r = await fetch("/api/planner/labels", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rowLabels: labels }),
  });
  if (!r.ok) throw new Error("No se pudieron guardar los nombres");
}

export async function resetRowLabels(): Promise<void> {
  const r = await fetch("/api/planner/labels?target=labels", { method: "DELETE" });
  if (!r.ok) throw new Error("No se pudo resetear");
}

export async function fetchPlaces(): Promise<string[]> {
  const { places } = await fetchPrefs();
  return places || [];
}

export async function savePlaces(list: string[]): Promise<void> {
  const r = await fetch("/api/planner/labels", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ places: list }),
  });
  if (!r.ok) throw new Error("No se pudo guardar los lugares");
}

export async function clearPlaces(): Promise<void> {
  const r = await fetch("/api/planner/labels?target=places", { method: "DELETE" });
  if (!r.ok) throw new Error("No se pudo vaciar la lista");
}
