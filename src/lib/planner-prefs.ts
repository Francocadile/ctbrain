export type RowLabels = Record<string, string>;

export async function fetchRowLabels(): Promise<RowLabels> {
  try {
    const res = await fetch("/api/planner/labels", { cache: "no-store" });
    if (!res.ok) throw new Error("Fail");
    const data = await res.json();
    return (data?.rowLabels ?? {}) as RowLabels;
  } catch {
    return {};
  }
}

export async function saveRowLabels(rowLabels: RowLabels) {
  const res = await fetch("/api/planner/labels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rowLabels }),
  });
  if (!res.ok) throw new Error("No se pudo guardar");
}

export async function resetRowLabels() {
  const res = await fetch("/api/planner/labels", { method: "DELETE" });
  if (!res.ok) throw new Error("No se pudo resetear");
}
