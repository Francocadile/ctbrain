import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { dbScope } from "@/lib/dbScope";

// Helper: obtiene rutina validando team/rol CT-ADMIN
async function getScopedRoutine(routineId: string) {
  const { team } = await dbScope({ roles: ["CT", "ADMIN"] as any });

  const routine = await prisma.routine.findFirst({
    where: { id: routineId, teamId: team.id },
    select: { id: true, teamId: true },
  });

  if (!routine) {
    return { teamId: team.id, routine: null } as const;
  }

  return { teamId: team.id, routine } as const;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const routineId = params.id;
  if (!routineId) {
    return NextResponse.json({ error: "routineId requerido" }, { status: 400 });
  }

  try {
    const { teamId, routine } = await getScopedRoutine(routineId);
    if (!routine) {
      return NextResponse.json({ error: "Rutina no encontrada" }, { status: 404 });
    }

    const sessions = await prisma.session.findMany({
      where: { teamId, description: { contains: routineId } },
      select: { id: true },
    });

    return NextResponse.json({ sessionIds: sessions.map((s) => s.id) });
  } catch (error: any) {
    console.error("GET /api/ct/routines/[id]/sessions error", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const routineId = params.id;
  if (!routineId) {
    return NextResponse.json({ error: "routineId requerido" }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => null);
    const rawSessionIds = Array.isArray((body as any)?.sessionIds)
      ? (body as any).sessionIds
      : [];

    const sessionIds: string[] = rawSessionIds
      .map((x: unknown) => (typeof x === "string" ? x.trim() : ""))
      .filter((x: string) => !!x);

    const { teamId, routine } = await getScopedRoutine(routineId);
    if (!routine) {
      return NextResponse.json({ error: "Rutina no encontrada" }, { status: 404 });
    }

    // Buscar sesiones válidas del mismo equipo
    const sessions = await prisma.session.findMany({
      where: {
        id: { in: sessionIds },
        teamId,
      },
      select: { id: true },
    });

    const validSessionIds = sessions.map((s) => s.id);

    // Determinar nuevas sesiones (para snapshot). De momento, no persistimos aún el vínculo lista-completa,
    // solo usamos esto como disparador para snapshot.
  const existingSnapshots = await prisma.sessionRoutineItem.findMany({
      where: { routineId, sessionId: { in: validSessionIds } },
      select: { sessionId: true },
    });

    const alreadySnapshotted = new Set<string>(existingSnapshots.map((s) => s.sessionId));
    const newSessionIds = validSessionIds.filter((id) => !alreadySnapshotted.has(id));

    if (newSessionIds.length > 0) {
      // Cargar rutina completa con bloques e items
      const fullRoutine = await prisma.routine.findFirst({
        where: { id: routineId, teamId },
        include: {
          blocks: {
            orderBy: { order: "asc" },
            include: { items: { orderBy: { order: "asc" } } },
          },
          items: {
            where: { blockId: null },
            orderBy: { order: "asc" },
          },
        },
      });

      if (!fullRoutine) {
        return NextResponse.json({ error: "Rutina no encontrada" }, { status: 404 });
      }

      // Política actual: si ya había snapshots para esa rutina+sesión, NO los tocamos.
      // Solo generamos para las nuevas sesiones.

      const createData: {
        sessionId: string;
        routineId: string;
        routineItemId: string;
        blockName: string | null;
        blockType: string | null;
        title: string;
        sets: number | null;
        reps: number | null;
        load: string | null;
        tempo: string | null;
        rest: string | null;
        notes: string | null;
        athleteNotes: string | null;
        order: number;
      }[] = [];

      for (const sessionId of newSessionIds) {
        let order = 1;

        for (const block of fullRoutine.blocks) {
          for (const it of block.items) {
            createData.push({
              sessionId,
              routineId: fullRoutine.id,
              routineItemId: it.id,
              blockName: block.name || "Bloque",
              blockType: block.type ? String(block.type) : null,
              title: it.exerciseName || it.title || "Ejercicio",
              sets: it.sets ?? null,
              reps: it.reps ?? null,
              load: it.load ?? null,
              tempo: it.tempo ?? null,
              rest: it.rest ?? null,
              notes: it.notes ?? null,
              athleteNotes: it.athleteNotes ?? null,
              order,
            });
            order += 1;
          }
        }

        // Items sin bloque
        for (const it of fullRoutine.items) {
          createData.push({
            sessionId,
            routineId: fullRoutine.id,
            routineItemId: it.id,
            blockName: "Sin bloque",
            blockType: null,
            title: it.exerciseName || it.title || "Ejercicio",
            sets: it.sets ?? null,
            reps: it.reps ?? null,
            load: it.load ?? null,
            tempo: it.tempo ?? null,
            rest: it.rest ?? null,
            notes: it.notes ?? null,
            athleteNotes: it.athleteNotes ?? null,
            order,
          });
          order += 1;
        }
      }

      if (createData.length > 0) {
        await prisma.sessionRoutineItem.createMany({ data: createData, skipDuplicates: true });
      }
    }

    // Devolvemos las sesiones válidas asociadas según el payload; la política de limpieza de snapshots
    // para sesiones removidas se deja para una fase posterior.
    return NextResponse.json({ sessionIds: validSessionIds });
  } catch (error: any) {
    console.error("PUT /api/ct/routines/[id]/sessions error", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
