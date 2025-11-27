export type ExerciseDTO = {
  id: string;
  name: string;
  zone: string | null;
  videoUrl: string | null;
  usage: "ROUTINE" | "SESSION" | null;
  createdAt: string;
};

export async function createSessionExercise(input: {
  name: string;
  zone?: string | null;
  videoUrl?: string | null;
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
