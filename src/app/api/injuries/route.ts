// src/app/api/injuries/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Laterality } from "@prisma/client"; // 👈 usamos el enum real de Prisma

/* Utils */
function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}
function parseYMD(s?: string | null): Date | null {
  if (!s) return null;
  // Espera "YYYY-MM-DD"
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const [_, yy, mm, dd] = m;
  const d = new Date(Number(yy), Number(mm) - 1, Number(dd));
  if (isNaN(d.getTime())) return null;
  return d;
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

/* Normalizadores para alinear valores con Prisma */
function normalizeLaterality(x: any): Laterality {
  // Acepta variantes desde el front y las mapea al enum del schema
  if (x === "BIL" || x === "BILATERAL") return "BILATERAL";
  if (x === "IZQ" || x === "LEFT") return "IZQ";
  if (x === "DER" || x === "RIGHT") return "DER";
  return "NA";
}

/* =======================
   GET /api/injuries?date=YYYY-MM-DD
   Devuelve el listado del día (por fecha)
======================= */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");

  const baseDate =
    parseYMD(dateStr) ?? // si viene en YMD
    (dateStr ? new Date(dateStr) : new Date()); // fallback

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
   Crea/actualiza (upsert lógico) por jugador+día.
   Requiere userId de un usuario con rol PLAYER (ajustar si tu enum difiere).
   Body esperado (parcial):
   {
     userId: string, date?: "YYYY-MM-DD",
     status?: "ACTIVO" | "REINTEGRO" | "ALTA",
     bodyPart?, laterality?, mechanism?, severity?,
     expectedReturn?: "YYYY-MM-DD",
     availability?, pain?, capMinutes?,
     noSprint?, noChangeOfDirection?, gymOnly?, noContact?, note?
   }
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

    // Validación fuerte: debe existir y ser jugador
    const player = await prisma.user.findFirst({
      where: { id: userId, role: "PLAYER" as any }, // ⚠️ Cambiá a tu enum si no es "PLAYER"
      select: { id: true },
    });
    if (!player) {
      return NextResponse.json(
        { error: "userId inválido: debe ser un jugador." },
        { status: 400 }
      );
    }

    // Normalizar fecha del registro (día)
    const dateYMD = typeof body.date === "string" ? body.date : undefined;
    const parsed = parseYMD(dateYMD) ?? (body.date ? new Date(body.date) : new Date());
    const day = startOfDay(parsed);
    const dayTo = nextDay(parsed);

    const payload = {
      userId: player.id,
      date: day,
      status: (body.status ?? "ACTIVO") as "ACTIVO" | "REINTEGRO" | "ALTA",
      bodyPart: body.bodyPart ?? null,
      laterality: normalizeLaterality(body.laterality), // 👈 aquí corregido
      mechanism: body.mechanism ?? null,
      severity: (body.severity ?? null) as "LEVE" | "MODERADA" | "SEVERA" | null,
      expectedReturn:
        parseYMD(body.expectedReturn) ??
        (body.expectedReturn ? new Date(body.expectedReturn) : null),
      availability: (body.availability ?? "LIMITADA") as
        | "FULL"
        | "LIMITADA"
        | "INDIVIDUAL"
        | "REHAB"
        | "DESCANSO",
      pain: body.pain ?? null,
      capMinutes: body.capMinutes ?? null,
      noSprint: !!body.noSprint,
      noChangeOfDirection: !!body.noChangeOfDirection,
      gymOnly: !!body.gymOnly,
      noContact: !!body.noContact,
      note: body.note ?? null,
    };

    // Upsert LÓGICO (sin requerir unique compuesto en el schema)
    const existing = await prisma.injuryEntry.findFirst({
      where: { userId: player.id, date: { gte: day, lt: dayTo } },
      select: { id: true },
    });

    const saved = existing
      ? await prisma.injuryEntry.update({
          where: { id: existing.id },
          data: payload,
        })
      : await prisma.injuryEntry.create({ data: payload });

    return NextResponse.json(saved, { status: existing ? 200 : 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error creando entrada" }, { status: 500 });
  }
}
