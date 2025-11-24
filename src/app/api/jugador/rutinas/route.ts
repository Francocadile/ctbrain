import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("No autenticado", { status: 401 });
    }
    if (session.user.role !== "JUGADOR") {
      return new NextResponse("No autorizado", { status: 403 });
    }

    const userId = session.user.id;

    const routines = await prisma.routine.findMany({
      where: {
        OR: [
          { shareMode: "ALL_PLAYERS" },
          {
            shareMode: "SELECTED_PLAYERS",
            sharedWithPlayers: {
              some: { playerId: userId },
            },
          },
        ],
      },
      include: {
        blocks: true,
        items: true,
      },
      orderBy: { createdAt: "desc" },
    } as any);

    const data = (routines as any[]).map((r) => ({
      id: r.id,
      title: r.title,
      goal: r.goal ?? null,
      description: r.description ?? null,
      notesForAthlete: r.notesForAthlete ?? null,
      createdAt: r.createdAt.toISOString(),
      blocks: (r.blocks || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        order: b.order,
        description: b.description ?? null,
      })),
      items: (r.items || []).map((it: any) => ({
        id: it.id,
        blockId: it.blockId ?? null,
        title: it.title,
        description: it.description ?? null,
        order: it.order,
        exerciseName: it.exerciseName ?? null,
        sets: it.sets ?? null,
        reps: it.reps ?? null,
        load: it.load ?? null,
        tempo: it.tempo ?? null,
        rest: it.rest ?? null,
        notes: it.notes ?? null,
        athleteNotes: it.athleteNotes ?? null,
        videoUrl: it.videoUrl ?? null,
      })),
    }));

    return NextResponse.json({ data });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("jugador rutinas error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
