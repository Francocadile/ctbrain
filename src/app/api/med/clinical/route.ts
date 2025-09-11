// src/app/api/med/clinical/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import type { Prisma } from "@prisma/client";
import {
  ClinicalStatus,
  LeaveStage,
  LeaveKind,
  Laterality,
  Mechanism,
  Severity,
  SystemAffected,
  IllAptitude,
} from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* Utils */
function toYMD(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
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

/* =============== GET =============== */
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = (token as any)?.role as string | undefined;
  if (!token || !["MEDICO", "CT", "ADMIN"].includes(role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const dateStr = searchParams.get("date");
  const baseDate =
    parseYMD(dateStr) ?? (dateStr ? new Date(dateStr) : new Date());

  const from = startOfDay(baseDate);
  const to = nextDay(baseDate);

  const rows = await prisma.clinicalEntry.findMany({
    where: { date: { gte: from, lt: to } },
    include: { user: { select: { name: true, email: true } } },
    orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
  });

  const mapped = rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.user?.name || r.user?.email || "—",
    date: toYMD(r.date),
    status: r.status,

    leaveStage: r.leaveStage,
    leaveKind: r.leaveKind,

    diagnosis: r.diagnosis,
    bodyPart: r.bodyPart,
    laterality: r.laterality,
    mechanism: r.mechanism,
    severity: r.severity,

    illSystem: r.illSystem,
    illSymptoms: r.illSymptoms,
    illContagious: r.illContagious,
    illIsolationDays: r.illIsolationDays,
    illAptitude: r.illAptitude,
    feverMax: r.feverMax,

    startDate: r.startDate ? toYMD(r.startDate) : null,
    // ❌ sin daysMin/daysMax
    expectedReturn: r.expectedReturn ? toYMD(r.expectedReturn) : null,
    expectedReturnManual: r.expectedReturnManual,

    capMinutes: r.capMinutes,
    noSprint: r.noSprint,
    noChangeOfDirection: r.noChangeOfDirection,
    gymOnly: r.gymOnly,
    noContact: r.noContact,

    notes: r.notes,
    medSignature: r.medSignature,
    protocolObjectives: r.protocolObjectives,
    protocolTasks: r.protocolTasks,
    protocolControls: r.protocolControls,
    protocolCriteria: r.protocolCriteria,
  }));

  return NextResponse.json(mapped, {
    headers: { "cache-control": "no-store" },
  });
}

