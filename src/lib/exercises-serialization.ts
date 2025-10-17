export type SessionExerciseLink = { id: string; order: number; note?: string };

type Box = { __ctb_ex__?: SessionExerciseLink[]; __ctb_text__?: string };

// Parse seguro: si no es JSON, se considera texto humano previo
function safeParseDesc(desc?: string | null): Box {
  if (!desc) return {};
  try {
    const obj = JSON.parse(desc);
    if (obj && typeof obj === "object") return obj as Box;
  } catch {
    /* texto plano */
  }
  return { __ctb_text__: String(desc) };
}

export function readExercisesFromDescription(desc?: string | null): SessionExerciseLink[] {
  const box = safeParseDesc(desc);
  return Array.isArray(box.__ctb_ex__) ? box.__ctb_ex__! : [];
}

export function writeExercisesToDescription(
  prevDesc: string | null | undefined,
  items: SessionExerciseLink[]
): string {
  const box = safeParseDesc(prevDesc);
  const next: Box = {
    __ctb_text__: box.__ctb_text__,
    __ctb_ex__: items.map((it, i) => ({
      id: it.id,
      order: typeof it.order === "number" ? it.order : i,
      note: it.note ?? "",
    })),
  };
  return JSON.stringify(next);
}
