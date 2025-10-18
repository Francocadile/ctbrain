export type AppRole = "SUPERADMIN" | "ADMIN" | "CT" | "MEDICO" | "JUGADOR" | "DIRECTIVO";

export function requireAdmin(role?: string) {
  return role === "ADMIN" || role === "SUPERADMIN";
}

export function requireSuperadmin(role?: string) {
  return role === "SUPERADMIN";
}