/* =============== POST (upsert por userId+date) =============== */
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = (token as any)?.role as string | undefined;
  if (!token || !["MEDICO", "ADMIN"].includes(role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const userId: string | undefined = body.userId;
    if (!userId) {
      return NextResponse.json(
        { error: "Falta userId (jugador)" },
        { status: 400 }
      );
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json(
        { error: "userId inválido (no existe el usuario)" },
        { status: 400 }
      );
    }

    const dateYMD = typeof body.date === "string" ? body.date : undefined;
    const parsed =
      parseYMD(dateYMD) ?? (body.date ? new Date(body.date) : new Date());
    const day = startOfDay(parsed);
    const dayTo = nextDay(parsed);

    // Cronología / cálculo ETR (podemos leer daysMax si viene, pero no lo guardamos)
    const startDate =
      parseYMD(body.startDate) ??
      (body.startDate ? new Date(body.startDate) : null);

    const daysMax = body.daysMax ?? body.daysEstimated ?? null;

    let expectedReturn =
      parseYMD(body.expectedReturn) ??
      (body.expectedReturn ? new Date(body.expectedReturn) : null);

    let expectedReturnManual = !!body.expectedReturnManual;

    if (!expectedReturn && startDate && Number.isInteger(daysMax)) {
      const tmp = new Date(startDate);
      tmp.setDate(tmp.getDate() + Number(daysMax));
      expectedReturn = tmp;
      expectedReturnManual = false;
    }

    // CREATE payload (❌ sin daysMin/daysMax)
    const createData: Prisma.ClinicalEntryUncheckedCreateInput = {
      userId: user.id,
      date: day,
      status: body.status as ClinicalStatus,

      // baja
      leaveStage: body.leaveStage ?? null,
      leaveKind: body.leaveKind ?? null,

      // lesión
      diagnosis: body.diagnosis ?? null,
      bodyPart: body.bodyPart ?? null,
      laterality: body.laterality ?? null,
      mechanism: body.mechanism ?? null,
      severity: body.severity ?? null,

      // enfermedad
      illSystem: body.illSystem ?? null,
      illSymptoms: body.illSymptoms ?? null,
      illContagious:
        typeof body.illContagious === "boolean" ? body.illContagious : null,
      illIsolationDays: body.illIsolationDays ?? null,
      illAptitude: body.illAptitude ?? null,
      feverMax: body.feverMax ?? null,

      // cronología
      startDate: startDate,
      expectedReturn: expectedReturn,
      expectedReturnManual: expectedReturnManual,

      // restricciones
      capMinutes: body.capMinutes ?? null,
      noSprint: !!body.noSprint,
      noChangeOfDirection: !!body.noChangeOfDirection,
      gymOnly: !!body.gymOnly,
      noContact: !!body.noContact,

      // docs/plan
      notes: body.notes ?? null,
      medSignature: body.medSignature ?? null,
      protocolObjectives: body.protocolObjectives ?? null,
      protocolTasks: body.protocolTasks ?? null,
      protocolControls: body.protocolControls ?? null,
      protocolCriteria: body.protocolCriteria ?? null,
    };

    // UPDATE payload (❌ sin daysMin/daysMax)
    const updateData: Prisma.ClinicalEntryUncheckedUpdateInput = {
      status: { set: createData.status },

      leaveStage: { set: createData.leaveStage as LeaveStage | null },
      leaveKind: { set: createData.leaveKind as LeaveKind | null },

      diagnosis: { set: createData.diagnosis },
      bodyPart: { set: createData.bodyPart },
      laterality: { set: createData.laterality as Laterality | null },
      mechanism: { set: createData.mechanism as Mechanism | null },
      severity: { set: createData.severity as Severity | null },

      illSystem: { set: createData.illSystem as SystemAffected | null },
      illSymptoms: { set: createData.illSymptoms },
      illContagious: { set: createData.illContagious },
      illIsolationDays: { set: createData.illIsolationDays },
      illAptitude: { set: createData.illAptitude as IllAptitude | null },
      feverMax: { set: createData.feverMax },

      startDate: { set: createData.startDate },
      expectedReturn: { set: createData.expectedReturn },
      expectedReturnManual: { set: createData.expectedReturnManual },

      capMinutes: { set: createData.capMinutes },
      noSprint: { set: createData.noSprint },
      noChangeOfDirection: { set: createData.noChangeOfDirection },
      gymOnly: { set: createData.gymOnly },
      noContact: { set: createData.noContact },

      notes: { set: createData.notes },
      medSignature: { set: createData.medSignature },
      protocolObjectives: { set: createData.protocolObjectives },
      protocolTasks: { set: createData.protocolTasks },
      protocolControls: { set: createData.protocolControls },
      protocolCriteria: { set: createData.protocolCriteria },
    };

    // Upsert por (userId + día)
    const existing = await prisma.clinicalEntry.findFirst({
      where: { userId: user.id, date: { gte: day, lt: dayTo } },
      select: { id: true },
    });

    const saved = existing
      ? await prisma.clinicalEntry.update({
          where: { id: existing.id },
          data: updateData,
        })
      : await prisma.clinicalEntry.create({ data: createData });

    return NextResponse.json(
      { ok: true, id: saved.id, status: saved.status, date: toYMD(saved.date) },
      { status: existing ? 200 : 201 }
    );
  } catch (e: any) {
    console.error("POST /api/med/clinical error:", e);
    return NextResponse.json(
      { error: "Error creando/actualizando parte clínico" },
      { status: 500 }
    );
  }
}
