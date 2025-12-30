import { NextResponse } from "next/server";
import { z } from "zod";
import { dbScope } from "@/lib/dbScope";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";

const createSchema = z.object({
  key: z.string().min(1, "Key requerida"),
  label: z.string().min(1, "Label requerido"),
  color: z.string().optional().nullable(),
  order: z.number().int().optional(),
});

// GET: listar categorías del team ordenadas por order
export async function GET(req: Request) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const categories = await prisma.blockCategory.findMany({
      where: { teamId: team.id },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ data: categories });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("block-planner categories GET error", error);
    return NextResponse.json(
      { error: error?.message || "Error" },
      { status: 500 },
    );
  }
}

// POST: crear categoría (key única por team)
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

    const rawKey = parsed.data.key;
    const key = rawKey.trim().toUpperCase().replace(/\s+/g, "_");
    if (!/^[A-Z0-9_]+$/.test(key)) {
      return NextResponse.json(
        { error: "Key inválida: usar solo A-Z, 0-9 y _ (ej: TOP_SPEED)" },
        { status: 400 },
      );
    }
    const { label, color, order } = parsed.data;

    let finalOrder = order;
    if (finalOrder === undefined) {
      const max = await prisma.blockCategory.findFirst({
        where: { teamId: team.id },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      finalOrder = (max?.order ?? 0) + 1;
    }

    try {
      const created = await prisma.blockCategory.create({
        data: {
          teamId: team.id,
          key,
          label: label.trim(),
          color: color?.trim() || null,
          order: finalOrder,
          isActive: true,
        },
      });

      return NextResponse.json({ data: created });
    } catch (e: any) {
      if (e?.code === "P2002") {
        return NextResponse.json(
          { error: "Ya existe una categoría con esa key para este equipo" },
          { status: 409 },
        );
      }
      throw e;
    }
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("block-planner categories POST error", error);
    return NextResponse.json(
      { error: error?.message || "Error" },
      { status: 500 },
    );
  }
}
