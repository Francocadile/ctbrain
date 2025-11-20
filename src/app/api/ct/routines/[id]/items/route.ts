import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

// POST /api/ct/routines/[id]/items -> crear RoutineItem
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const routineId = params.id;

    const routine = await prisma.routine.findFirst({
      where: { id: routineId, teamId: team.id },
    });

    if (!routine) {
      return new NextResponse("routine not found", { status: 404 });
    }

    const body = await req.json();

    const rawTitle = body?.title;
    const title = typeof rawTitle === "string" ? rawTitle.trim() : "";
    if (!title) {
      return new NextResponse("title requerido", { status: 400 });
    }

    const rawDescription = body?.description;
    const description = typeof rawDescription === "string" ? rawDescription.trim() || null : null;

    const order = typeof body?.order === "number" ? body.order : 0;

    const item = await prisma.routineItem.create({
      data: {
        routineId: routine.id,
        title,
        description,
        order,
      },
    });

    const data = {
      id: item.id,
      title: item.title,
      description: item.description ?? null,
      order: item.order,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct routine item create error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
