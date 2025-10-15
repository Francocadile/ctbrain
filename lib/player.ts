// src/lib/player.ts
"use client";

/**
 * Utilidades del área Jugador.
 * Prioriza el nombre desde la sesión (NextAuth) para que el jugador
 * no tenga que escribirlo. Se mantienen helpers de localStorage por compat.
 */

const KEY = "playerName";

/* ===== Compat localStorage (legacy) ===== */
export function getPlayerName(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(KEY) || "";
}

export function setPlayerName(name: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, (name || "").trim());
}

export function clearPlayerName() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

/* ===== Sesión NextAuth ===== */
export type SessionUser = {
  id: string;
  name: string | null;
  email?: string | null;
};

/** Lee la sesión actual desde NextAuth (solo en cliente). */
export async function fetchSessionUser(): Promise<SessionUser | null> {
  if (typeof window === "undefined") return null; // evita SSR
  try {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    const u = json?.user;
    if (!u) return null;
    const id = (u.id || json?.sub || "") as string;
    if (!id) return null;
    return { id, name: u.name ?? null, email: u.email ?? null };
  } catch {
    return null;
  }
}

/** Identidad visible del jugador (name || email) desde la sesión. */
export async function getPlayerIdentity(): Promise<string> {
  const u = await fetchSessionUser();
  return (u?.name || u?.email || "").trim();
}

/** (opcional) solo name desde sesión. */
export async function getPlayerDisplayName(): Promise<string> {
  const u = await fetchSessionUser();
  return (u?.name || "").trim();
}
