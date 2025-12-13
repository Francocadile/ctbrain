import { NextResponse } from "next/server";
import { dbScope, scopedFindManyArgs } from "@/lib/dbScope";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";

export const dynamic = "force-dynamic";

// GET /api/ct/routines -> lista de rutinas del equipo actual
export async function GET(req: Request) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const rows = await prisma.routine.findMany(
      scopedFindManyArgs(team.id, {
        orderBy: [{ createdAt: "desc" }],
        include: {
          _count: {
            select: {
              blocks: true,
              items: true,
            },
          },
        },
      }) as any,
    );

    const data = rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description ?? null,
      goal: r.goal ?? null,
      visibility: r.visibility ?? null,
      notesForAthlete: r.notesForAthlete ?? null,
      blocksCount: r._count?.blocks ?? 0,
      itemsCount: r._count?.items ?? 0,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return NextResponse.json({ data });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct routines list error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

// POST /api/ct/routines -> crear rutina { title, description, goal, visibility, notesForAthlete }
export async function POST(req: Request) {
  try {
    assertCsrf(req);
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const body = await req.json();

    const rawTitle = body?.title;
    const title = typeof rawTitle === "string" ? rawTitle.trim() : "";
    if (!title) {
      return new NextResponse("title requerido", { status: 400 });
    }

    const rawDescription = body?.description;
    const description =
      typeof rawDescription === "string" ? rawDescription.trim() || null : null;

    const rawGoal = body?.goal;
    const goal = typeof rawGoal === "string" ? rawGoal.trim() || null : null;

    const rawVisibility = body?.visibility;
    const visibility =
      rawVisibility === "STAFF_ONLY" || rawVisibility === "PLAYER_VISIBLE"
        ? rawVisibility
        : undefined; // deja que Prisma use el default

    const rawNotesForAthlete = body?.notesForAthlete;
    const notesForAthlete =
      typeof rawNotesForAthlete === "string" ? rawNotesForAthlete.trim() || null : null;

    const row = await prisma.routine.create({
      data: {
        teamId: team.id,
        title,
        description,
        goal,
        notesForAthlete,
        ...(visibility ? { visibility } : {}),
      },
    });

  const data = {
      id: row.id,
      title: row.title,
      description: row.description ?? null,
      goal: row.goal ?? null,
      visibility: row.visibility ?? null,
      notesForAthlete: row.notesForAthlete ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("ct routines create error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
