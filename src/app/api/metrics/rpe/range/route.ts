// src/app/api/metrics/rpe/range/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start"); // YYYY-MM-DD inclusive
  const end = searchParams.get("end");     // YYYY-MM-DD inclusive
  const player = searchParams.get("player"); // opcional

  if (!start || !end) return bad("Parámetros requeridos: start, end (YYYY-MM-DD)");

  try {
    const items = await prisma.rPEEntry.findMany({
      where: {
        date: { gte: start, lte: end },
        ...(player
          ? { OR: [{ playerKey: player }, { user: { name: player } }] }
          : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ date: "asc" }, { id: "asc" }],
    });

    const out = items.map((r) => {
      const rpe = Number((r as any).rpe ?? 0);
      const duration = (r as any).duration ?? null;
      const srpe = (r as any).load ?? (r as any).srpe ?? (duration != null ? rpe * Number(duration) : null);
      return {
        id: r.id,
        date: r.date,
        playerKey: (r as any).playerKey ?? null,
        userId: (r as any).userId ?? null,
        user: r.user,
        rpe,
        duration,
        srpe: srpe != null ? Math.round(Number(srpe)) : null,
        comment: (r as any).comment ?? null,
      };
    });

    return NextResponse.json({ start, end, count: out.length, items: out });
  } catch (e: any) {
    console.error(e);
    return bad(e?.message || "Error consultando rpe", 500);
  }
}
