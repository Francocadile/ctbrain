// src/lib/player.ts
// Utilidades para el área Jugador (sin prompt).

export type SessionUser = {
  id: string;
  name: string | null;
  email?: string | null;
};

// Lee la sesión actual desde NextAuth (vía API)
export async function fetchSessionUser(): Promise<SessionUser | null> {
  try {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    const u = json?.user;
    if (!u) return null;
    // En algunos providers el id viene como sub o id; cubrimos ambos casos
    const id = u.id || json?.sub || "";
    if (!id) return null;
    return { id, name: u.name ?? null, email: u.email ?? null };
  } catch {
    return null;
  }
}

/**
 * Nombre visible del jugador.
 * - Preferimos el de sesión (user.name).
 * - Si no hay sesión o name es null, devolvemos cadena vacía (NO pedimos por prompt).
 */
export async function getPlayerDisplayName(): Promise<string> {
  const u = await fetchSessionUser();
  return (u?.name || "").trim();
}
