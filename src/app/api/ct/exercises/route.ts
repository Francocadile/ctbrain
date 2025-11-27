import { NextResponse } from "next/server";
import { z } from "zod";
import { dbScope } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(2, "Nombre demasiado corto"),
  zone: z.string().optional().nullable(),
  videoUrl: z.string().url().optional().nullable(),
  usage: z.enum(["ROUTINE", "SESSION"]).default("ROUTINE"),
});

// GET /api/ct/exercises
// Soporta ?usage=ROUTINE | SESSION para filtrar ejercicios por origen.
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const usageParam = url.searchParams.get("usage");

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

    return NextResponse.json({ data: exercises });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct exercises list error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

// POST /api/ct/exercises
// Crea un ejercicio en la biblioteca (por ahora lo usaremos para usage=SESSION).
export async function POST(req: Request) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, zone, videoUrl, usage } = parsed.data;

    const created = await prisma.exercise.create({
      data: {
        name: name.trim(),
        zone: zone?.trim() || null,
        videoUrl: videoUrl?.trim() || null,
        usage: usage as any,
        teamId: team.id, // 👉 ejercicios de sesión siempre del equipo actual
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct exercises create error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
