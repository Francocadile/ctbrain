import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// Prisma singleton simple para evitar leaks en dev
const prisma = (globalThis as any).prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") (globalThis as any).prisma = prisma;

function fromYMD(s: string): Date {
  // normalizamos a 00:00 local → guardá tus fechas siempre “día” (sin hora) para coherencia
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 0, 0, 0));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");
  if (!dateStr) {
    return NextResponse.json({ error: "Missing ?date=YYYY-MM-DD" }, { status: 400 });
  }

  const date = fromYMD(dateStr);

  const rows = await prisma.injuryEntry.findMany({
    where: { date },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });

  const mapped = rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.user?.name || r.user?.email || "—",
    date: dateStr,
    status: r.status, // "ACTIVO" | "REINTEGRO" | "ALTA"
    bodyPart: r.bodyPart,
    laterality: r.laterality,
    mechanism: r.mechanism,
    expectedReturn: r.expectedReturn ? r.expectedReturn.toISOString().slice(0, 10) : null,
    notes: r.notes,
    updatedAt: r.updatedAt,
  }));

  return NextResponse.json(mapped);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const {
    userId,
    date, // YYYY-MM-DD
    status, // "ACTIVO" | "REINTEGRO" | "ALTA"
    bodyPart,
    laterality,
    mechanism,
    expectedReturn, // YYYY-MM-DD | null
    notes,
  } = body || {};

  if (!userId || !date || !status) {
    return NextResponse.json(
      { error: "Missing userId, date, or status" },
      { status: 400 }
    );
  }

  const dateObj = fromYMD(date);
  const expected = expectedReturn ? fromYMD(expectedReturn) : null;

  // upsert por (userId, date) — si tu esquema tiene @@unique([userId, date]) funciona perfecto
  const existing = await prisma.injuryEntry.findFirst({ where: { userId, date: dateObj } });

  const payload = {
    userId,
    date: dateObj,
    status: String(status),
    bodyPart: bodyPart ?? null,
    laterality: laterality ?? null,
    mechanism: mechanism ?? null,
    expectedReturn: expected,
    notes: notes ?? null,
  };

  const saved = existing
    ? await prisma.injuryEntry.update({ where: { id: existing.id }, data: payload })
    : await prisma.injuryEntry.create({ data: payload });

  return NextResponse.json({ id: saved.id }, { status: existing ? 200 : 201 });
}
