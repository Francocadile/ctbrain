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
  const end = searchParams.get("end"); // YYYY-MM-DD inclusive
  const player = searchParams.get("player"); // opcional: nombre o email

  if (!start || !end) return bad("Parámetros requeridos: start, end (YYYY-MM-DD)");

  try {
    // where sin playerKey (no existe en tu RPEEntry)
    const where: any = { date: { gte: start, lte: end } };

    if (player) {
      // filtro por relación user (name/email, case-insensitive)
      where.user = {
        is: {
          OR: [
            { name: { equals: player, mode: "insensitive" } },
            { email: { equals: player, mode: "insensitive" } },
          ],
        },
      };
    }

    const items = await prisma.rPEEntry.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ date: "asc" }, { id: "asc" }],
    });

    const out = items.map((r: any) => {
      const rpe = Number(r.rpe ?? 0);
      const duration = r.duration ?? null;
      const srpe =
        r.load ?? r.srpe ?? (duration != null ? rpe * Number(duration) : null);

      return {
        id: r.id,
        date: r.date,
        // compat con el front
        playerKey: r.playerKey ?? null, // por si en algún momento existe en DB (no rompe si es null)
        userId: r.userId ?? null,
        user: r.user,
        rpe,
        duration,
        srpe: srpe != null ? Math.round(Number(srpe)) : null,
        comment: r.comment ?? null,
      };
    });

    return NextResponse.json({ start, end, count: out.length, items: out });
  } catch (e: any) {
    console.error(e);
    return bad(e?.message || "Error consultando rpe", 500);
  }
}
