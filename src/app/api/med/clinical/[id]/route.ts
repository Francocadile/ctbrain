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

/* helpers */
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

/* ---------------- GET /api/med/clinical/[id] ----------------
   Lectura por ID. Permisos: MEDICO, CT o ADMIN
---------------------------------------------------------------- */
export async function GET(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = (token as any)?.role as string | undefined;
  if (!token || !["MEDICO", "CT", "ADMIN"].includes(role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = ctx.params?.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const r = await prisma.clinicalEntry.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = {
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
  };

  return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
}

/* ---------------- PATCH /api/med/clinical/[id] ---------------
   Update parcial por ID. Permisos: MEDICO o ADMIN
---------------------------------------------------------------- */
export async function PATCH(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = (token as any)?.role as string | undefined;
  if (!token || !["MEDICO", "ADMIN"].includes(role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = ctx.params?.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));

  // fechas
  const date =
    parseYMD(body.date) ?? (body.date ? new Date(body.date) : undefined);
  const startDate =
    parseYMD(body.startDate) ??
    (body.startDate ? new Date(body.startDate) : undefined);
  const expectedReturn =
    parseYMD(body.expectedReturn) ??
    (body.expectedReturn ? new Date(body.expectedReturn) : undefined);

  // construimos UPDATE usando { set: ... } (necesario para enums / nullables)
  const data: Prisma.ClinicalEntryUncheckedUpdateInput = {
    ...(date ? { date: { set: date } } : {}),
    ...(body.status ? { status: { set: body.status as ClinicalStatus } } : {}),

    leaveStage:
      "leaveStage" in body
        ? ({ set: (body.leaveStage ?? null) as LeaveStage | null } as any)
        : undefined,
    leaveKind:
      "leaveKind" in body
        ? ({ set: (body.leaveKind ?? null) as LeaveKind | null } as any)
        : undefined,

    diagnosis:
      "diagnosis" in body ? { set: body.diagnosis ?? null } : undefined,
    bodyPart: "bodyPart" in body ? { set: body.bodyPart ?? null } : undefined,
    laterality:
      "laterality" in body
        ? ({ set: (body.laterality ?? null) as Laterality | null } as any)
        : undefined,
    mechanism:
      "mechanism" in body
        ? ({ set: (body.mechanism ?? null) as Mechanism | null } as any)
        : undefined,
    severity:
      "severity" in body
        ? ({ set: (body.severity ?? null) as Severity | null } as any)
        : undefined,

    illSystem:
      "illSystem" in body
        ? ({ set: (body.illSystem ?? null) as SystemAffected | null } as any)
        : undefined,
    illSymptoms:
      "illSymptoms" in body ? { set: body.illSymptoms ?? null } : undefined,
    illContagious:
      "illContagious" in body
        ? { set: typeof body.illContagious === "boolean" ? body.illContagious : null }
        : undefined,
    illIsolationDays:
      "illIsolationDays" in body
        ? { set: body.illIsolationDays ?? null }
        : undefined,
    illAptitude:
      "illAptitude" in body
        ? ({ set: (body.illAptitude ?? null) as IllAptitude | null } as any)
        : undefined,
    feverMax: "feverMax" in body ? { set: body.feverMax ?? null } : undefined,

    startDate: "startDate" in body ? { set: startDate ?? null } : undefined,
    daysMin:
      "daysMin" in body ? { set: body.daysMin ?? null } : undefined,
    daysMax:
      "daysMax" in body ? { set: body.daysMax ?? null } : undefined,
    expectedReturn:
      "expectedReturn" in body ? { set: expectedReturn ?? null } : undefined,
    expectedReturnManual:
      "expectedReturnManual" in body
        ? { set: !!body.expectedReturnManual }
        : undefined,

    capMinutes:
      "capMinutes" in body ? { set: body.capMinutes ?? null } : undefined,
    noSprint: "noSprint" in body ? { set: !!body.noSprint } : undefined,
    noChangeOfDirection:
      "noChangeOfDirection" in body
        ? { set: !!body.noChangeOfDirection }
        : undefined,
    gymOnly: "gymOnly" in body ? { set: !!body.gymOnly } : undefined,
    noContact: "noContact" in body ? { set: !!body.noContact } : undefined,

    notes: "notes" in body ? { set: body.notes ?? null } : undefined,
    medSignature:
      "medSignature" in body ? { set: body.medSignature ?? null } : undefined,
    protocolObjectives:
      "protocolObjectives" in body
        ? { set: body.protocolObjectives ?? null }
        : undefined,
    protocolTasks:
      "protocolTasks" in body ? { set: body.protocolTasks ?? null } : undefined,
    protocolControls:
      "protocolControls" in body
        ? { set: body.protocolControls ?? null }
        : undefined,
    protocolCriteria:
      "protocolCriteria" in body
        ? { set: body.protocolCriteria ?? null }
        : undefined,
  };

  try {
    const updated = await prisma.clinicalEntry.update({
      where: { id },
      data,
      select: { id: true, status: true, date: true, updatedAt: true },
    });
    return NextResponse.json(
      {
        ok: true,
        id: updated.id,
        status: updated.status,
        date: toYMD(updated.date),
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: "Update failed", detail: e?.message },
      { status: 500 }
    );
  }
}

/* ---------------- (Opcional) DELETE por ID ------------------ */
export async function DELETE(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = (token as any)?.role as string | undefined;
  if (!token || !["MEDICO", "ADMIN"].includes(role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = ctx.params?.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    await prisma.clinicalEntry.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Delete failed", detail: e?.message },
      { status: 500 }
    );
  }
}
