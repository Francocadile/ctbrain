// Exercise type is defined locally in the CT session editor page.
// We re-declare the shape here to avoid importing from a client component.
export type Exercise = {
  title: string;
  kind: string;
  space: string;
  players: string;
  duration: string;
  description: string;
  imageUrl: string;
  routineId?: string;
  routineName?: string;
  isRoutineOnly?: boolean;
};

/* =========================
   Base64 helpers (Unicode-safe)
   ========================= */
function encodeB64Json(value: unknown) {
  const json = JSON.stringify(value);
  try {
    // Navegador: unicode-safe
    // encodeURIComponent -> escape -> btoa
    // (catch por si el ambiente no soporta escape/unescape)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return btoa(unescape(encodeURIComponent(json)));
  } catch {
    return btoa(json);
  }
}

function decodeB64Json<T = any>(b64: string): T {
  try {
    // Navegador: unicode-safe
    // atob -> unescape-reverse -> decodeURIComponent -> JSON.parse
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const s = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(s) as T;
  } catch {
    const s = atob(b64);
    return JSON.parse(s) as T;
  }
}

const EX_TAG = "[EXERCISES]";

export function decodeExercises(
  desc: string | null | undefined
): { prefix: string; exercises: Exercise[] } {
  const text = (desc || "").trimEnd();
  const idx = text.lastIndexOf(EX_TAG);
  if (idx === -1) return { prefix: text, exercises: [] };
  const prefix = text.slice(0, idx).trimEnd();
  const rest = text.slice(idx + EX_TAG.length).trim();
  const b64 = rest.split(/\s+/)[0] || "";
  try {
    const arr = decodeB64Json<Partial<Exercise>[]>(b64);
    if (Array.isArray(arr)) {
      const fixed = arr.map((e) => ({
        title: e.title ?? "",
        kind: e.kind ?? "",
        space: e.space ?? "",
        players: e.players ?? "",
        duration: e.duration ?? "",
        description: e.description ?? "",
        imageUrl: e.imageUrl ?? "",
        routineId: (e as any).routineId ?? "",
        routineName: (e as any).routineName ?? "",
        isRoutineOnly: (e as any).isRoutineOnly ?? false,
      }));
      return { prefix, exercises: fixed as Exercise[] };
    }
  } catch {}
  return { prefix: text, exercises: [] };
}

export function encodeExercises(prefix: string, exercises: Exercise[]) {
  const b64 = encodeB64Json(exercises);
  const safePrefix = (prefix || "").trimEnd();
  return `${safePrefix}\n\n${EX_TAG} ${b64}`;
}
