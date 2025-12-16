import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const secretHeader = req.headers.get("x-device-bootstrap-secret") || "";
    const expected = process.env.DEVICE_BOOTSTRAP_SECRET || "";

    if (!expected || secretHeader !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({} as any));
    const platform = (body.platform || "").toString();
    const token = (body.token || "").toString();

    if (!platform || !token) {
      return NextResponse.json(
        { error: "platform and token are required" },
        { status: 400 },
      );
    }

    if (platform !== "ios" && platform !== "android") {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    // Upsert manual por pushToken (sin userId porque todavía no hay sesión)
    const existing = await prisma.deviceToken.findFirst({
      where: { pushToken: token },
      select: { id: true },
    });

    if (existing) {
      await prisma.deviceToken.update({
        where: { id: existing.id },
        data: {
          // explicit undefined to avoid touching userId in update
          teamId: null,
          platform,
          pushToken: token,
          deviceId: null,
          appVersion: null,
          isActive: true,
        },
      });
    } else {
      await prisma.deviceToken.create({
        data: {
          userId: undefined,
          teamId: null,
          platform,
          pushToken: token,
          deviceId: null,
          appVersion: null,
          isActive: true,
        } as any,
      });
    }

    return NextResponse.json({ ok: true, saved: true });
  } catch (err) {
    console.error("/api/devices/bootstrap POST error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
