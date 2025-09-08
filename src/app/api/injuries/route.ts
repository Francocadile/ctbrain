import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/injuries?date=YYYY-MM-DD
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateS = searchParams.get("date");
  if (!dateS) {
    return NextResponse.json({ error: "date requerido (YYYY-MM-DD)" }, { status: 400 });
  }

  const start = new Date(dateS);
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json({ error: "date inválido" }, { status: 400 });
  }
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const rows = await prisma.injuryEntry.findMany({
    where: { date: { gte: start, lt: end } },
    include: { user: { select: { name: true, email: true } } },
    orderBy: [{ createdAt: "desc" }],
  });

  const mapped = rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.user?.name ?? r.user?.email ?? "—",
    date: r.date.toISOString().slice(0, 10),
    status: r.status,
    bodyPart: r.bodyPart,
    laterality: r.laterality,
    mechanism: r.mechanism,
    severity: r.severity,
    expectedReturn: r.expectedReturn
      ? r.expectedReturn.toISOString().slice(0, 10)
      : null,
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

// POST /api/injuries
export async function POST(req: Request) {
  try {
    const { userId, date, status, bodyPart } = await req.json();

    if (!userId || !date || !status) {
      return NextResponse.json(
        { error: "userId, date y status son obligatorios" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { error: "userId inválido: debe ser el id del jugador" },
        { status: 400 }
      );
    }

    const created = await prisma.injuryEntry.create({
      data: {
        userId,
        date: new Date(date),
        status,
        bodyPart: bodyPart ?? null,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    // unique (userId, date) => ya existe carga del día
    if (e?.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe una entrada para ese jugador en ese día" },
        { status: 409 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Error interno al crear" }, { status: 500 });
  }
}
