// src/lib/player.ts
"use client";

/**
 * Utilidades del área Jugador basadas en localStorage.
 * Estas funciones son sync y seguras en Cliente.
 */

const KEY = "playerName";

/** Devuelve el nombre guardado del jugador (string vacío si no hay). */
export function getPlayerName(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(KEY) || "";
}

/** Guarda/actualiza el nombre del jugador. */
export function setPlayerName(name: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, (name || "").trim());
}

/** Elimina el nombre del jugador. */
export function clearPlayerName() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

/**
 * (Opcional) Acceso a la sesión NextAuth desde el cliente.
 * Lo dejamos disponible por si lo necesitás en otras vistas.
 */
export type SessionUser = {
  id: string;
  name: string | null;
  email?: string | null;
};

export async function fetchSessionUser(): Promise<SessionUser | null> {
  try {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    const u = json?.user;
    if (!u) return null;
    const id = u.id || json?.sub || "";
    if (!id) return null;
    return { id, name: u.name ?? null, email: u.email ?? null };
  } catch {
    return null;
  }
}

/** Nombre visible del jugador desde sesión (string vacío si no hay). */
export async function getPlayerDisplayName(): Promise<string> {
  const u = await fetchSessionUser();
  return (u?.name || "").trim();
}
