import { NextResponse } from "next/server";
import { dbScope, scopedFindManyArgs } from "@/lib/dbScope";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";

export const dynamic = "force-dynamic";

// GET /api/ct/programs -> lista de programas del equipo actual
export async function GET(req: Request) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const rows = await prisma.program.findMany(
      scopedFindManyArgs(team.id, {
        orderBy: [{ createdAt: "desc" }],
        include: {
          weeks: {
            orderBy: { weekNumber: "asc" },
            include: {
              days: { orderBy: { weekday: "asc" } },
            },
          },
        },
      }) as any,
    );

    const data = rows.map((p: any) => ({
      id: p.id,
      title: p.title,
      description: p.description ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      weeks: (p.weeks || []).map((w: any) => ({
        id: w.id,
        weekNumber: w.weekNumber,
        label: w.label ?? null,
        days: (w.days || []).map((d: any) => ({
          id: d.id,
          weekday: d.weekday,
          routineId: d.routineId,
          titleOverride: d.titleOverride ?? null,
        })),
      })),
    }));

    return NextResponse.json({ data });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct programs list error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

// POST /api/ct/programs -> crear programa { title, description? }
export async function POST(req: Request) {
  try {
    assertCsrf(req);
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const body = await req.json();

    const rawTitle = body?.title;
    const title = typeof rawTitle === "string" ? rawTitle.trim() : "";
    if (!title) return new NextResponse("title requerido", { status: 400 });

    const rawDescription = body?.description;
    const description =
      typeof rawDescription === "string" ? rawDescription.trim() || null : null;

    const row = await prisma.program.create({
      data: {
        teamId: team.id,
        title,
        description,
      },
    });

    const data = {
      id: row.id,
      title: row.title,
      description: row.description ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("ct programs create error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
