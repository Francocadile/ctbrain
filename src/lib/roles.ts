// src/lib/roles.ts
export type Role = "ADMIN" | "CT" | "MEDICO" | "JUGADOR" | "DIRECTIVO";

export function routeForRole(role?: string) {
  const r = (role || "").toUpperCase();
  if (r === "ADMIN") return "/admin";
  if (r === "CT") return "/ct";
  if (r === "MEDICO") return "/medico";
  if (r === "JUGADOR") return "/jugador";
  if (r === "DIRECTIVO") return "/directivo";
  return "/ct"; // fallback
}
