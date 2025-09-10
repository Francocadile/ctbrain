// src/app/api/med/clinical/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import {
  Role,
  ClinicalStatus,
  LeaveStage,
  ConditionType,
  Laterality,
  Mechanism,
  Severity,
  DiseaseSystem,
  ActivityAllowance,
} from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =======================
   Helpers de fechas
======================= */
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

/* =======================
   Auth helpers
======================= */
async function getRoleAndUserId(req: Request) {
  const nreq = NextRequest.from(req);
  const token = await getToken({ req: nreq, secret: process.env.NEXTAUTH_SECRET });
  const role = (token as any)?.role as Role | undefined;
  const userId = (token as any)?.sub as string | undefined;
  return { role, userId, hasToken: !!token };
}
function allowGet(role?: Role) {
  // GET: MEDICO, ADMIN y CT pueden leer
  return role === Role.MEDICO || role === Role.ADMIN || role === Role.CT;
}
function allowPost(role?: Role) {
  // POST: solo MEDICO o ADMIN
  return role === Role.MEDICO || role === Role.ADMIN;
}

/* =======================
   GET /api/med/clinical?date=YYYY-MM-DD
   - Lee parte del día para tableros Médico/CT
======================= */
export async function GET(req: Request) {
  const { role, hasToken } = await getRoleAndUserId(req);
  if (!hasToken || !allowGet(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");

  const baseDate =
    parseYMD(dateStr) ?? // preferible YYYY-MM-DD
    (dateStr ? new Date(dateStr) : new Date()); // fallback ISO

  const from = startOfDay(baseDate);
  const to = nextDay(baseDate);

  const rows = await prisma.clinicalEntry.findMany({
    where: { date: { gte: from, lt: to } },
    select: {
      id: true,
      userId: true,
      date: true,
      status: true,

      // BAJA
      leaveStage: true,
      condition: true,

      // Lesión
      diagnosis: true,
      bodyPart: true,
      laterality: true,
      mechanism: true,
      severity: true,

      // Enfermedad
      diseaseSystem: true,
      diseaseSymptoms: true,
      contagious: true,
      isolationDays: true,
      activityAllowance: true,
      feverMaxC: true,

      // Cronología
      startDate: true,
      daysMin: true,
      daysMax: true,
      expectedReturn: true,
      etrManual: true,

      // Restricciones
      capMinutes: true,
      noSprint: true,
      noChangeOfDirection: true,
      gymOnly: true,
      noContact: true,

      // Documentación / plan
      notes: true,
      medSignedById: true,
      medSignedAt: true,
      protocolObjectives: true,
      protocolTasks: true,
      protocolControls: true,
      protocolCriteria: true,

      user: { select: { name: true, email: true } },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  const mapped = rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.user?.name || r.user?.email || "—",
    date: toYMD(r.date),
    status: r.status,

    leaveStage: r.leaveStage,
    condition: r.condition,

    diagnosis: r.diagnosis,
    bodyPart: r.bodyPart,
    laterality: r.laterality,
    mechanism: r.mechanism,
    severity: r.severity,

    diseaseSystem: r.diseaseSystem,
    diseaseSymptoms: r.diseaseSymptoms,
    contagious: r.contagious,
    isolationDays: r.isolationDays,
    activityAllowance: r.activityAllowance,
    feverMaxC: r.feverMaxC,

    startDate: r.startDate ? toYMD(r.startDate) : null,
    daysMin: r.daysMin,
    daysMax: r.daysMax,
    expectedReturn: r.expectedReturn ? toYMD(r.expectedReturn) : null,
    etrManual: r.etrManual,

    capMinutes: r.capMinutes,
    noSprint: r.noSprint,
    noChangeOfDirection: r.noChangeOfDirection,
    gymOnly: r.gymOnly,
    noContact: r.noContact,

    notes: r.notes,
    medSignedById: r.medSignedById,
    medSignedAt: r.medSignedAt.toISOString(),

    protocolObjectives: r.protocolObjectives,
    protocolTasks: r.protocolTasks,
    protocolControls: r.protocolControls,
    protocolCriteria: r.protocolCriteria,
  }));

  return NextResponse.json(mapped, { headers: { "cache-control": "no-store" } });
}

/* =======================
   POST /api/med/clinical
   - Upsert lógico (userId + date)
   - Solo MEDICO/ADMIN
   - Reglas:
     · BAJA ⇒ limpiar restricciones
     · ALTA ⇒ ocultar restricciones (también las limpiamos)
     · Si daysMin/Max y no etrManual ⇒ calculamos expectedReturn
======================= */
export async function POST(req: Request) {
  const { role, userId: medUserId, hasToken } = await getRoleAndUserId(req);
  if (!hasToken || !allowPost(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // --- userId destino (jugador) ---
    const targetUserId: string | undefined = body.userId;
    if (!targetUserId) {
      return NextResponse.json({ error: "Falta userId del jugador" }, { status: 400 });
    }
    const player = await prisma.user.findFirst({
      where: { id: targetUserId, role: Role.JUGADOR },
      select: { id: true },
    });
    if (!player) {
      return NextResponse.json({ error: "userId inválido: debe ser JUGADOR" }, { status: 400 });
    }

    // --- fecha del registro (día) ---
    const baseDay =
      parseYMD(body.date) ??
      (body.date ? new Date(body.date) : new Date());
    const day = startOfDay(baseDay);
    const dayTo = nextDay(baseDay);

    // --- status ---
    const status = (body.status as ClinicalStatus) ?? ClinicalStatus.BAJA;
    const isBaja = status === ClinicalStatus.BAJA;
    const isAlta = status === ClinicalStatus.ALTA;
    const isRtpOrLimit = status === ClinicalStatus.REINTEGRO || status === ClinicalStatus.LIMITADO;

    // --- cronología / ETR ---
    const startDate =
      parseYMD(body.startDate) ??
      (body.startDate ? new Date(body.startDate) : null);

    const daysMin: number | null =
      typeof body.daysMin === "number" ? body.daysMin : (body.daysMin ? Number(body.daysMin) : null);
    const daysMax: number | null =
      typeof body.daysMax === "number" ? body.daysMax : (body.daysMax ? Number(body.daysMax) : null);

    let expectedReturn: Date | null =
      parseYMD(body.expectedReturn) ??
      (body.expectedReturn ? new Date(body.expectedReturn) : null);

    const etrManual: boolean = !!body.etrManual;

    // Si NO es manual y hay startDate + (daysMax || daysMin) ⇒ autocalcular
    if (!etrManual && startDate) {
      const base = new Date(startDate);
      if (typeof daysMax === "number") {
        const calc = new Date(base);
        calc.setDate(calc.getDate() + daysMax);
        expectedReturn = calc;
      } else if (typeof daysMin === "number") {
        const calc = new Date(base);
        calc.setDate(calc.getDate() + daysMin);
        expectedReturn = calc;
      }
    }

    // --- restricciones ---
    // Si BAJA o ALTA ⇒ limpiar restricciones
    const restrictions = isRtpOrLimit
      ? {
          capMinutes:
            body.capMinutes === "" || body.capMinutes === null || typeof body.capMinutes === "undefined"
              ? null
              : Number(body.capMinutes),
          noSprint: !!body.noSprint,
          noChangeOfDirection: !!body.noChangeOfDirection,
          gymOnly: !!body.gymOnly,
          noContact: !!body.noContact,
        }
      : {
          capMinutes: null,
          noSprint: false,
          noChangeOfDirection: false,
          gymOnly: false,
          noContact: false,
        };

    // --- condición BAJA (lesión o enfermedad) ---
    const condition: ConditionType | null = isBaja ? (body.condition as ConditionType) ?? null : null;
    const leaveStage: LeaveStage | null = isBaja ? (body.leaveStage as LeaveStage) ?? null : null;

    // Lesión
    const lesionBlock = isBaja && condition === ConditionType.LESION
      ? {
          diagnosis: body.diagnosis ?? null,
          bodyPart: body.bodyPart ?? null,
          laterality: (body.laterality as Laterality) ?? null,
          mechanism: (body.mechanism as Mechanism) ?? null,
          severity: (body.severity as Severity) ?? null,
        }
      : {
          diagnosis: null,
          bodyPart: null,
          laterality: null,
          mechanism: null,
          severity: null,
        };

    // Enfermedad
    const diseaseBlock = isBaja && condition === ConditionType.ENFERMEDAD
      ? {
          diseaseSystem: (body.diseaseSystem as DiseaseSystem) ?? null,
          diseaseSymptoms: body.diseaseSymptoms ?? null,
          contagious: typeof body.contagious === "boolean" ? body.contagious : null,
          isolationDays:
            body.isolationDays === "" || typeof body.isolationDays === "undefined" || body.isolationDays === null
              ? null
              : Number(body.isolationDays),
          activityAllowance: (body.activityAllowance as ActivityAllowance) ?? null,
          feverMaxC:
            body.feverMaxC === "" || typeof body.feverMaxC === "undefined" || body.feverMaxC === null
              ? null
              : Number(body.feverMaxC),
        }
      : {
          diseaseSystem: null,
          diseaseSymptoms: null,
          contagious: null,
          isolationDays: null,
          activityAllowance: null,
          feverMaxC: null,
        };

    // --- firma médica ---
    // Tomamos el usuario autenticado como firmante.
    const medSignedById = medUserId!;
    const medSignedAt = new Date();

    // --- datos comunes (create) ---
    const createData = {
      userId: player.id,
      date: day,
      status: status as ClinicalStatus,

      leaveStage,
      condition,

      ...lesionBlock,
      ...diseaseBlock,

      startDate,
      daysMin,
      daysMax,
      expectedReturn,
      etrManual,

      ...restrictions,

      notes: body.notes ?? null,

      medSignedById,
      medSignedAt,

      protocolObjectives: body.protocolObjectives ?? null,
      protocolTasks: body.protocolTasks ?? null,
      protocolControls: body.protocolControls ?? null,
      protocolCriteria: body.protocolCriteria ?? null,
    };

    // --- datos para update:
    // Para campos enum/nullable en UPDATE usamos { set: ... } para evitar errores TS.
    const updateData = {
      status: { set: status as ClinicalStatus },

      leaveStage: { set: leaveStage as LeaveStage | null },
      condition: { set: condition as ConditionType | null },

      diagnosis: { set: lesionBlock.diagnosis },
      bodyPart: { set: lesionBlock.bodyPart },
      laterality: { set: lesionBlock.laterality as Laterality | null },
      mechanism: { set: lesionBlock.mechanism as Mechanism | null },
      severity: { set: lesionBlock.severity as Severity | null },

      diseaseSystem: { set: diseaseBlock.diseaseSystem as DiseaseSystem | null },
      diseaseSymptoms: { set: diseaseBlock.diseaseSymptoms },
      contagious: { set: diseaseBlock.contagious as boolean | null },
      isolationDays: { set: diseaseBlock.isolationDays as number | null },
      activityAllowance: { set: diseaseBlock.activityAllowance as ActivityAllowance | null },
      feverMaxC: { set: diseaseBlock.feverMaxC as number | null },

      startDate: { set: startDate },
      daysMin: { set: daysMin as number | null },
      daysMax: { set: daysMax as number | null },
      expectedReturn: { set: expectedReturn },
      etrManual: { set: etrManual },

      capMinutes: { set: restrictions.capMinutes as number | null },
      noSprint: { set: restrictions.noSprint },
      noChangeOfDirection: { set: restrictions.noChangeOfDirection },
      gymOnly: { set: restrictions.gymOnly },
      noContact: { set: restrictions.noContact },

      notes: { set: body.notes ?? null },

      medSignedById: { set: medSignedById },
      medSignedAt: { set: medSignedAt },

      protocolObjectives: { set: body.protocolObjectives ?? null },
      protocolTasks: { set: body.protocolTasks ?? null },
      protocolControls: { set: body.protocolControls ?? null },
      protocolCriteria: { set: body.protocolCriteria ?? null },
    };

    // --- upsert lógico por (userId + día) ---
    const existing = await prisma.clinicalEntry.findFirst({
      where: { userId: player.id, date: { gte: day, lt: dayTo } },
      select: { id: true },
    });

    const saved = existing
      ? await prisma.clinicalEntry.update({
          where: { id: existing.id },
          data: updateData,
        })
      : await prisma.clinicalEntry.create({ data: createData });

    return NextResponse.json(saved, {
      status: existing ? 200 : 201,
      headers: { "cache-control": "no-store" },
    });
  } catch (e: any) {
    console.error("POST /api/med/clinical error:", e);
    return NextResponse.json(
      { error: e?.message || "Error guardando parte clínico" },
      { status: 500 }
    );
  }
}
