import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";

export const dynamic = "force-dynamic";

type TemplateItem = {
  exerciseId: string;
  order: number;
  sets: number | null;
  reps: number | null;
  load: string | null;
  tempo: string | null;
  rest: string | null;
  notes: string | null;
};

// POST /api/ct/routines/[id]/blocks/from-template
// body: { templateId, insertAt?: number }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    assertCsrf(req);
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const routineId = params.id;
    const body = (await req.json().catch(() => ({}))) as any;
    const templateId = typeof body?.templateId === "string" ? body.templateId.trim() : "";

    if (!templateId) {
      return NextResponse.json({ ok: false, error: "templateId requerido" }, { status: 400 });
    }

    const insertAtRaw = body?.insertAt;
    const insertAt = typeof insertAtRaw === "number" && Number.isFinite(insertAtRaw) ? insertAtRaw : null;

    const routine = await prisma.routine.findFirst({ where: { id: routineId, teamId: team.id } });
    if (!routine) return NextResponse.json({ ok: false, error: "Rutina no encontrada" }, { status: 404 });

    const template = await prisma.blockTemplate.findFirst({
      where: { id: templateId, teamId: team.id },
      select: {
        id: true,
        title: true,
        blockType: true,
        items: {
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          select: {
            exerciseId: true,
            order: true,
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

    if (!template) return NextResponse.json({ ok: false, error: "Template no encontrado" }, { status: 404 });

    const result = await prisma.$transaction(async (tx) => {
      const blocks = await tx.routineBlock.findMany({
        where: { routineId: routine.id },
        orderBy: [{ order: "asc" }, { id: "asc" }],
        select: { id: true, order: true },
      });

      const maxOrder = blocks.length ? blocks[blocks.length - 1].order : 0;

      let newOrder = maxOrder + 1;
      if (insertAt !== null) {
        const clamped = Math.max(0, Math.min(insertAt, blocks.length));
        const targetOrder = blocks[clamped]?.order ?? newOrder;

        // shift orders for blocks at/after targetOrder
        for (const b of blocks) {
          if (b.order >= targetOrder) {
            await tx.routineBlock.update({ where: { id: b.id }, data: { order: b.order + 1 } });
          }
        }

        newOrder = targetOrder;
      }

      const createdBlock = await tx.routineBlock.create({
        data: {
          routineId: routine.id,
          name: template.title,
          description: null,
          type: (template.blockType as any) || null,
          order: newOrder,
        },
        select: { id: true, routineId: true, name: true, order: true, description: true, type: true },
      });

      const templateItems = (template.items || []) as TemplateItem[];
      const templateExerciseIds = Array.from(new Set(templateItems.map((it) => it.exerciseId).filter(Boolean)));

      const existingExercises = templateExerciseIds.length
        ? await tx.exercise.findMany({
            where: { teamId: team.id, id: { in: templateExerciseIds } },
            select: { id: true },
          })
        : [];

      const existingExerciseIdSet = new Set(existingExercises.map((e) => e.id));

      const itemsToCreate = templateItems
        .filter((it) => existingExerciseIdSet.has(it.exerciseId))
        .map((it) => ({
          routineId: routine.id,
          blockId: createdBlock.id,
          title: "",
          description: null,
          order: it.order,
          exerciseId: it.exerciseId,
          exerciseName: null,
          sets: it.sets,
          reps: it.reps,
          load: it.load,
          tempo: it.tempo,
          rest: it.rest,
          notes: it.notes,
          athleteNotes: null,
          videoUrl: null,
        }))
        .sort((a, b) => a.order - b.order);

      if (itemsToCreate.length) {
        await tx.routineItem.createMany({ data: itemsToCreate });
      }

      return { block: createdBlock, createdItems: itemsToCreate.length };
    });

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("ct routine blocks from-template error", error);
    return NextResponse.json({ ok: false, error: error?.message || "Error" }, { status: 500 });
  }
}
