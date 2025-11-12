import type { Session } from "next-auth";

export function getCurrentTeamId(session: Session | null | undefined): string | null {
  const teamId = session?.user?.currentTeamId;
  return typeof teamId === "string" && teamId.trim().length > 0 ? teamId : null;
}

export function ensureTeamId(session: Session | null | undefined): string {
  const teamId = getCurrentTeamId(session);
  if (!teamId) throw new Error("Current team is required but missing from session.");
  return teamId;
}
