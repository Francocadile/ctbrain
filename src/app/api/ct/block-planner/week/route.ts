import { NextResponse } from "next/server";
import { z } from "zod";
import { dbScope } from "@/lib/dbScope";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";

// ==== Helpers de fecha server-safe ====

// Convierte Date UTC a "YYYY-MM-DD" (usando campos UTC)
function toYMDUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Parsea "YYYY-MM-DD" a Date UTC (00:00:00Z)
function parseStartDate(start: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return null;
  const d = new Date(`${start}T00:00:00.000Z`);
  if (isNaN(d.getTime())) return null;
  return d;
}

// Normaliza una fecha cualquiera al lunes de esa semana (UTC)
function getMondayUTC(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0=Dom, 1=Lun, ...
  const diff = day === 0 ? -6 : 1 - day; // mover a lunes (Domingo -> -6)
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

const postSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "start debe ser YYYY-MM-DD"),
});

// GET /api/ct/block-planner/week?start=YYYY-MM-DD
export async function GET(req: Request) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const url = new URL(req.url);
    const start = url.searchParams.get("start") || "";
    const parsedStart = parseStartDate(start);
    const weekStartDate = parsedStart ? getMondayUTC(parsedStart) : null;
    if (!weekStartDate) {
      return NextResponse.json(
        { error: "Parámetro start inválido, usar YYYY-MM-DD (lunes UTC)" },
        { status: 400 },
      );
    }

    const weekStartYMD = toYMDUTC(weekStartDate);
    const normalizedWeekStart = new Date(`${weekStartYMD}T00:00:00.000Z`);

  const week = await prisma.blockPlanWeek.findFirst({
      where: {
        teamId: team.id,
        weekStart: normalizedWeekStart,
      },
      include: {
        days: {
          orderBy: { date: "asc" },
          include: {
            blocks: {
              orderBy: { order: "asc" },
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    const categories = await prisma.blockCategory.findMany({
      where: {
        teamId: team.id,
        isActive: true,
      },
      orderBy: {
        order: "asc",
      },
    });

    if (!week) {
      return NextResponse.json({
        week: null,
        categories,
      });
    }

    return NextResponse.json({
      week,
      categories,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("block-planner week GET error", error);
    return NextResponse.json(
      { error: error?.message || "Error" },
      { status: 500 },
    );
  }
}

// POST /api/ct/block-planner/week
// Body: { start: "YYYY-MM-DD" }
export async function POST(req: Request) {
  try {
    assertCsrf(req);

    const { prisma, team, user } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const body = await req.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { start } = parsed.data;
    const parsedStart = parseStartDate(start);
    const weekStartDate = parsedStart ? getMondayUTC(parsedStart) : null;
    if (!weekStartDate) {
      return NextResponse.json(
        { error: "Parámetro start inválido, usar YYYY-MM-DD (lunes UTC)" },
        { status: 400 },
      );
    }

    const weekStartYMD = toYMDUTC(weekStartDate);
    const normalizedWeekStart = new Date(`${weekStartYMD}T00:00:00.000Z`);

    const week = await prisma.blockPlanWeek.upsert({
      where: {
        teamId_weekStart: {
          teamId: team.id,
          weekStart: normalizedWeekStart,
        },
      },
      create: {
        teamId: team.id,
        weekStart: normalizedWeekStart,
        createdById: user.id,
      },
      update: {},
    });

    const existingDays = await prisma.blockPlanDay.findMany({
      where: { weekId: week.id },
    });
    const existingByYMD = new Set(existingDays.map((d) => toYMDUTC(d.date)));

    const daysToCreate: { weekId: string; date: Date }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(normalizedWeekStart);
      d.setUTCDate(d.getUTCDate() + i);
      const ymd = toYMDUTC(d);
      if (!existingByYMD.has(ymd)) {
        daysToCreate.push({
          weekId: week.id,
          date: new Date(`${ymd}T00:00:00.000Z`),
        });
      }
    }

    if (daysToCreate.length > 0) {
      await prisma.blockPlanDay.createMany({
        data: daysToCreate,
        skipDuplicates: true,
      });
    }

    const fullWeek = await prisma.blockPlanWeek.findUnique({
      where: { id: week.id },
      include: {
        days: {
          orderBy: { date: "asc" },
          include: {
            blocks: {
              orderBy: { order: "asc" },
              include: { category: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      week: fullWeek,
    });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("block-planner week POST error", error);
    return NextResponse.json(
      { error: error?.message || "Error" },
      { status: 500 },
    );
  }
}
