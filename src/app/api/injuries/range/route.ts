import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = (globalThis as any).prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") (globalThis as any).prisma = prisma;

function fromYMD(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 0, 0, 0));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!start || !end) {
    return NextResponse.json({ error: "Missing ?start=YYYY-MM-DD&end=YYYY-MM-DD" }, { status: 400 });
  }

  const startDate = fromYMD(start);
  const endDate = fromYMD(end);

  const rows = await prisma.injuryEntry.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: [{ date: "asc" }, { updatedAt: "desc" }],
  });

  const mapped = rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.user?.name || r.user?.email || "—",
    date: r.date.toISOString().slice(0, 10),
    status: r.status,
    bodyPart: r.bodyPart,
    laterality: r.laterality,
    mechanism: r.mechanism,
    expectedReturn: r.expectedReturn ? r.expectedReturn.toISOString().slice(0, 10) : null,
    notes: r.notes,
    updatedAt: r.updatedAt,
  }));

  return NextResponse.json(mapped);
}
