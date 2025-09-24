// src/lib/roles.ts
export function routeForRole(role?: string) {
  switch ((role || "").toLowerCase()) {
    case "admin":
      return "/admin";
    case "ct":
    case "cuerpo_tecnico":
      return "/ct";
    case "medico":
      return "/medico";
    case "jugador":
      return "/jugador";
    case "directivo":
      return "/directivo";
    default:
      return "/ct";
  }
}
