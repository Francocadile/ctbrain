import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

// GET /api/ct/exercises -> lista ejercicios globales y del equipo actual
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const usageParam = searchParams.get("usage");

    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const where: any = {
      OR: [{ teamId: null }, { teamId: team.id }],
    };

    if (usageParam === "ROUTINE" || usageParam === "SESSION") {
      where.usage = usageParam;
    }

    const exercises = await prisma.exercise.findMany({
      where,
      orderBy: { name: "asc" },
    });

    const data = exercises.map((e: any) => ({
      id: e.id,
      teamId: e.teamId,
      name: e.name,
      zone: e.zone,
      videoUrl: e.videoUrl,
      usage: e.usage ?? null,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }));

    return NextResponse.json({ data });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct exercises list error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
