// src/lib/api/sessions.ts
export type SessionDTO = {
  id: string;
  title: string | null;
  description: string | null;
  date: string;
  type: "GENERAL" | "FUERZA" | "TACTICA" | "AEROBICO" | "RECUPERACION";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  user?: { id: string; name: string | null; email: string | null; role: string | null } | null;
};

// ...tus funciones existentes (getSessionsWeek, createSession, updateSession, deleteSession, etc.)

export async function getSessionById(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/sessions/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("No se pudo obtener la sesión");
  return res.json();
}
