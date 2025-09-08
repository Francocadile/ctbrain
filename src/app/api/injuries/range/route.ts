import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/injuries/range?start=YYYY-MM-DD&end=YYYY-MM-DD
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const startS = searchParams.get("start");
  const endS = searchParams.get("end");
  if (!startS || !endS) {
    return NextResponse.json({ error: "start & end required" }, { status: 400 });
  }
  const start = new Date(startS);
  const end = new Date(endS);
  end.setDate(end.getDate() + 1);

  const rows = await prisma.injuryEntry.findMany({
    where: { date: { gte: start, lt: end } },
    include: { user: { select: { name: true, email: true } } },
    orderBy: [{ date: "desc" }],
  });

  const mapped = rows.map((r: any) => ({
    id: r.id,
    userId: r.userId,
    userName: r.user?.name || r.user?.email || "—",
    date: r.date.toISOString().slice(0, 10),
    status: r.status,
    bodyPart: r.bodyPart,
    laterality: r.laterality,
    mechanism: r.mechanism,
    severity: r.severity,
    expectedReturn: r.expectedReturn ? r.expectedReturn.toISOString().slice(0, 10) : null,
    availability: r.availability,
    pain: r.pain,
    capMinutes: r.capMinutes,
    noSprint: r.noSprint,
    noChangeOfDirection: r.noChangeOfDirection,
    gymOnly: r.gymOnly,
    noContact: r.noContact,
  }));

  return NextResponse.json(mapped);
}
