import { NextResponse } from "next/server";
import { z } from "zod";
import { dbScope } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

// Snapshot de datos de la sesión: lo hacemos bien permisivo
const sessionMetaSchema = z.object({
  type: z.string().optional().nullable(),
  space: z.string().optional().nullable(),
  // puede venir como número o como string ("22")
  players: z.union([z.number(), z.string()]).optional().nullable(),
  duration: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  // no validamos como URL estricta, solo string opcional
  imageUrl: z.string().optional().nullable(),
  sessionId: z.string().optional().nullable(),
});

const createSchema = z.object({
  name: z.string().min(2, "Nombre demasiado corto"),
  zone: z.string().optional().nullable(),
  videoUrl: z.string().url().optional().nullable(),
  usage: z.enum(["ROUTINE", "SESSION"]).default("ROUTINE"),
  originSessionId: z.string().optional().nullable(),
  sessionMeta: sessionMetaSchema.optional(),
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

  const { name, zone, videoUrl, usage, originSessionId, sessionMeta } = parsed.data;
    const trimmedName = name.trim();

    // 👉 1) Si ya existe un ejercicio de este equipo con mismo nombre y uso,
    // lo devolvemos y NO intentamos crear otro (evita el error de unique).
    const existing = await prisma.exercise.findFirst({
      where: {
        name: trimmedName,
        teamId: team.id,
        usage: usage as any,
      },
    });

    if (existing) {
      return NextResponse.json({ data: existing }, { status: 200 });
    }

    // 👉 2) Si no existe, lo creamos normalmente
    const created = await prisma.exercise.create({
      data: {
        name: trimmedName,
        zone: zone?.trim() || null,
        videoUrl: videoUrl?.trim() || null,
        usage: usage as any,
        teamId: team.id, // 👉 ejercicios de sesión siempre del equipo actual
        // originSessionId se persiste desde el editor de sesiones
        originSessionId: originSessionId ?? null,
        sessionMeta: sessionMeta ? (sessionMeta as any) : null,
      } as any,
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct exercises create error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
