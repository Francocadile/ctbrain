// src/app/api/injuries/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/injuries?date=YYYY-MM-DD
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");
  const date = dateStr ? new Date(dateStr) : new Date();

  // rango [date, nextDay)
  const next = new Date(date);
  next.setDate(next.getDate() + 1);

  const rows = await prisma.injuryEntry.findMany({
    where: { date: { gte: date, lt: next } },
    select: {
      id: true,
      userId: true,
      date: true,
      status: true,
      bodyPart: true,
      laterality: true,
      mechanism: true,
      severity: true,
      expectedReturn: true,
      availability: true,
      pain: true,
      capMinutes: true,
      noSprint: true,
      noChangeOfDirection: true,
      gymOnly: true,
      noContact: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: [{ date: "desc" }],
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

function isUUIDLike(s: string) {
  return /^[0-9a-f-]{22,36}$/i.test(s);
}

// POST /api/injuries  (tolera userId, nombre o email)
export async function POST(req: Request) {
  try {
    const body = await req.json();

    let userKey: string | undefined =
      body.userId || body.player || body.jugador || "";

    if (!userKey) {
      return NextResponse.json(
        { error: "Falta el jugador: enviá userId o nombre/email" },
        { status: 400 }
      );
    }

    // Resolver jugador por id o por name/email exacto
    let user: { id: string } | null = null;
    if (isUUIDLike(userKey)) {
      user = await prisma.user.findUnique({
        where: { id: userKey },
        select: { id: true },
      });
    } else {
      user = await prisma.user.findFirst({
        where: { OR: [{ name: userKey }, { email: userKey }] },
        select: { id: true },
      });
    }

    if (!user) {
      return NextResponse.json(
        {
          error:
            "userId inválido: usá el id del jugador, o el nombre/email exactamente como figura en Usuarios.",
        },
        { status: 400 }
      );
    }

    const payload = {
      userId: user.id,
      date: body.date ? new Date(body.date) : new Date(),
      status: body.status, // "ACTIVO" | "REINTEGRO" | "ALTA"
      bodyPart: body.bodyPart ?? null,
      laterality: body.laterality ?? "NA",
      mechanism: body.mechanism ?? null,
      severity: body.severity ?? null,
      expectedReturn: body.expectedReturn
        ? new Date(body.expectedReturn)
        : null,
      availability: body.availability ?? "LIMITADA",
      pain: body.pain ?? null,
      capMinutes: body.capMinutes ?? null,
      noSprint: !!body.noSprint,
      noChangeOfDirection: !!body.noChangeOfDirection,
      gymOnly: !!body.gymOnly,
      noContact: !!body.noContact,
      note: body.note ?? null,
    };

    // upsert por (userId+date) si tenés unique compuesto; si no, create.
    // Si NO tenés unique en el schema, dejá create:
    const created = await prisma.injuryEntry.create({ data: payload });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error creando entrada" }, { status: 500 });
  }
}
