import { NextResponse } from "next/server";
import { z } from "zod";
import { dbScope } from "@/lib/dbScope";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";

const updateSchema = z.object({
  order: z.number().int().optional(),
  categoryId: z.string().min(1).optional(),
  title: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  intensity: z.string().optional().nullable(),
});

// PATCH /api/ct/block-planner/blocks/[id] -> actualizar bloque
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    assertCsrf(req);
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Buscar el bloque incluyendo el día y la semana para verificar teamId
    const existing = await prisma.blockPlanBlock.findUnique({
      where: { id: params.id },
      include: {
        day: {
          include: {
            week: true,
          },
        },
        category: true,
      },
    } as any);

    if (!existing || (existing as any).day.week.teamId !== team.id) {
      return NextResponse.json(
        { error: "Bloque no encontrado para este equipo" },
        { status: 404 },
      );
    }

    const dataToUpdate: any = {};
    const { order, categoryId, title, notes, intensity } = parsed.data;

    if (order !== undefined) {
      dataToUpdate.order = order;
    }
    if (title !== undefined) {
      dataToUpdate.title = title?.trim() || null;
    }
    if (notes !== undefined) {
      dataToUpdate.notes = notes?.trim() || null;
    }
    if (intensity !== undefined) {
      dataToUpdate.intensity = intensity?.trim() || null;
    }

    if (categoryId !== undefined) {
      // Validar que la nueva categoría sea del mismo equipo
      const category = await prisma.blockCategory.findFirst({
        where: { id: categoryId, teamId: team.id },
      } as any);
      if (!category) {
        return NextResponse.json(
          { error: "Categoría no encontrada para este equipo" },
          { status: 404 },
        );
      }
      dataToUpdate.categoryId = categoryId;
    }

    const updated = await prisma.blockPlanBlock.update({
      where: { id: params.id },
      data: dataToUpdate,
      include: { category: true },
    } as any);

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("block-planner blocks PATCH error", error);
    return NextResponse.json(
      { error: error?.message || "Error" },
      { status: 500 },
    );
  }
}
