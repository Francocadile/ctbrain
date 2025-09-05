import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const prisma = new PrismaClient();

const EX_TAG = "[EXERCISES]";

/**
 * POST /api/exercises/import
 * - Recorre sesiones del usuario con posibles ejercicios embebidos.
 * - Por cada bloque crea/actualiza un Exercise con ID determinístico.
 * - Evita duplicados y retorna { created, updated }.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  // Trae sesiones candidatas (solo los campos que usamos)
  const sessions = await prisma.session.findMany({
    where: { createdBy: userId, description: { contains: EX_TAG } },
    select: { id: true, description: true, date: true },
    orderBy: { date: "desc" },
  });

  let created = 0;
  let updated = 0;

  // Por cada sesión, parsea bloques que estén marcados con el tag
  for (const s of sessions) {
    if (!s.description) continue;

    // Tu formato actual del editor deja bloques (simplificamos al primer bloque)
    // Si usás JSON en description, acá parsealo. Para mantenerlo robusto:
    // Buscamos líneas "##" como título y extraemos algunos metadatos heurísticos.
    const blocks: Array<{
      title: string;
      kindName?: string | null;
      space?: string | null;
      players?: string | null;
      duration?: string | null;
      description?: string | null;
      imageUrl?: string | null;
    }> = [];

    // Heurística mínima: un único bloque con todo el texto descriptivo.
    blocks.push({
      title: "Activacion 1",
      description: s.description.replace(EX_TAG, "").trim() || null,
      kindName: null,
      space: null,
      players: null,
      duration: null,
      imageUrl: null,
    });

    // Upsert por bloque con ID determinístico
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const deterministicId = `${s.id}__${i}`;

      // opcional: upsert del tipo (kind) por nombre si viene
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

      const data = {
        id: deterministicId,
        userId,
        title: b.title || "Sin título",
        kindId,
        space: b.space ?? null,
        players: b.players ?? null,
        duration: b.duration ?? null,
        description: b.description ?? null,
        imageUrl: b.imageUrl ?? null,
        tags: [] as string[],
        // vínculo a la sesión de origen para poder “Ver” ➜ editor de sesión
        sourceSessionId: s.id,
      };

      if (exists) {
        await prisma.exercise.update({
          where: { id: deterministicId },
          data: {
            title: data.title,
            kindId: data.kindId,
            space: data.space,
            players: data.players,
            duration: data.duration,
            description: data.description,
            imageUrl: data.imageUrl,
            tags: data.tags,
            sourceSessionId: data.sourceSessionId,
          },
        });
        updated++;
      } else {
        await prisma.exercise.create({ data });
        created++;
      }
    }
  }

  return NextResponse.json({ ok: true, created, updated });
}
