import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/injuries?date=YYYY-MM-DD
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "Missing date" }, { status: 400 });

  const start = new Date(date);
  const end = new Date(date);
  end.setDate(end.getDate() + 1);

  const rows = await prisma.injuryEntry.findMany({
    where: { date: { gte: start, lt: end } },
    include: { user: { select: { name: true, email: true } } },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
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
    notes: r.notes,
    capMinutes: r.capMinutes,
    noSprint: r.noSprint,
    noChangeOfDirection: r.noChangeOfDirection,
    gymOnly: r.gymOnly,
    noContact: r.noContact,
    updatedAt: r.updatedAt,
  }));

  return NextResponse.json(mapped);
}

// POST /api/injuries  (upsert por userId+date)
export async function POST(req: Request) {
  const body = await req.json();
  const { userId, date } = body as { userId?: string; date?: string };
  if (!userId || !date) {
    return NextResponse.json({ error: "userId and date are required" }, { status: 400 });
  }

  const ymd = date.slice(0, 10);
  const d = new Date(ymd);

  const data = {
    status: body.status ?? "ACTIVO",
    bodyPart: body.bodyPart ?? null,
    laterality: body.laterality ?? null,
    mechanism: body.mechanism ?? null,
    severity: body.severity ?? null,
    expectedReturn: body.expectedReturn ? new Date(body.expectedReturn) : null,
    availability: body.availability ?? null,
    pain: typeof body.pain === "number" ? body.pain : null,
    notes: body.notes ?? null,
    capMinutes: typeof body.capMinutes === "number" ? body.capMinutes : null,
    noSprint: !!body.noSprint,
    noChangeOfDirection: !!body.noChangeOfDirection,
    gymOnly: !!body.gymOnly,
    noContact: !!body.noContact,
  };

  const saved = await prisma.injuryEntry.upsert({
    where: { userId_date: { userId, date: d } },
    update: data,
    create: { userId, date: d, ...data },
    include: { user: { select: { name: true, email: true } } },
  });

  return NextResponse.json({
    ...saved,
    date: saved.date.toISOString().slice(0, 10),
    expectedReturn: saved.expectedReturn ? saved.expectedReturn.toISOString().slice(0, 10) : null,
  });
}
