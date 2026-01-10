// src/lib/sessions/encodeDecodeExercises.ts

import type { FieldDiagramState } from "./fieldDiagram";

export type Exercise = {
  title: string;
  kind: string;
  space: string;
  players: string;
  duration: string;
  description: string;
  imageUrl: string;
  videoUrl?: string;
  material?: string;
  diagram?: FieldDiagramState;
  routineId?: string;
  routineName?: string;
  isRoutineOnly?: boolean;
  libraryExerciseId?: string;
};

const EX_TAG = "[EXERCISES]";

/**
 * Helpers base64 que funcionan tanto en browser como en Node (server).
 */
function toBase64(str: string): string {
  // Node / server
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "utf8").toString("base64");
  }
  // Browser
  if (typeof btoa !== "undefined") {
    // encodeURIComponent para soportar unicode
    // eslint-disable-next-line no-undef
    return btoa(unescape(encodeURIComponent(str)));
  }
  throw new Error("No base64 encoder available");
}

function fromBase64(b64: string): string {
  // Node / server
  if (typeof Buffer !== "undefined") {
    return Buffer.from(b64, "base64").toString("utf8");
  }
  // Browser
  if (typeof atob !== "undefined") {
    // eslint-disable-next-line no-undef
    const decoded = atob(b64);
    try {
      // Intento revertir el unescape/encodeURIComponent
      // eslint-disable-next-line no-undef
      return decodeURIComponent(escape(decoded));
    } catch {
      return decoded;
    }
  }
  throw new Error("No base64 decoder available");
}

function encodeB64Json(value: unknown): string {
  const json = JSON.stringify(value ?? []);
  return toBase64(json);
}

function decodeB64Json<T = unknown>(b64: string): T {
  const json = fromBase64(b64);
  return JSON.parse(json) as T;
}

/**
 * Extrae ejercicios embebidos desde Session.description.
 * Devuelve el texto "prefix" (lo que ve el jugador) y el array de ejercicios.
 */
export function decodeExercises(
  desc: string | null | undefined
): { prefix: string; exercises: Exercise[] } {
  const text = (desc || "").trimEnd();
  if (!text) return { prefix: "", exercises: [] };

  const idx = text.lastIndexOf(EX_TAG);
  if (idx === -1) {
    return { prefix: text, exercises: [] };
  }

  const prefix = text.slice(0, idx).trimEnd();
  const rest = text.slice(idx + EX_TAG.length).trim();
  const b64 = rest.split(/\s+/)[0] || "";

  if (!b64) {
    return { prefix, exercises: [] };
  }

  try {
    const raw = decodeB64Json<Partial<Exercise>[]>(b64);
    if (!Array.isArray(raw)) {
      return { prefix, exercises: [] };
    }

    const exercises: Exercise[] = raw.map((e) => ({
      title: e.title ?? "",
      kind: e.kind ?? "",
      space: e.space ?? "",
      players: e.players ?? "",
      duration: e.duration ?? "",
      description: e.description ?? "",
      imageUrl: e.imageUrl ?? "",
      videoUrl: (e as any)?.videoUrl ?? "",
      material: (e as any)?.material ?? "",
      diagram: (e as any)?.diagram,
      routineId: (e as any)?.routineId ?? "",
      routineName: (e as any)?.routineName ?? "",
      isRoutineOnly: (e as any)?.isRoutineOnly ?? false,
      libraryExerciseId: (e as any)?.libraryExerciseId ?? "",
    }));

    return { prefix, exercises };
  } catch (err) {
    console.error("decodeExercises: failed to parse exercises", err);
    // En caso de error, devolvemos solo el texto para no romper el server.
    return { prefix: text, exercises: [] };
  }
}

/**
 * Embebe los ejercicios al final del texto (lo que ya hace CT).
 */
export function encodeExercises(prefix: string, exercises: Exercise[]): string {
  const safePrefix = (prefix || "").trimEnd();
  if (!exercises || !exercises.length) {
    // Si no hay ejercicios, no agregamos el tag.
    return safePrefix;
  }

  const b64 = encodeB64Json(exercises);
  return `${safePrefix}\n\n${EX_TAG} ${b64}`;
}
