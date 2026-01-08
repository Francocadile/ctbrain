// src/lib/sessions/sessionContent.ts
// Documento estructurado de sesión (fuente nueva), compatible con formato legacy

import type { Exercise as LegacyExercise } from "@/lib/sessions/encodeDecodeExercises";

export type ExerciseBlock = LegacyExercise;

export type SessionBlock =
  | { type: "text"; text: string }
  | { type: "exercise"; exercise: ExerciseBlock };

export type SessionDocument = {
  version: 1;
  blocks: SessionBlock[];
};

// Convierte prefix + exercises (legacy) a documento estructurado
export function legacyToDocument(prefix: string, exercises: LegacyExercise[]): SessionDocument {
  const blocks: SessionBlock[] = [];

  const trimmedPrefix = (prefix || "").trimEnd();
  if (trimmedPrefix) {
    blocks.push({ type: "text", text: trimmedPrefix });
  }

  for (const ex of exercises || []) {
    blocks.push({ type: "exercise", exercise: { ...ex } });
  }

  return { version: 1, blocks };
}

// Convierte un documento estructurado a la vista legacy (prefix + exercises)
export function documentToLegacy(doc: SessionDocument | null | undefined): {
  prefix: string;
  exercises: LegacyExercise[];
} {
  if (!doc || !Array.isArray(doc.blocks)) {
    return { prefix: "", exercises: [] };
  }

  let prefix = "";
  const exercises: LegacyExercise[] = [];

  for (const block of doc.blocks) {
    if (block.type === "text" && !prefix) {
      prefix = block.text || "";
    }
    if (block.type === "exercise") {
      exercises.push({ ...block.exercise });
    }
  }

  return { prefix, exercises };
}
