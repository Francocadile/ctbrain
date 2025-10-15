/**
 * Mapea roles equivalentes entre appRole y teamRole.
 * Ejemplo: CT <-> COACH, JUGADOR <-> ATHLETE
 */
export function normalizeRole(role: string): string {
  if (role === "CT") return "COACH";
  if (role === "COACH") return "CT";
  if (role === "JUGADOR") return "ATHLETE";
  if (role === "ATHLETE") return "JUGADOR";
  return role;
}

/**
 * Verifica si el usuario tiene alguno de los roles indicados (solo strings).
 * Compara contra session.user.role (appRole) y session.user.teamRole (teamRole).
 * Usa normalizeRole para equivalencias.
 */
export function hasAnyRoleStrings(session: any, roles: string[]): boolean {
  const appRole = session?.user?.role;
  const teamRole = session?.user?.teamRole;

  return roles.some((r) => {
    return (
      appRole === r ||
      teamRole === r ||
      appRole === normalizeRole(r) ||
      teamRole === normalizeRole(r)
    );
  });
}
