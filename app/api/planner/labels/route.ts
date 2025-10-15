import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/** 
 * TEMP: resolvemos un userId válido sin depender de requireSession*. 
 * Cuando quieras, reemplazá por tu helper real y devolvé user.id.
 */
async function resolveUserId(): Promise<string> {
  const u = await prisma.user.findFirst({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (!u) throw new Error("No hay usuarios en la base");
  return u.id;
}

// GET -> { rowLabels, places }
export async function GET() {
  const userId = await resolveUserId();

  const pref = await prisma.plannerPrefs.findUnique({ where: { userId } });
  const places = await prisma.place.findMany({
    select: { name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    rowLabels: (pref?.rowLabels as Record<string, string> | null) ?? null,
    places: places.map((p) => p.name),
  });
}

// POST -> guarda rowLabels (usuario) y/o reemplaza places (global)
export async function POST(req: NextRequest) {
  const userId = await resolveUserId();
  const body = (await req.json().catch(() => ({}))) as {
    rowLabels?: Record<string, string>;
    places?: string[];
  };

  await prisma.$transaction(async (tx) => {
    if (body.rowLabels) {
      await tx.plannerPrefs.upsert({
        where: { userId },
        update: { rowLabels: body.rowLabels },
        create: { userId, rowLabels: body.rowLabels },
      });
    }

    if (Array.isArray(body.places)) {
      const clean = Array.from(
        new Set((body.places || []).map((s) => (s ?? "").trim()).filter(Boolean))
      );

      const existing = await tx.place.findMany({ select: { id: true, name: true } });
      const existingNames = new Set(existing.map((e) => e.name));

      // borrar los que ya no estén
      const toDeleteIds = existing.filter((e) => !clean.includes(e.name)).map((e) => e.id);
      if (toDeleteIds.length) {
        await tx.place.deleteMany({ where: { id: { in: toDeleteIds } } });
      }

      // insertar nuevos
      const toInsert = clean.filter((n) => !existingNames.has(n)).map((name) => ({ name }));
      if (toInsert.length) {
        await tx.place.createMany({ data: toInsert, skipDuplicates: true });
      }
    }
  });

  const outPlaces = await prisma.place.findMany({
    select: { name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ ok: true, places: outPlaces.map((p) => p.name) });
}

// DELETE -> resetea rowLabels del usuario
export async function DELETE() {
  const userId = await resolveUserId();
  await prisma.plannerPrefs.upsert({
    where: { userId },
    update: { rowLabels: {} },
    create: { userId, rowLabels: {} },
  });
  return NextResponse.json({ ok: true });
}
