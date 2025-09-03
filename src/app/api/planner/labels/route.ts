import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionWithRoles } from "@/lib/auth-helpers";

// GET: devuelve las etiquetas guardadas del usuario { rowLabels: {...} }
export async function GET() {
  const session = await requireSessionWithRoles(); // obtiene user.id
  const userId = session.user.id;

  const pref = await prisma.plannerPrefs.findUnique({ where: { userId } });
  return NextResponse.json({ rowLabels: (pref?.rowLabels as any) ?? {} });
}

// POST: guarda { rowLabels }
export async function POST(req: Request) {
  const session = await requireSessionWithRoles();
  const userId = session.user.id;

  const { rowLabels } = await req.json();
  if (!rowLabels || typeof rowLabels !== "object") {
    return NextResponse.json({ error: "rowLabels inválido" }, { status: 400 });
  }

  await prisma.plannerPrefs.upsert({
    where: { userId },
    create: { userId, rowLabels },
    update: { rowLabels },
  });

  return NextResponse.json({ ok: true });
}

// DELETE: restaura valores por defecto (vacío)
export async function DELETE() {
  const session = await requireSessionWithRoles();
  const userId = session.user.id;

  await prisma.plannerPrefs.upsert({
    where: { userId },
    create: { userId, rowLabels: {} },
    update: { rowLabels: {} },
  });

  return NextResponse.json({ ok: true });
}
