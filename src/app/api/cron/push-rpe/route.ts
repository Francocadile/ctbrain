import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { sendPushBatch } from "@/lib/push";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tokens = await prisma.deviceToken.findMany({
      where: {
        isActive: true,
      },
      select: {
        pushToken: true,
      },
    });

    if (!tokens.length) {
      return NextResponse.json({ ok: true, count: 0 });
    }

    console.log("/api/cron/push-rpe: found tokens", tokens.length);

    const { invalidTokens, successCount, failureCount } = await sendPushBatch({
      tokens: tokens.map((t) => t.pushToken),
      notification: {
        title: "OPENBASE",
        body: "OPENBASE: cargá tu RPE de hoy",
      },
      data: {
        type: "rpe",
      },
    });

    console.log(
      "/api/cron/push-rpe: sent",
      successCount,
      "ok,",
      failureCount,
      "failed, invalid:",
      invalidTokens.length,
    );

    if (invalidTokens.length) {
      await prisma.deviceToken.updateMany({
        where: {
          pushToken: { in: invalidTokens },
        },
        data: { isActive: false },
      });
    }

    return NextResponse.json({
      ok: true,
      count: tokens.length,
      successCount,
      failureCount,
      invalidTokens: invalidTokens.length,
    });
  } catch (err) {
    console.error("/api/cron/push-rpe error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
