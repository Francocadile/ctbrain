import { NextResponse } from "next/server";
import { z } from "zod";
import { dbScope } from "@/lib/dbScope";

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
  })
  .optional()
  .nullable();

const updateSchema = z.object({
  name: z.string().min(2, "Nombre demasiado corto").optional(),
  zone: z.string().optional().nullable(),
  videoUrl: z.string().url().optional().nullable(),
  originSessionId: z.string().optional().nullable(),
  sessionMeta: sessionMetaSchema,
});

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await prisma.exercise.findFirst({
      where: { id: params.id, teamId: team.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Ejercicio no encontrado" }, { status: 404 });
    }

  const { name, zone, videoUrl, originSessionId, sessionMeta } = parsed.data;

    const updated = await prisma.exercise.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(zone !== undefined ? { zone: zone?.trim() || null } : {}),
        ...(videoUrl !== undefined ? { videoUrl: videoUrl?.trim() || null } : {}),
        ...(originSessionId !== undefined ? { originSessionId: originSessionId || null } : {}),
        ...(sessionMeta !== undefined ? { sessionMeta: (sessionMeta ?? null) as any } : {}),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct exercises update error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const existing = await prisma.exercise.findFirst({
      where: { id: params.id, teamId: team.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Ejercicio no encontrado" }, { status: 404 });
    }

    await prisma.exercise.delete({ where: { id: existing.id } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct exercises delete error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
