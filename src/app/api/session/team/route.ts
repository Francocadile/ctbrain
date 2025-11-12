import { NextRequest, NextResponse } from "next/server";
import { getToken, encode } from "next-auth/jwt";
import { z } from "zod";
import prisma from "@/lib/prisma";

const SESSION_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

const bodySchema = z.object({ teamId: z.string().min(1) });

function ensureSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET no configurado.");
  return secret;
}

export async function GET(req: NextRequest) {
  const secret = ensureSecret();
  const token = await getToken({ req, secret });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await prisma.userTeam.findMany({
    where: { userId: token.sub },
    include: { team: { select: { id: true, name: true } } },
    orderBy: [{ team: { name: "asc" } }],
  });

  const teams = memberships.map((mt) => ({ id: mt.teamId, name: mt.team?.name ?? mt.teamId }));
  return NextResponse.json({ teams, currentTeamId: (token as any).currentTeamId ?? null });
}

export async function POST(req: NextRequest) {
  const secret = ensureSecret();
  const token = await getToken({ req, secret });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "teamId inválido" }, { status: 400 });

  const { teamId } = parsed.data;

  const membership = await prisma.userTeam.findFirst({
    where: { userId: token.sub, teamId },
    include: { team: { select: { id: true, name: true } } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const allTeams = await prisma.userTeam.findMany({
    where: { userId: token.sub },
    select: { teamId: true },
  });
  const teamIds = Array.from(new Set(allTeams.map((t) => t.teamId)));

  const updatedToken: Record<string, any> = { ...token, teamIds, currentTeamId: teamId };
  delete updatedToken.exp;
  delete updatedToken.iat;
  delete updatedToken.jti;

  const sessionToken = await encode({ token: updatedToken, secret, maxAge: SESSION_MAX_AGE });

  const response = NextResponse.json({
    success: true,
    currentTeamId: teamId,
    teamName: membership.team?.name ?? teamId,
  });

  response.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  response.cookies.set("ctb_team", teamId, {
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return response;
}
