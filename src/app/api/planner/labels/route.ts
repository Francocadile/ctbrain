import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { dbScope, scopedWhere } from "@/lib/dbScope";

function cleanPlaces(input: string[] | undefined) {
  return Array.from(new Set((input ?? []).map((s) => (s ?? "").trim()).filter(Boolean)));
}

function plannerPrefsKey(userId: string, teamId: string): Prisma.PlannerPrefsWhereUniqueInput {
  return {
    userId_teamId: { userId, teamId },
  } as unknown as Prisma.PlannerPrefsWhereUniqueInput;
}

// GET -> { rowLabels, places, contentRowIds }
export async function GET(req: NextRequest) {
  try {
    const { prisma, team, user } = await dbScope({ req });
    const teamId = team.id;
    const userId = user.id;

    const pref = await prisma.plannerPrefs.findUnique({
      where: plannerPrefsKey(userId, teamId),
    });
    const places = await prisma.place.findMany({
      where: scopedWhere(teamId, {}) as Prisma.PlaceWhereInput,
      select: { name: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      rowLabels: (pref?.rowLabels as Record<string, string> | null) ?? null,
      places: places.map((p) => p.name),
      contentRowIds: (pref?.contentRowIds as string[] | null) ?? null,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("GET /api/planner/labels error", error);
    return NextResponse.json({ error: "No se pudieron obtener labels" }, { status: 500 });
  }
}

// POST -> guarda rowLabels (usuario) y/o reemplaza places (team)
export async function POST(req: NextRequest) {
  try {
    const { prisma, team, user } = await dbScope({ req, roles: [Role.CT, Role.ADMIN] });
    const teamId = team.id;
    const userId = user.id;
    const body = (await req.json().catch(() => ({}))) as {
      rowLabels?: Record<string, string>;
      places?: string[];
      contentRowIds?: string[];
    };

    await prisma.$transaction(async (tx) => {
      if (body.rowLabels || body.contentRowIds) {
        await tx.plannerPrefs.upsert({
          where: plannerPrefsKey(userId, teamId),
          update: {
            ...(body.rowLabels ? { rowLabels: body.rowLabels } : {}),
            ...(body.contentRowIds ? { contentRowIds: body.contentRowIds as any } : {}),
          },
          create: {
            userId,
            teamId,
            ...(body.rowLabels ? { rowLabels: body.rowLabels } : {}),
            ...(body.contentRowIds ? { contentRowIds: body.contentRowIds as any } : {}),
          } as any,
        });
      }

      if (Array.isArray(body.places)) {
        const clean = cleanPlaces(body.places);

        const existing = await tx.place.findMany({
          where: scopedWhere(teamId, {}) as Prisma.PlaceWhereInput,
          select: { id: true, name: true },
        });
        const existingNames = new Set(existing.map((e) => e.name));

        const toDeleteIds = existing.filter((e) => !clean.includes(e.name)).map((e) => e.id);
        if (toDeleteIds.length) {
          await tx.place.deleteMany({
            where: scopedWhere(teamId, { id: { in: toDeleteIds } }) as Prisma.PlaceWhereInput,
          });
        }

        const toInsert = clean
          .filter((n) => !existingNames.has(n))
          .map((name) => ({ name, teamId }));
        if (toInsert.length) {
          await tx.place.createMany({ data: toInsert, skipDuplicates: true });
        }
      }
    });

    const outPlaces = await prisma.place.findMany({
      where: scopedWhere(team.id, {}) as Prisma.PlaceWhereInput,
      select: { name: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ ok: true, places: outPlaces.map((p) => p.name) });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("POST /api/planner/labels error", error);
    return NextResponse.json({ error: "No se pudieron guardar labels" }, { status: 500 });
  }
}

// DELETE -> resetea rowLabels del usuario y contentRowIds
export async function DELETE(req: NextRequest) {
  try {
    const { prisma, team, user } = await dbScope({ req, roles: [Role.CT, Role.ADMIN] });
    const teamId = team.id;
    const userId = user.id;

    await prisma.plannerPrefs.upsert({
      where: plannerPrefsKey(userId, teamId),
      update: { rowLabels: {}, contentRowIds: null as any },
      create: { userId, teamId, rowLabels: {}, contentRowIds: null as any } as any,
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("DELETE /api/planner/labels error", error);
    return NextResponse.json({ error: "No se pudieron resetear labels" }, { status: 500 });
  }
}
