import { NextResponse } from "next/server";
import { z } from "zod";
import { dbScope } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

const sessionMetaSchema = z
  .object({
    type: z.string().optional().nullable(),
    space: z.string().optional().nullable(),
    // ✅ Aceptar número o string
    players: z.union([z.number(), z.string()]).optional().nullable(),
    duration: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    sessionId: z.string().optional().nullable(),
    routineId: z.string().optional().nullable(),
    routineName: z.string().optional().nullable(),
    diagram: z.unknown().optional().nullable(),
  })
  .optional()
  .nullable();

const createSchema = z.object({
  name: z.string().min(2, "Nombre demasiado corto"),
  zone: z.string().optional().nullable(),
  videoUrl: z.string().url().optional().nullable(),
  usage: z.enum(["ROUTINE", "SESSION"]).default("ROUTINE"),
  originSessionId: z.string().optional().nullable(),
  sessionMeta: sessionMetaSchema,
});

// 👉 GET con filtro opcional originSessionId
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const usageParam = url.searchParams.get("usage");
    const originSessionId = url.searchParams.get("originSessionId");

    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const where: any = {
      OR: [{ teamId: null }, { teamId: team.id }],
    };

    if (usageParam === "ROUTINE" || usageParam === "SESSION") {
      where.usage = usageParam;
    }

    if (originSessionId) {
      where.originSessionId = originSessionId;
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

    const effectiveOriginSessionId =
      originSessionId ??
      (sessionMeta && typeof sessionMeta === "object"
        ? ((sessionMeta as any)?.sessionId ?? null)
        : null);

    // 🧠 CASO 1: ejercicios de sesión (usage === "SESSION")
    // Si ya existe un ejercicio para esta sesión (originSessionId + teamId + usage),
    // lo ACTUALIZAMOS en lugar de crear uno nuevo.
    if (usage === "SESSION" && effectiveOriginSessionId) {
      const existing = await prisma.exercise.findFirst({
        where: {
          teamId: team.id,
          usage: usage as any,
          originSessionId: effectiveOriginSessionId,
        },
      });

      if (existing) {
        const updated = await prisma.exercise.update({
          where: { id: existing.id },
          data: {
            name: trimmedName,
            zone: zone?.trim() || null,
            videoUrl: videoUrl?.trim() || null,
            originSessionId: effectiveOriginSessionId,
            sessionMeta: sessionMeta ? (sessionMeta as any) : null,
          } as any,
        });

        return NextResponse.json({ data: updated }, { status: 200 });
      }
    }

    // 🧠 CASO 2: usos distintos de "SESSION" (ej: ROUTINE)
    // Mantenemos la idempotencia por (name + teamId + usage).
    if (usage !== "SESSION") {
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
    }

    // 🧠 CASO 3: no se encontró nada que actualizar → creamos un ejercicio nuevo
    const created = await prisma.exercise.create({
      data: {
        name: trimmedName,
        zone: zone?.trim() || null,
        videoUrl: videoUrl?.trim() || null,
        usage: usage as any,
        teamId: team.id,
        originSessionId: effectiveOriginSessionId ?? null,
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
