// src/app/api/planner/labels/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import * as Auth from "@/lib/auth";

// Helper flexible: intenta varios helpers de auth disponibles en tu proyecto.
async function getUserIdOrThrow(): Promise<string> {
  const a: any = Auth;
  if (typeof a.requireSessionWithRoles === "function") {
    const s = await a.requireSessionWithRoles(["ADMIN", "CT", "MEDICO", "JUGADOR", "DIRECTIVO"]);
    return s.user.id;
  }
  if (typeof a.requireSession === "function") {
    const s = await a.requireSession();
    return s.user.id;
  }
  if (typeof a.getServerSession === "function") {
    const s = await a.getServerSession();
    if (s?.user?.id) return s.user.id as string;
  }
  if (typeof a.auth === "function") {
    const s = await a.auth();
    if (s?.user?.id) return s.user.id as string;
  }
  throw new Error("UNAUTHENTICATED");
}

// GET: devuelve { rowLabels, places }
export async function GET() {
  try {
    const userId = await getUserIdOrThrow();
    const pref = await prisma.plannerPrefs.findUnique({ where: { userId } });

    return NextResponse.json({
      rowLabels: (pref?.rowLabels as Record<string, string> | null) ?? null,
      // usamos (pref as any) para evitar error de tipos si tu client local aún no tiene el campo
      places: ((pref as any)?.places as string[] | null) ?? [],
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// PUT: body { rowLabels?, places? }
export async function PUT(req: Request) {
  try {
    const userId = await getUserIdOrThrow();
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
        ? Array.from(new Set((incomingPlaces as string[]).map((s) => (s || "").trim()).filter(Boolean)))
        : (((current as any)?.places as string[] | null) ?? []);

    const saved = await prisma.plannerPrefs.upsert({
      where: { userId },
      update: { rowLabels: nextLabels as any, places: nextPlaces as any },
      create: { userId, rowLabels: nextLabels as any, places: nextPlaces as any },
    });

    return NextResponse.json({
      ok: true,
      rowLabels: saved.rowLabels,
      places: (saved as any).places ?? [],
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// DELETE: ?target=labels | places | all
export async function DELETE(req: Request) {
  try {
    const userId = await getUserIdOrThrow();
    const url = new URL(req.url);
    const target = (url.searchParams.get("target") || "labels") as "labels" | "places" | "all";

    const existing = await prisma.plannerPrefs.findUnique({ where: { userId } });
    if (!existing) {
      await prisma.plannerPrefs.create({ data: { userId, rowLabels: {}, places: [] } });
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
      places: ((updated as any).places as string[]) ?? [],
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
