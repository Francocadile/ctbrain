import { NextResponse } from "next/server";
import { z } from "zod";
import { dbScope } from "@/lib/dbScope";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";

const createSchema = z.object({
  dayId: z.string().min(1, "dayId requerido"),
  categoryId: z.string().min(1, "categoryId requerido"),
  order: z.number().int().optional(),
  title: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  intensity: z.string().optional().nullable(),
});

// POST /api/ct/block-planner/blocks -> crear bloque en un día
export async function POST(req: Request) {
  try {
    assertCsrf(req);
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { dayId, categoryId, order, title, notes, intensity } = parsed.data;

    // Validar que el día pertenezca al equipo actual
    const day = await prisma.blockPlanDay.findUnique({
      where: { id: dayId },
      include: {
        week: true,
      },
    } as any);

    if (!day || !(day as any).week || (day as any).week.teamId !== team.id) {
      return NextResponse.json(
        { error: "Día no encontrado para este equipo" },
        { status: 404 },
      );
    }

    // Validar que la categoría exista y sea del team actual
    const category = await prisma.blockCategory.findFirst({
      where: { id: categoryId, teamId: team.id },
    } as any);

    if (!category) {
      return NextResponse.json(
        { error: "Categoría no encontrada para este equipo" },
        { status: 404 },
      );
    }

    // Calcular order por defecto dentro del día
    let finalOrder = order;
    if (finalOrder === undefined) {
      const max = await prisma.blockPlanBlock.findFirst({
        where: { dayId },
        orderBy: { order: "desc" },
        select: { order: true },
      } as any);
      finalOrder = ((max as any)?.order ?? 0) + 1;
    }

    const created = await prisma.blockPlanBlock.create({
      data: {
        dayId,
        categoryId,
        order: finalOrder,
        title: title?.trim() || null,
        notes: notes?.trim() || null,
        intensity: intensity?.trim() || null,
      },
      include: { category: true },
    } as any);

    return NextResponse.json({ data: created });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("block-planner blocks POST error", error);
    return NextResponse.json(
      { error: error?.message || "Error" },
      { status: 500 },
    );
  }
}
