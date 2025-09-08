// src/app/api/injuries/range/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

type InjuryWithUser = Prisma.InjuryEntryGetPayload<{
  include: { user: true };
}>;

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json(
      { error: "Missing 'start' or 'end' (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  const rows: InjuryWithUser[] = await prisma.injuryEntry.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
    },
    include: { user: true },
    orderBy: [{ date: "asc" }, { userId: "asc" }],
  });

  const mapped = rows.map((r: InjuryWithUser) => ({
    id: r.id,
    userId: r.userId,
    userName: r.user?.name || r.user?.email || "—",
    date: toYMD(r.date),
    status: r.status, // enum/string según tu schema
    bodyPart: r.bodyPart ?? null,
    laterality: r.laterality ?? null,
    mechanism: r.mechanism ?? null,
    expectedReturn: r.expectedReturn ? toYMD(r.expectedReturn) : null,
    notes: r.notes ?? null,
    createdAt: r.createdAt?.toISOString?.() ?? undefined,
    updatedAt: r.updatedAt?.toISOString?.() ?? undefined,
  }));

  return NextResponse.json(mapped);
}
