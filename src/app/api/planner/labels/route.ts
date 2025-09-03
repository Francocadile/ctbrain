// src/app/api/planner/labels/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
 * { rowLabels: Record<string,string> | null }
 */
export async function GET() {
  const session = await requireSessionWithRoles(ANY_ROLE);
  const userId = session.user.id;

  const pref = await prisma.plannerPrefs.findUnique({ where: { userId } });

  return NextResponse.json({
    rowLabels: (pref?.rowLabels as Record<string, string> | null) ?? null,
  });
}

/**
 * POST -> guarda preferencias del usuario.
 * Body JSON:
 * - rowLabels?: Record<string,string>
 *
 * Respuesta: { ok: true, rowLabels }
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

  const { rowLabels } = body as { rowLabels?: Record<string, string> };

  const pref = await prisma.plannerPrefs.upsert({
    where: { userId },
    update: rowLabels !== undefined ? { rowLabels } : {},
    create: {
      userId,
      rowLabels: rowLabels ?? {},
    },
  });

  return NextResponse.json({
    ok: true,
    rowLabels: pref.rowLabels as Record<string, string>,
  });
}
