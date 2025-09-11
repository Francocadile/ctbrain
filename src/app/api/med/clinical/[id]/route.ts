// src/app/api/med/clinical/[id]/route.ts
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

/* =======================
   GET /api/med/clinical/[id]
   MEDICO, CT o ADMIN (lectura)
======================= */
export async function GET(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = (token as any)?.role as string | undefined;
  if (!token || !["MEDICO", "CT", "ADMIN"].includes(role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = ctx.params.id;
  const r = await prisma.clinicalEntry.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      date: true,
      status: true,

      // baja
      leaveStage: true,
      leaveKind: true,

      // lesión
      diagnosis: true,
      bodyPart: true,
      laterality: true,
      mechanism: true,
      severity: true,

      // enfermedad
      illSystem: true,
      illSymptoms: true,
      illContagious: true,
      illIsolationDays: true,
      illAptitude: true,
      feverMax: true,

      // cronología  ✅ incluimos daysMin/daysMax (antes faltaba)
      startDate: true,
      daysMin: true,
      daysMax: true,
      expectedReturn: true,
      expectedReturnManual: true,

      // restricciones
      capMinutes: true,
      noSprint: true,
      noChangeOfDirection: true,
      gymOnly: true,
      noContact: true,

      // docs/plan
      notes: true,
      medSignature: true,
      protocolObjectives: true,
      protocolTasks: true,
      protocolControls: true,
      protocolCriteria: true,

      user: { select: { name: true, email: true } },
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!r) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
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
    daysMin: r.daysMin,
    daysMax: r.daysMax,
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

    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  });
}

/* =======================
   PATCH /api/med/clinical/[id]
   Solo MEDICO o ADMIN
   Acepta parcial; solo aplica lo enviado
======================= */
export async function PATCH(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = (token as any)?.role as string | undefined;
  if (!token || !["MEDICO", "ADMIN"].includes(role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = ctx.params.id;
  const body = await req.json().catch(() => ({} as Record<string, any>));
  const clean = <T extends object>(o: T) =>
    Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

  // Reglas de ETR auto si no se manda y viene startDate+daysMax
  let expectedReturn: Date | null | undefined =
    body.expectedReturn === undefined
      ? undefined
      : parseYMD(body.expectedReturn) ?? (body.expectedReturn ? new Date(body.expectedReturn) : null);

  let expectedReturnManual: boolean | undefined = body.expectedReturnManual;

  if (expectedReturn === undefined && body.startDate !== undefined && body.daysMax !== undefined) {
    const s = parseYMD(body.startDate) ?? (body.startDate ? new Date(body.startDate) : null);
    const max = typeof body.daysMax === "number" ? body.daysMax : null;
    if (s && Number.isInteger(max)) {
      const tmp = new Date(s);
      tmp.setDate(tmp.getDate() + Number(max));
      expectedReturn = tmp;
      if (expectedReturnManual === undefined) expectedReturnManual = false;
    }
  }

  const upd: Prisma.ClinicalEntryUncheckedUpdateInput = clean({
    // estado base
    status: body.status as ClinicalStatus | undefined
      ? { set: body.status as ClinicalStatus }
      : undefined,

    // baja
    leaveStage:
      body.leaveStage === undefined
        ? undefined
        : { set: (body.leaveStage as LeaveStage) ?? null },
    leaveKind:
      body.leaveKind === undefined
        ? undefined
        : { set: (body.leaveKind as LeaveKind) ?? null },

    // lesión
    diagnosis: body.diagnosis === undefined ? undefined : { set: body.diagnosis ?? null },
    bodyPart: body.bodyPart === undefined ? undefined : { set: body.bodyPart ?? null },
    laterality:
      body.laterality === undefined ? undefined : { set: (body.laterality as Laterality) ?? null },
    mechanism:
      body.mechanism === undefined ? undefined : { set: (body.mechanism as Mechanism) ?? null },
    severity:
      body.severity === undefined ? undefined : { set: (body.severity as Severity) ?? null },

    // enfermedad
    illSystem:
      body.illSystem === undefined
        ? undefined
        : { set: (body.illSystem as SystemAffected) ?? null },
    illSymptoms: body.illSymptoms === undefined ? undefined : { set: body.illSymptoms ?? null },
    illContagious:
      body.illContagious === undefined ? undefined : { set: body.illContagious ?? null },
    illIsolationDays:
      body.illIsolationDays === undefined ? undefined : { set: body.illIsolationDays ?? null },
    illAptitude:
      body.illAptitude === undefined
        ? undefined
        : { set: (body.illAptitude as IllAptitude) ?? null },
    feverMax: body.feverMax === undefined ? undefined : { set: body.feverMax ?? null },

    // cronología
    startDate:
      body.startDate === undefined
        ? undefined
        : { set: parseYMD(body.startDate) ?? (body.startDate ? new Date(body.startDate) : null) },
    daysMin:
      body.daysMin === undefined ? undefined : { set: body.daysMin ?? null },
    daysMax:
      body.daysMax === undefined ? undefined : { set: body.daysMax ?? null },
    expectedReturn:
      expectedReturn === undefined ? undefined : { set: expectedReturn },
    expectedReturnManual:
      expectedReturnManual === undefined ? undefined : { set: expectedReturnManual },

    // restricciones
    capMinutes:
      body.capMinutes === undefined ? undefined : { set: body.capMinutes ?? null },
    noSprint: body.noSprint === undefined ? undefined : { set: !!body.noSprint },
    noChangeOfDirection:
      body.noChangeOfDirection === undefined ? undefined : { set: !!body.noChangeOfDirection },
    gymOnly: body.gymOnly === undefined ? undefined : { set: !!body.gymOnly },
    noContact: body.noContact === undefined ? undefined : { set: !!body.noContact },

    // docs/plan
    notes: body.notes === undefined ? undefined : { set: body.notes ?? null },
    medSignature:
      body.medSignature === undefined ? undefined : { set: body.medSignature ?? null },
    protocolObjectives:
      body.protocolObjectives === undefined ? undefined : { set: body.protocolObjectives ?? null },
    protocolTasks:
      body.protocolTasks === undefined ? undefined : { set: body.protocolTasks ?? null },
    protocolControls:
      body.protocolControls === undefined ? undefined : { set: body.protocolControls ?? null },
    protocolCriteria:
      body.protocolCriteria === undefined ? undefined : { set: body.protocolCriteria ?? null },
  });

  try {
    const saved = await prisma.clinicalEntry.update({
      where: { id },
      data: upd,
      select: { id: true, date: true, status: true },
    });

    return NextResponse.json(
      { ok: true, id: saved.id, date: toYMD(saved.date), status: saved.status },
      { status: 200 }
    );
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("PATCH /api/med/clinical/[id] error:", e);
    return NextResponse.json({ error: "Update error" }, { status: 500 });
  }
}

/* =======================
   DELETE /api/med/clinical/[id]
   Solo ADMIN (o MEDICO si querés permitir)
======================= */
export async function DELETE(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = (token as any)?.role as string | undefined;
  if (!token || !["ADMIN"].includes(role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.clinicalEntry.delete({ where: { id: ctx.params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("DELETE /api/med/clinical/[id] error:", e);
    return NextResponse.json({ error: "Delete error" }, { status: 500 });
  }
}
