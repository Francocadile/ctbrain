import { NextResponse } from "next/server";
import { z } from "zod";
import { dbScope } from "@/lib/dbScope";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";

const updateSchema = z.object({
  label: z.string().min(1).optional(),
  color: z.string().optional().nullable(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

// PATCH: editar label/color/order/isActive (key NO se cambia)
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

    const existing = await prisma.blockCategory.findFirst({
      where: { id: params.id, teamId: team.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Categoría no encontrada" },
        { status: 404 },
      );
    }

    const { label, color, order, isActive } = parsed.data;

    const updated = await prisma.blockCategory.update({
      where: { id: existing.id },
      data: {
        ...(label !== undefined ? { label: label.trim() } : {}),
        ...(color !== undefined ? { color: color?.trim() || null } : {}),
        ...(order !== undefined ? { order } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("block-planner categories PATCH error", error);
    return NextResponse.json(
      { error: error?.message || "Error" },
      { status: 500 },
    );
  }
}

// DELETE: soft-delete → isActive = false
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    assertCsrf(req);
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const existing = await prisma.blockCategory.findFirst({
      where: { id: params.id, teamId: team.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Categoría no encontrada" },
        { status: 404 },
      );
    }

    const updated = await prisma.blockCategory.update({
      where: { id: existing.id },
      data: { isActive: false },
    });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("block-planner categories DELETE error", error);
    return NextResponse.json(
      { error: error?.message || "Error" },
      { status: 500 },
    );
  }
}
