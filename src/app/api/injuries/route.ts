// src/app/api/injuries/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/* Utils */
function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}
function parseYMD(s?: string | null): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const [_, yy, mm, dd] = m;
  const d = new Date(Number(yy), Number(mm) - 1, Number(dd));
  return isNaN(d.getTime()) ? null : d;
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function nextDay(d: Date) {
  const x = startOfDay(d);
  x.setDate(x.getDate() + 1);
  return x;
}

/* =======================
   GET /api/injuries?date=YYYY-MM-DD
======================= */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");

  const baseDate = parseYMD(dateStr) ?? (dateStr ? new Date(dateStr) : new Date());
  const from = startOfDay(baseDate);
  const to = nextDay(baseDate);

  const rows = await prisma.injuryEntry.findMany({
    where: { date: { gte: from, lt: to } },
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
    date: toYMD(r.date),
    status: r.status,
    bodyPart: r.bodyPart,
    laterality: r.laterality,
    mechanism: r.mechanism,
    severity: r.severity,
    expectedReturn: r.expectedReturn ? toYMD(r.expectedReturn) : null,
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

/* =======================
   POST /api/injuries
   Upsert lógico por (userId+día)
======================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const userId: string | undefined = body.userId;
    if (!userId) {
      return NextResponse.json(
        { error: "Falta userId: seleccioná un jugador de la lista." },
        { status: 400 }
      );
    }

    // Normalizar fecha del registro (día)
    const parsed = parseYMD(body.date) ?? (body.date ? new Date(body.date) : new Date());
    const day = startOfDay(parsed);
    const dayTo = nextDay(parsed);

    const payload = {
      userId,
      date: day,
      status: (body.status ?? "ACTIVO") as string,
      bodyPart: body.bodyPart ?? null,
      laterality: (body.laterality ?? "NA") as string | null,
      mechanism: body.mechanism ?? null,
      severity: (body.severity ?? null) as string | null,
      expectedReturn: parseYMD(body.expectedReturn) ?? (body.expectedReturn ? new Date(body.expectedReturn) : null),
      availability: (body.availability ?? "LIMITADA") as string | null,
      pain: body.pain ?? null,
      capMinutes: body.capMinutes ?? null,
      noSprint: !!body.noSprint,
      noChangeOfDirection: !!body.noChangeOfDirection,
      gymOnly: !!body.gymOnly,
      noContact: !!body.noContact,
      // si en tu schema es "notes" en vez de "note", cambialo:
      notes: body.note ?? null,
    };

    // Upsert lógico (sin unique compuesto)
    const existing = await prisma.injuryEntry.findFirst({
      where: { userId, date: { gte: day, lt: dayTo } },
      select: { id: true },
    });

    const saved = existing
      ? await prisma.injuryEntry.update({
          where: { id: existing.id },
          data: payload as any, // evitar choques de enums en build
        })
      : await prisma.injuryEntry.create({ data: payload as any });

    return NextResponse.json(saved, { status: existing ? 200 : 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error creando/actualizando entrada" }, { status: 500 });
  }
}

/* =======================
   DELETE /api/injuries  { id: string }
======================= */
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const id = body?.id as string | undefined;
    if (!id) {
      return NextResponse.json({ error: "Falta id" }, { status: 400 });
    }
    const deleted = await prisma.injuryEntry.delete({ where: { id } });
    return NextResponse.json(deleted, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error eliminando" }, { status: 500 });
  }
}
