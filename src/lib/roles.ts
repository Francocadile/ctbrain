// src/lib/roles.ts
export function routeForRole(role?: string) {
  switch ((role || "").toUpperCase()) {
    case "ADMIN": return "/admin";
    case "CT": return "/ct";
    case "MEDICO": return "/medico";
    case "JUGADOR": return "/jugador";
    case "DIRECTIVO": return "/directivo";
    default: return "/login";
  }
}
