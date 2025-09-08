import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from")!;
  const to = searchParams.get("to")!;
  // fechas inclusive
  const rows = await prisma.injuryEntry.findMany({
    where: { date: { gte: new Date(from), lte: new Date(to) } },
    select: {
      id: true, userId: true, date: true, status: true, availability: true,
      zone: true, severity: true, mechanism: true, side: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: [{ date: "asc" }],
  });

  const mapped = rows.map((r: any) => ({
    id: r.id,
    date: r.date.toISOString().slice(0,10),
    userName: r.user?.name || r.user?.email || "—",
    availability: r.availability,
    status: r.status,
    zone: r.zone,
    severity: r.severity,
    mechanism: r.mechanism,
    side: r.side,
  }));
  return NextResponse.json(mapped);
}
