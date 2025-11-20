import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

// GET /api/ct/routines/[id]/sessions -> sessionIds asignadas a la rutina
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const routineId = params.id;

    const routine = await prisma.routine.findFirst({
      where: { id: routineId, teamId: team.id },
    });

    if (!routine) {
      return new NextResponse("routine not found", { status: 404 });
    }

  const links = await prisma.sessionRoutine.findMany({
      where: {
        routineId: routine.id,
        session: {
          teamId: team.id,
        },
      },
      select: {
        sessionId: true,
      },
    });

  const sessionIds = links.map((l: { sessionId: string }) => l.sessionId);

    return NextResponse.json({ sessionIds });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct routine sessions list error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

// PUT /api/ct/routines/[id]/sessions -> reemplazar asignaciones de sesiones
export async function PUT(req: Request, { params }: { params: { id: string } }) {
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
    const sessionIds = Array.isArray(body?.sessionIds)
      ? body.sessionIds.filter((id: unknown) => typeof id === "string" && id.trim())
      : [];

    // Cargamos solo sesiones del mismo equipo
  const sessions = await prisma.session.findMany({
      where: {
        id: { in: sessionIds },
        teamId: team.id,
      },
      select: { id: true },
    });

  const validSessionIds = sessions.map((s: { id: string }) => s.id);

    await prisma.$transaction([
      prisma.sessionRoutine.deleteMany({
        where: { routineId: routine.id },
      }),
      ...(validSessionIds.length
        ? [
            prisma.sessionRoutine.createMany({
              data: validSessionIds.map((sid: string) => ({
                routineId: routine.id,
                sessionId: sid,
              })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);

    return NextResponse.json({ ok: true, sessionIds: validSessionIds });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct routine sessions update error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
