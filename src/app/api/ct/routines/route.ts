import { NextResponse } from "next/server";
import { dbScope, scopedFindManyArgs } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

// GET /api/ct/routines -> lista de rutinas del equipo actual
export async function GET(req: Request) {
  try {
  const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const rows = await prisma.routine.findMany(
      scopedFindManyArgs(team.id, {
        orderBy: [{ createdAt: "desc" }],
      }) as any,
    );

  const data = rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description ?? null,
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

// POST /api/ct/routines -> crear rutina { title, description }
export async function POST(req: Request) {
  try {
  const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const body = await req.json();

    const rawTitle = body?.title;
    const title = typeof rawTitle === "string" ? rawTitle.trim() : "";
    if (!title) {
      return new NextResponse("title requerido", { status: 400 });
    }

    const rawDescription = body?.description;
    const description = typeof rawDescription === "string" ? rawDescription.trim() || null : null;

    const row = await prisma.routine.create({
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
    if (error instanceof Response) return error;
    console.error("ct routines create error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
