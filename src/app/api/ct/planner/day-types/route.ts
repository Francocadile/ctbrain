import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";
import { DEFAULT_DAY_TYPES } from "@/lib/planner-daytype";

export const dynamic = "force-dynamic";

// GET /api/ct/planner/day-types -> lista de tipos de trabajo del equipo actual
export async function GET(req: Request) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const rows = await prisma.plannerDayType.findMany({
      where: { teamId: team.id },
      orderBy: [{ order: "asc" }],
    });

    if (!rows.length) {
      // Fallback: defaults en memoria, sin crear registros todavía
      const dayTypes = DEFAULT_DAY_TYPES.map((t, idx) => ({
        key: t.id,
        label: t.label,
        color: t.color,
        isDefault: true,
        order: idx,
      }));
      return NextResponse.json({ dayTypes });
    }

  const dayTypes = rows.map((r: any) => ({
      key: r.key,
      label: r.label,
      color: r.color,
      isDefault: r.isDefault,
      order: r.order,
    }));

    return NextResponse.json({ dayTypes });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct planner day-types GET error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

// PUT /api/ct/planner/day-types -> reemplaza la lista completa de tipos del equipo actual
export async function PUT(req: Request) {
  try {
    assertCsrf(req);
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });
    const body = await req.json();

    const list = Array.isArray(body?.dayTypes) ? body.dayTypes : [];

    // Validación básica
    const seenKeys = new Set<string>();
    const cleaned = list.map((raw: any, index: number) => {
      const key = typeof raw?.key === "string" ? raw.key.trim().toUpperCase() : "";
      const label = typeof raw?.label === "string" ? raw.label.trim() : "";
      const color = typeof raw?.color === "string" ? raw.color.trim() : "";
      const order = Number.isFinite(raw?.order) ? Number(raw.order) : index;
      const isDefault = !!raw?.isDefault;

      if (!key) throw new Error(`dayTypes[${index}].key requerido`);
      if (seenKeys.has(key)) throw new Error(`dayTypes[${index}].key duplicado: ${key}`);
      if (!label) throw new Error(`dayTypes[${index}].label requerido`);
      if (!color) throw new Error(`dayTypes[${index}].color requerido`);
      seenKeys.add(key);

      return { key, label, color, order, isDefault };
    });

    await prisma.$transaction(async (tx) => {
      await tx.plannerDayType.deleteMany({ where: { teamId: team.id } });
      if (!cleaned.length) return;
      await tx.plannerDayType.createMany({
        data: cleaned.map((t: any) => ({
          teamId: team.id,
          key: t.key,
          label: t.label,
          color: t.color,
          order: t.order,
          isDefault: t.isDefault,
        })),
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("ct planner day-types PUT error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 400 });
  }
}
