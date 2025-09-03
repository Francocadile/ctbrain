// src/app/api/planner/labels/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
// ⬇️ IMPORT CORRECTO: usa tu helper real. Si en tu code se llama distinto,
// por ejemplo `requireSession` o `requireUserSession`, importalo con ese nombre.
import { requireSession } from "@/lib/auth";

/**
 * Preferencias del planner por usuario
 *  - rowLabels: Record<string,string>
 *  - places: string[]
 *
 * Métodos:
 *  GET       -> { rowLabels, places }
 *  PUT       -> body { rowLabels?, places? } (parcial)
 *  DELETE    -> ?target=labels | places | all
 */

export async function GET() {
  const session = await requireSession();
  const userId = session.user.id;

  const pref = await prisma.plannerPrefs.findUnique({ where: { userId } });

  return NextResponse.json({
    rowLabels: (pref?.rowLabels as Record<string, string> | null) ?? null,
    places: (pref?.places as string[] | null) ?? [],
  });
}

export async function PUT(req: Request) {
  const session = await requireSession();
  const userId = session.user.id;

  const body = await req.json().catch(() => ({}));
  const incomingLabels = (body?.rowLabels ?? null) as Record<string, string> | null;
  const incomingPlaces = (body?.places ?? null) as string[] | null;

  const current = await prisma.plannerPrefs.findUnique({ where: { userId } });

  const nextLabels =
    incomingLabels !== null
      ? incomingLabels
      : ((current?.rowLabels as Record<string, string> | null) ?? {});

  const nextPlaces =
    incomingPlaces !== null
      ? Array.from(
          new Set(
            (incomingPlaces as string[])
              .map((s) => (s || "").trim())
              .filter(Boolean)
          )
        )
      : ((current?.places as string[] | null) ?? []);

  const saved = await prisma.plannerPrefs.upsert({
    where: { userId },
    update: { rowLabels: nextLabels as any, places: nextPlaces as any },
    create: { userId, rowLabels: nextLabels as any, places: nextPlaces as any },
  });

  return NextResponse.json({
    ok: true,
    rowLabels: saved.rowLabels,
    places: saved.places,
  });
}

export async function DELETE(req: Request) {
  const session = await requireSession();
  const userId = session.user.id;

  const url = new URL(req.url);
  const target = (url.searchParams.get("target") || "labels") as "labels" | "places" | "all";

  const existing = await prisma.plannerPrefs.findUnique({ where: { userId } });
  if (!existing) {
    await prisma.plannerPrefs.create({
      data: { userId, rowLabels: {}, places: [] },
    });
  }

  const clearLabels = target === "labels" || target === "all";
  const clearPlaces = target === "places" || target === "all";

  const updated = await prisma.plannerPrefs.update({
    where: { userId },
    data: {
      ...(clearLabels ? { rowLabels: {} as any } : {}),
      ...(clearPlaces ? { places: [] as any } : {}),
    },
  });

  return NextResponse.json({
    ok: true,
    rowLabels: updated.rowLabels,
    places: updated.places,
  });
}
