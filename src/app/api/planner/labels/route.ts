// src/app/api/planner/labels/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { requireSessionWithRoles } from "@/lib/auth-helpers";

const prisma = new PrismaClient();

// Aceptamos a cualquier usuario autenticado (ajustá si querés restringir)
const ANY_ROLE = ["ADMIN", "CT", "MEDICO", "JUGADOR", "DIRECTIVO"] as const;

/**
 * GET  -> devuelve preferencias del usuario:
 * { rowLabels: Record<string,string> | null, places: string[] }
 */
export async function GET() {
  const session = await requireSessionWithRoles(ANY_ROLE);
  const userId = session.user.id;

  const pref = await prisma.plannerPrefs.findUnique({ where: { userId } });

  return NextResponse.json({
    rowLabels: (pref?.rowLabels as Record<string, string> | null) ?? null,
    places: (pref?.places as string[] | null) ?? [],
  });
}

/**
 * POST -> guarda preferencias.
 * Body JSON puede incluir:
 * - rowLabels?: Record<string,string>
 * - places?: string[]
 *
 * Responde: { ok: true, rowLabels, places }
 */
export async function POST(req: Request) {
  const session = await requireSessionWithRoles(ANY_ROLE);
  const userId = session.user.id;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { rowLabels, places } = body as {
    rowLabels?: Record<string, string>;
    places?: string[];
  };

  // Construimos el "update" solo con campos presentes
  const updateData: Record<string, any> = {};
  if (rowLabels !== undefined) updateData.rowLabels = rowLabels;
  if (places !== undefined) updateData.places = places;

  const pref = await prisma.plannerPrefs.upsert({
    where: { userId },
    update: updateData,
    create: {
      userId,
      rowLabels: rowLabels ?? {},
      places: places ?? [],
    },
  });

  return NextResponse.json({
    ok: true,
    rowLabels: pref.rowLabels as Record<string, string>,
    places: pref.places as string[],
  });
}
