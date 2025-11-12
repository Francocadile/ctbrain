import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCurrentTeamId } from "@/lib/sessionScope";

export async function requireTeamIdFromRequest(req: Request | NextRequest): Promise<string> {
  const headerTeam = req.headers.get("x-team")?.trim();
  if (headerTeam) return headerTeam;

  const session = await getServerSession(authOptions);
  const teamId = getCurrentTeamId(session);
  if (teamId) return teamId;

  const err = new Error("Team selection required");
  (err as any).status = 428;
  throw err;
}
