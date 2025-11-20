import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

// POST /api/ct/routines/[id]/blocks -> crear RoutineBlock
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

    const rawName = body?.name;
    const name = typeof rawName === "string" ? rawName.trim() : "";
    if (!name) {
      return new NextResponse("name requerido", { status: 400 });
    }

    const rawDescription = body?.description;
    const description =
      typeof rawDescription === "string" ? rawDescription.trim() || null : null;

    let order: number;
    if (typeof body?.order === "number") {
      order = body.order;
    } else {
      const last = await prisma.routineBlock.findFirst({
        where: { routineId: routine.id },
        orderBy: { order: "desc" },
      });
      order = last ? last.order + 1 : 1;
    }

    const block = await prisma.routineBlock.create({
      data: {
        routineId: routine.id,
        name,
        description,
        order,
      },
    });

    const data = {
      id: block.id,
      routineId: block.routineId,
      name: block.name,
      order: block.order,
      description: block.description ?? null,
    };

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct routine block create error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
