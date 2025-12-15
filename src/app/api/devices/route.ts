import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions as any);
    const userId = (session as any)?.user?.id as string | undefined;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const platform = (body.platform || "").toString();
    const pushToken = (body.pushToken || "").toString();
    const deviceId = body.deviceId ? body.deviceId.toString() : null;
    const appVersion = body.appVersion ? body.appVersion.toString() : null;

    if (!platform || !pushToken) {
      return NextResponse.json(
        { error: "platform and pushToken are required" },
        { status: 400 },
      );
    }

    if (platform !== "ios" && platform !== "android") {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    // teamId es opcional: tomamos el equipo actual si existe
    const currentTeamId = (session as any)?.user?.currentTeamId as string | null;

    const data = {
      userId,
      teamId: currentTeamId || null,
      platform,
      pushToken,
      deviceId,
      appVersion,
      isActive: true,
    } as const;

    // Upsert manual por (userId, pushToken):
    // - Si ya existe un registro para ese usuario+token, lo actualizamos.
    // - Si no existe, lo creamos.
    const existing = await prisma.deviceToken.findFirst({
      where: { userId, pushToken },
      select: { id: true },
    });

    if (existing) {
      await prisma.deviceToken.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.deviceToken.create({ data });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("/api/devices DELETE error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
