// src/app/api/injuries/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

// Tipo con usuario incluido
type InjuryWithUser = Prisma.InjuryEntryGetPayload<{
  include: { user: true };
}>;

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}
function fromYMD(s: string) {
  const [y, m, dd] = s.split("-").map(Number);
  return new Date(y, m - 1, dd);
}

/**
 * GET /api/injuries?date=YYYY-MM-DD
 * Lista entradas de lesión del día (normaliza campos y nombre de usuario).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");
  if (!dateStr) {
    return NextResponse.json(
      { error: "Missing 'date' (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  // traemos por igualdad de fecha (asumiendo date sin hora)
  const day = fromYMD(dateStr);
  const rows: InjuryWithUser[] = await prisma.injuryEntry.findMany({
    where: { date: day },
    include: { user: true },
    orderBy: [{ userId: "asc" }],
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

/**
 * POST /api/injuries
 * Upsert por (userId, date).
 * Body JSON:
 * { userId, date: 'YYYY-MM-DD', status, bodyPart?, laterality?, mechanism?, expectedReturn?: 'YYYY-MM-DD', notes? }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const {
    userId,
    date,
    status,
    bodyPart = null,
    laterality = null,
    mechanism = null,
    expectedReturn = null,
    notes = null,
  }: {
    userId?: string;
    date?: string;
    status?: string; // o enum de tu schema
    bodyPart?: string | null;
    laterality?: string | null;
    mechanism?: string | null;
    expectedReturn?: string | null;
    notes?: string | null;
  } = body || {};

  if (!userId || !date || !status) {
    return NextResponse.json(
      { error: "Missing 'userId', 'date' (YYYY-MM-DD) or 'status'" },
      { status: 400 }
    );
  }

  const d = fromYMD(date);
  const er = expectedReturn ? fromYMD(expectedReturn) : null;

  // Requiere en el schema: @@unique([userId, date]) en InjuryEntry
  const up = await prisma.injuryEntry.upsert({
    where: { userId_date: { userId, date: d } },
    create: {
      userId,
      date: d,
      status: status as any,
      bodyPart,
      laterality,
      mechanism,
      expectedReturn: er,
      notes,
    },
    update: {
      status: status as any,
      bodyPart,
      laterality,
      mechanism,
      expectedReturn: er,
      notes,
    },
    include: { user: true },
  });

  const out = {
    id: up.id,
    userId: up.userId,
    userName: up.user?.name || up.user?.email || "—",
    date: toYMD(up.date),
    status: up.status,
    bodyPart: up.bodyPart ?? null,
    laterality: up.laterality ?? null,
    mechanism: up.mechanism ?? null,
    expectedReturn: up.expectedReturn ? toYMD(up.expectedReturn) : null,
    notes: up.notes ?? null,
    createdAt: up.createdAt?.toISOString?.() ?? undefined,
    updatedAt: up.updatedAt?.toISOString?.() ?? undefined,
  };

  return NextResponse.json(out, { status: 201 });
}
