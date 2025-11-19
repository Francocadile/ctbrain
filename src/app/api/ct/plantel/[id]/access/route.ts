import { NextResponse } from "next/server";
import { dbScope, scopedWhere } from "@/lib/dbScope";
import { Role, TeamRole } from "@prisma/client";
import { hash } from "bcryptjs";

function randomPassword(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let pwd = "";
  for (let i = 0; i < length; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
  const { prisma, team } = await dbScope({ req });
    const body = await req.json();
    const email = (body?.email ?? "").trim().toLowerCase();
    const generatePassword: boolean = body?.generatePassword ?? true;

    if (!email) {
      return NextResponse.json({ error: "email requerido" }, { status: 400 });
    }

    const player = await (prisma as any).player.findFirst({
      where: scopedWhere(team.id, { id: params.id }) as any,
    });

    if (!player) {
      return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 });
    }

    let user = player.userId
      ? await prisma.user.findUnique({ where: { id: player.userId } })
      : await prisma.user.findUnique({ where: { email } });

    let passwordPlain: string | null = null;

    if (!user) {
      passwordPlain = generatePassword ? randomPassword(10) : null;
      const passwordHash = passwordPlain ? await hash(passwordPlain, 10) : null;

      user = await prisma.user.create({
        data: {
          email,
          name: player.name,
          role: Role.JUGADOR,
          passwordHash,
        },
      });
    }

    const existingLink = await prisma.userTeam.findFirst({
      where: {
        userId: user.id,
        teamId: team.id,
      },
    });

    if (!existingLink) {
      await prisma.userTeam.create({
        data: {
          userId: user.id,
          teamId: team.id,
          role: TeamRole.JUGADOR,
        },
      });
    }

    if (!player.userId) {
  await (prisma as any).player.update({
        where: { id: player.id },
        data: { userId: user.id },
      });
    }

    return NextResponse.json({ ok: true, password: passwordPlain ?? undefined });
  } catch (err: any) {
    console.error("ct plantel access error", err);
    return NextResponse.json({ error: err?.message ?? "Error" }, { status: 500 });
  }
}
