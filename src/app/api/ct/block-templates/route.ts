import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";

export const dynamic = "force-dynamic";

// GET /api/ct/block-templates
export async function GET(req: Request) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const templates = await prisma.blockTemplate.findMany({
      where: { teamId: team.id },
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        title: true,
        blockType: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, templates });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct block-templates list error", error);
    return NextResponse.json({ ok: false, error: error?.message || "Error" }, { status: 500 });
  }
}

// POST /api/ct/block-templates
// body: { title, sourceBlockId }
export async function POST(req: Request) {
  try {
    assertCsrf(req);
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const body = (await req.json().catch(() => ({}))) as any;
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const sourceBlockId = typeof body?.sourceBlockId === "string" ? body.sourceBlockId.trim() : "";

    if (!title) return NextResponse.json({ ok: false, error: "title requerido" }, { status: 400 });
    if (!sourceBlockId) {
      return NextResponse.json({ ok: false, error: "sourceBlockId requerido" }, { status: 400 });
    }

    const sourceBlock = await prisma.routineBlock.findFirst({
      where: { id: sourceBlockId, routine: { teamId: team.id } },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        items: {
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            order: true,
            exerciseId: true,
            sets: true,
            reps: true,
            load: true,
            tempo: true,
            rest: true,
            notes: true,
          },
        },
      },
    });

    if (!sourceBlock) {
      return NextResponse.json({ ok: false, error: "Bloque no encontrado" }, { status: 404 });
    }

    const template = await prisma.$transaction(async (tx) => {
      const created = await tx.blockTemplate.create({
        data: {
          teamId: team.id,
          title,
          blockType: sourceBlock.type ?? "MAIN",
        },
        select: { id: true, title: true, blockType: true, updatedAt: true },
      });

      const items = (sourceBlock.items || []).filter((it) => typeof it.exerciseId === "string" && it.exerciseId);
      if (items.length) {
        await tx.blockTemplateItem.createMany({
          data: items.map((it) => ({
            templateId: created.id,
            exerciseId: it.exerciseId as string,
            order: it.order,
            sets: it.sets,
            reps: it.reps,
            load: it.load,
            tempo: it.tempo,
            rest: it.rest,
            notes: it.notes,
          })),
        });
      }

      return created;
    });

    return NextResponse.json({ ok: true, template }, { status: 201 });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("ct block-templates create error", error);
    return NextResponse.json({ ok: false, error: error?.message || "Error" }, { status: 500 });
  }
}
