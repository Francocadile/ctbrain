import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";

export const dynamic = "force-dynamic";

function parseWeekStart(url: URL): string | null {
  const raw = url.searchParams.get("weekStart");
  if (!raw) return null;
  // formato YYYY-MM-DD simple
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return raw;
}

function computeWeekDays(weekStart: string): string[] {
  const base = new Date(`${weekStart}T00:00:00.000Z`);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

// GET /api/ct/planner/day-type-assignments?weekStart=YYYY-MM-DD
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const weekStart = parseWeekStart(url);
    if (!weekStart) {
      return NextResponse.json({ error: "weekStart inválido" }, { status: 400 });
    }

    // Lectura permitida para CT, ADMIN y MEDICO
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN", "MEDICO"] as any });
    const days = computeWeekDays(weekStart);

    const rows = await prisma.plannerDayTypeAssignment.findMany({
      where: {
        teamId: team.id,
        ymd: { in: days },
      },
    });

    const assignments: Record<string, string> = {};
    for (const r of rows) {
      const key = `${r.ymd}::${r.turn}`;
      assignments[key] = r.dayTypeKey;
    }

    return NextResponse.json({ assignments });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct planner day-type-assignments GET error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

// PUT /api/ct/planner/day-type-assignments
export async function PUT(req: Request) {
  try {
    assertCsrf(req);
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const body = await req.json();

    const items: any[] = Array.isArray(body?.items) ? body.items : [];
    if (!items.length) {
      return NextResponse.json({ ok: true });
    }

    const allowedTurns = new Set(["morning", "afternoon"]);

    await prisma.$transaction(async (tx) => {
      for (let index = 0; index < items.length; index++) {
        const it = items[index];
        const ymd = typeof it?.ymd === "string" ? it.ymd.trim() : "";
        const turn = typeof it?.turn === "string" ? it.turn.trim() : "";
        const dayTypeKey = typeof it?.dayTypeKey === "string" ? it.dayTypeKey.trim().toUpperCase() : "";

        if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
          throw new Error(`items[${index}].ymd inválido`);
        }
        if (!allowedTurns.has(turn)) {
          throw new Error(`items[${index}].turn inválido`);
        }

        const where = { teamId: team.id, ymd, turn } as const;

        if (!dayTypeKey) {
          // delete assignment
          await tx.plannerDayTypeAssignment.deleteMany({ where });
          continue;
        }

        // validar que exista el tipo para este equipo
  const exists = await tx.plannerDayType.findFirst({
          where: { teamId: team.id, key: dayTypeKey },
          select: { id: true },
        });
        if (!exists) {
          throw new Error(`items[${index}].dayTypeKey desconocido: ${dayTypeKey}`);
        }

  await tx.plannerDayTypeAssignment.upsert({
          where: { teamId_ymd_turn: where },
          create: { ...where, dayTypeKey },
          update: { dayTypeKey },
        } as any);
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("ct planner day-type-assignments PUT error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 400 });
  }
}
