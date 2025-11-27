// src/lib/api/exercises.ts

export type SessionMeta = {
  type?: string | null;
  space?: string | null;
  players?: number | null;
  duration?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  sessionId?: string | null;
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
  const res = await fetch("/api/ct/exercises", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
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
  input: { name?: string; zone?: string | null; videoUrl?: string | null },
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
