import { NextResponse } from "next/server";
import { dbScope, scopedFindManyArgs } from "@/lib/dbScope";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";

export const dynamic = "force-dynamic";

// GET /api/ct/routine-programs -> lista de programas del team actual
export async function GET(req: Request) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const p: any = prisma;

    const rows = await p.routineProgram.findMany(
      scopedFindManyArgs(team.id, {
        orderBy: [{ updatedAt: "desc" }],
        include: {
          _count: {
            select: {
              days: true,
            },
          },
        },
      }) as any,
    );

    const data = rows.map((p: any) => ({
      id: p.id,
      title: p.title,
      description: p.description ?? null,
      daysCount: p._count?.days ?? 0,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    return NextResponse.json({ data });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct routine programs list error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

// POST /api/ct/routine-programs -> crear programa { title, description }
export async function POST(req: Request) {
  try {
    assertCsrf(req);
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const p: any = prisma;

    const body = await req.json().catch(() => null);

    const rawTitle = (body as any)?.title;
    const title = typeof rawTitle === "string" ? rawTitle.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "title requerido" }, { status: 400 });
    }

    const rawDescription = (body as any)?.description;
    const description =
      typeof rawDescription === "string" ? rawDescription.trim() || null : null;

    const row = await p.routineProgram.create({
      data: {
        teamId: team.id,
        title,
        description,
      },
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        data: {
          id: row.id,
          title: row.title,
          description: row.description ?? null,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("ct routine programs create error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
