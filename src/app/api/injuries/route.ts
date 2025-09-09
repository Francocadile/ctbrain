// src/app/api/injuries/route.ts
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/* =============== Utils =============== */
function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}
function parseYMD(s?: string | null): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const [, yy, mm, dd] = m;
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

/* ===== Normalizadores (string → enum value esperado) =====
   Nota: uso unions de string y luego casteo a `any` al escribir en Prisma,
   para no depender de los nombres exactos del enum en tu schema.
*/
type LateralityT = "IZQ" | "DER" | "BIL" | "BILATERAL" | "NA";
type AvailabilityT = "FULL" | "LIMITADA" | "INDIVIDUAL" | "REHAB" | "DESCANSO";
type StatusT = "ACTIVO" | "REINTEGRO" | "ALTA";
type SeverityT = "LEVE" | "MODERADA" | "SEVERA";

function normalizeLaterality(x: any): LateralityT {
  const v = String(x ?? "NA").toUpperCase();
  if (v === "BIL" || v === "BILATERAL") return v === "BIL" ? "BIL" : "BILATERAL";
  if (v === "IZQ" || v === "LEFT") return "IZQ";
  if (v === "DER" || v === "RIGHT") return "DER";
  return "NA";
}
function normalizeAvailability(x: any): AvailabilityT {
  const v = String(x ?? "LIMITADA").toUpperCase();
  if (["FULL", "LIMITADA", "INDIVIDUAL", "REHAB", "DESCANSO"].includes(v)) {
    return v as AvailabilityT;
  }
  return "LIMITADA";
}
function normalizeStatus(x: any): StatusT {
  const v = String(x ?? "ACTIVO").toUpperCase();
  if (v === "ALTA") return "ALTA";
  if (v === "REINTEGRO") return "REINTEGRO";
  return "ACTIVO";
}
function normalizeSeverity(x: any): SeverityT | null {
  if (x == null || x === "") return null;
  const v = String(x).toUpperCase();
  if (["LEVE", "MODERADA", "SEVERA"].includes(v)) return v as SeverityT;
  return null;
}

/* =======================
   GET /api/injuries?date=YYYY-MM-DD
======================= */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");

  const baseDate =
    parseYMD(dateStr) ??
    (dateStr ? new Date(dateStr) : new Date());

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

    // Debe existir y ser jugador (ajustá si tu enum de rol difiere)
    const player = await prisma.user.findFirst({
      where: { id: userId, role: "PLAYER" as any },
      select: { id: true },
    });
    if (!player) {
      return NextResponse.json(
        { error: "userId inválido: debe ser un jugador." },
        { status: 400 }
      );
    }

    // Fecha del registro (día)
    const parsed =
      parseYMD(typeof body.date === "string" ? body.date : undefined) ??
      (body.date ? new Date(body.date) : new Date());
    const day = startOfDay(parsed);
    const dayTo = nextDay(parsed);

    // Normalizaciones (string → valores esperados)
    const status = normalizeStatus(body.status);
    const laterality = normalizeLaterality(body.laterality);
    const availability = normalizeAvailability(body.availability);
    const severity = normalizeSeverity(body.severity);
    const expectedReturn =
      parseYMD(body.expectedReturn) ??
      (body.expectedReturn ? new Date(body.expectedReturn) : null);

    // CREATE (tipado flexible con casts puntuales)
    const createData: Prisma.InjuryEntryUncheckedCreateInput = {
      userId: player.id,
      date: day,
      status: status as any,
      bodyPart: body.bodyPart ?? null,
      laterality: laterality as any,
      mechanism: body.mechanism ?? null,
      severity: (severity as any) ?? null,
      expectedReturn,
      availability: availability as any,
      pain: body.pain ?? null,
      capMinutes: body.capMinutes ?? null,
      noSprint: !!body.noSprint,
      noChangeOfDirection: !!body.noChangeOfDirection,
      gymOnly: !!body.gymOnly,
      noContact: !!body.noContact,
      note: body.note ?? null,
    };

    // UPDATE (usar { set: ... } + casts para enums)
    const updateData: Prisma.InjuryEntryUpdateInput = {
      status: { set: status as any },
      bodyPart: { set: body.bodyPart ?? null },
      laterality: { set: laterality as any },
      mechanism: { set: body.mechanism ?? null },
      severity: { set: (severity as any) ?? null },
      expectedReturn: { set: expectedReturn },
      availability: { set: availability as any },
      pain: { set: body.pain ?? null },
      capMinutes: { set: body.capMinutes ?? null },
      noSprint: { set: !!body.noSprint },
      noChangeOfDirection: { set: !!body.noChangeOfDirection },
      gymOnly: { set: !!body.gymOnly },
      noContact: { set: !!body.noContact },
      note: { set: body.note ?? null },
    };

    // Upsert lógico por (userId + día)
    const existing = await prisma.injuryEntry.findFirst({
      where: { userId: player.id, date: { gte: day, lt: dayTo } },
      select: { id: true },
    });

    const saved = existing
      ? await prisma.injuryEntry.update({
          where: { id: existing.id },
          data: updateData,
        })
      : await prisma.injuryEntry.create({ data: createData });

    return NextResponse.json(saved, { status: existing ? 200 : 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error creando entrada" }, { status: 500 });
  }
}
