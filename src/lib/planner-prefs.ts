export type RowLabels = Record<string, string>;

// ---- Row labels (por usuario)
export async function fetchRowLabels(): Promise<RowLabels> {
  const r = await fetch("/api/planner/labels", { cache: "no-store" });
  if (!r.ok) throw new Error("fetch rowLabels failed");
  const j = await r.json();
  return j.rowLabels || {};
}

export async function saveRowLabels(labels: RowLabels): Promise<void> {
  const r = await fetch("/api/planner/labels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rowLabels: labels }),
  });
  if (!r.ok) throw new Error("save rowLabels failed");
}

export async function resetRowLabels(): Promise<void> {
  const r = await fetch("/api/planner/labels", { method: "DELETE" });
  if (!r.ok) throw new Error("reset rowLabels failed");
}

// ---- Lugares (global con tabla Place)
export async function fetchPlaces(): Promise<string[]> {
  const r = await fetch("/api/planner/labels", { cache: "no-store" });
  if (!r.ok) return [];
  const j = await r.json();
  return j.places || [];
}

/** Guarda TODOS los lugares. Recibe el textarea (1 por línea). */
export async function savePlacesFromTextarea(text: string): Promise<string[]> {
  const names = text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const r = await fetch("/api/planner/labels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ places: names }),
  });
  if (!r.ok) throw new Error("save places failed");

  const j = await r.json();
  window.dispatchEvent(new Event("planner-places-updated"));
  return j.places || [];
}

export async function clearPlaces(): Promise<void> {
  await savePlacesFromTextarea("");
}
