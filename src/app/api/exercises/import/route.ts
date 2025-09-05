import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";

const prisma = new PrismaClient();
const EX_TAG = "[EXERCISES]";

/**
 * POST /api/exercises/import?sessionId=...
 * - Recorre sesiones del usuario con posibles ejercicios embebidos.
 * - Por cada bloque crea/actualiza un Exercise con ID determinístico (<sessionId>__<idx>).
 * - Evita duplicados y retorna { created, updated }.
 *
 * NOTA: NO importamos authOptions para evitar el error de compilación.
 */
export async function POST(req: Request) {
  const session = await getServerSession(); // sin parámetros => evita el import problemático
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = String(session.user.id);

  const url = new URL(req.url);
  const onlySessionId = url.searchParams.get("sessionId") || null;

  // Sesiones candidatas
  const sessions = await prisma.session.findMany({
    where: {
      createdBy: userId,
      ...(onlySessionId ? { id: onlySessionId } : {}),
      description: { contains: EX_TAG },
    },
    select: { id: true, description: true, date: true },
    orderBy: { date: "desc" },
  });

  let created = 0;
  let updated = 0;

  for (const s of sessions) {
    if (!s.description) continue;

    // Heurística simple: creamos un bloque por sesión (ajústalo si tenés múltiples)
    const blocks: Array<{
      title: string;
      kindName?: string | null;
      space?: string | null;
      players?: string | null;
      duration?: string | null;
      description?: string | null;
      imageUrl?: string | null;
    }> = [
      {
        title: "Activacion 1",
        description: s.description.replace(EX_TAG, "").trim() || null,
        kindName: null,
        space: null,
        players: null,
        duration: null,
        imageUrl: null,
      },
    ];

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const deterministicId = `${s.id}__${i}`;

      let kindId: string | null = null;
      if (b.kindName) {
        const k = await prisma.exerciseKind.upsert({
          where: { name: b.kindName },
          update: {},
          create: { name: b.kindName },
        });
        kindId = k.id;
      }

      const exists = await prisma.exercise.findUnique({
        where: { id: deterministicId },
      });

      // Construimos los datos comunes
      const baseData = {
        title: b.title || "Sin título",
        kindId,
        space: b.space ?? null,
        players: b.players ?? null,
        duration: b.duration ?? null,
        description: b.description ?? null,
        imageUrl: b.imageUrl ?? null,
        tags: [] as string[],
      };

      if (exists) {
        await prisma.exercise.update({
          where: { id: deterministicId },
          data: { ...baseData },
        });
        updated++;
      } else {
        // Si tu schema NO tiene sourceSessionId, esto igual compila (no lo incluimos)
        await prisma.exercise.create({
          data: {
            id: deterministicId,
            userId,
            ...baseData,
          },
        });
        created++;
      }
    }
  }

  return NextResponse.json({ ok: true, created, updated });
}
