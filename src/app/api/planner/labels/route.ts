// src/app/api/planner/labels/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // usa tu singleton
import { requireSessionWithRoles } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";

// Aceptamos a cualquier usuario autenticado
const ANY_ROLE: Role[] = [
  Role.ADMIN,
  Role.CT,
  Role.MEDICO,
  Role.JUGADOR,
  Role.DIRECTIVO,
];

/**
 * GET -> devuelve preferencias del usuario:
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
 * POST -> guarda preferencias del usuario.
 * Body JSON admite:
 * - rowLabels?: Record<string,string>
 * - places?: string[]
 *
 * Respuesta: { ok: true, rowLabels, places }
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
