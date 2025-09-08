// src/app/api/injuries/range/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";
const prisma = new PrismaClient();

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const player = searchParams.get("player");

  if (!start || !end) return bad("Parámetros requeridos: start, end (YYYY-MM-DD)");

  try {
    const where: any = { date: { gte: new Date(start), lte: new Date(end) } };
    if (player) {
      where.user = {
        is: {
          OR: [
            { name: { equals: player, mode: "insensitive" } },
            { email: { equals: player, mode: "insensitive" } },
          ],
        },
      };
    }

    const items = await prisma.injuryEntry.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: [{ date: "asc" }, { id: "asc" }],
    });

    const out = items.map((r) => ({
      id: r.id,
      date: r.date,
      userId: r.userId,
      user: r.user,
      status: r.status,
      bodyPart: r.bodyPart,
      laterality: r.laterality,
      mechanism: r.mechanism,
      expectedReturn: r.expectedReturn,
      notes: r.notes,
      userName: r.user?.name ?? r.user?.email ?? "—",
    }));

    return NextResponse.json({ start, end, count: out.length, items: out });
  } catch (e: any) {
    console.error(e);
    return bad(e?.message || "Error consultando lesiones", 500);
  }
}
