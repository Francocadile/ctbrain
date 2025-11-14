import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

function getSessionTeamId(session: Session | null | undefined): string | null {
  const userAny = session?.user as any;
  if (!userAny) return null;
  if (typeof userAny.currentTeamId === "string" && userAny.currentTeamId.trim().length > 0) {
    return userAny.currentTeamId;
  }
  if (Array.isArray(userAny.teamIds) && userAny.teamIds.length > 0) {
    return userAny.teamIds[0];
  }
  if (typeof userAny.teamId === "string" && userAny.teamId.trim().length > 0) {
    return userAny.teamId;
  }
  return null;
}

const allowedRoles = new Set<Role | string>([
  Role.SUPERADMIN,
  Role.ADMIN,
  Role.CT,
  Role.MEDICO,
  Role.DIRECTIVO,
]);

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const role = session.user.role as Role | undefined;
  if (!role || !allowedRoles.has(role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const requestedTeamId = req.nextUrl.searchParams.get("teamId");
  const sessionTeamId = getSessionTeamId(session);

  let where: Record<string, unknown> | undefined;
  if (role === Role.SUPERADMIN) {
    // SUPERADMIN can see every user; ignore team filters.
    where = undefined;
  } else {
    if (!sessionTeamId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    if (requestedTeamId && requestedTeamId !== sessionTeamId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    where = {
      teams: {
        some: { teamId: sessionTeamId },
      },
    };
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: [{ isApproved: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isApproved: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ users });
}
