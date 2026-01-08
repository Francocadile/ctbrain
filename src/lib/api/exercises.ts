// src/lib/api/exercises.ts

import type { FieldDiagramState } from "@/lib/sessions/fieldDiagram";

export type SessionMeta = {
  type?: string | null;
  space?: string | null;
  players?: number | string | null;
  duration?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  sessionId?: string | null;
  routineId?: string | null;
  routineName?: string | null;
  diagram?: FieldDiagramState | null;
};

export type ExerciseDTO = {
  id: string;
  name: string;
  zone: string | null;
  videoUrl: string | null;
  usage: "ROUTINE" | "SESSION" | null;
  createdAt: string;
  originSessionId?: string | null;
  sessionMeta?: SessionMeta | null;
};

// Crea un ejercicio de SESIÓN (campo) desde el editor de sesiones
export async function createSessionExercise(input: {
  name: string;
  zone?: string | null;
  videoUrl?: string | null;
  originSessionId: string;
  sessionMeta?: SessionMeta | null;
}): Promise<ExerciseDTO> {
  const { originSessionId, sessionMeta, ...rest } = input;

  const sessionId = originSessionId;

  const enrichedSessionMeta: SessionMeta | null = {
    ...(sessionMeta || {}),
    sessionId: sessionId,
  };

  const res = await fetch("/api/ct/exercises", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...rest,
      originSessionId: sessionId,
      sessionMeta: enrichedSessionMeta,
      usage: "SESSION",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "No se pudo crear el ejercicio de sesión");
  }

  const json = (await res.json()) as { data: ExerciseDTO };
  return json.data;
}

// Actualiza un ejercicio de SESIÓN en la biblioteca
export async function updateSessionExercise(
  id: string,
  input: {
    name?: string;
    zone?: string | null;
    videoUrl?: string | null;
    originSessionId?: string | null;
    sessionMeta?: SessionMeta | null;
  },
): Promise<ExerciseDTO> {
  const res = await fetch(`/api/ct/exercises/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "No se pudo actualizar el ejercicio");
  }

  const json = (await res.json()) as { data: ExerciseDTO };
  return json.data;
}

// Elimina un ejercicio de SESIÓN de la biblioteca
export async function deleteSessionExercise(id: string): Promise<void> {
  const res = await fetch(`/api/ct/exercises/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "No se pudo eliminar el ejercicio");
  }
}

// Crea o actualiza una PLANTILLA de ejercicio de sesión (usage SESSION, originSessionId null)
export async function saveSessionExerciseTemplate(input: {
  id?: string;
  name: string;
  zone?: string | null;
  videoUrl?: string | null;
  sessionMeta?: SessionMeta | null;
}): Promise<ExerciseDTO> {
  const baseName = (input.name || "Ejercicio sin título").trim();
  let finalName = baseName || "Ejercicio sin título";

  // Si es actualización, vamos directo al PUT
  if (input.id) {
    const res = await fetch(`/api/ct/exercises/${input.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: finalName,
        zone: input.zone ?? null,
        videoUrl: input.videoUrl ?? null,
        originSessionId: null,
        sessionMeta: input.sessionMeta ?? null,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "No se pudo guardar la plantilla");
    }

    const json = (await res.json()) as { data: ExerciseDTO };
    return json.data;
  }

  // Crear: garantizamos nombre único dentro de usage=SESSION del equipo
  try {
    const resList = await fetch("/api/ct/exercises?usage=SESSION", {
      cache: "no-store",
    });
    if (resList.ok) {
      const jsonList = await resList.json();
      const list = Array.isArray((jsonList as any)?.data)
        ? (jsonList as any).data
        : jsonList;
      const arr: ExerciseDTO[] = Array.isArray(list) ? list : [];

      const existingNames = new Set(
        arr.map((e) => (e.name || "").trim()).filter((n) => !!n),
      );

      if (existingNames.has(finalName)) {
        let i = 2;
        while (existingNames.has(`${finalName} (${i})`)) {
          i += 1;
        }
        finalName = `${finalName} (${i})`;
      }
    }
  } catch {
    // Si falla el listado, seguimos igual: el backend permitirá duplicados
  }

  const res = await fetch("/api/ct/exercises", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: finalName,
      zone: input.zone ?? null,
      videoUrl: input.videoUrl ?? null,
      usage: "SESSION",
      originSessionId: null,
      sessionMeta: input.sessionMeta ?? null,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "No se pudo crear la plantilla");
  }

  const json = (await res.json()) as { data: ExerciseDTO };
  return json.data;
}
