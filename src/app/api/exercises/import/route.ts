// src/app/api/exercises/import/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";

const prisma = new PrismaClient();

/**
 * POST /api/exercises/import?sessionId=...
 * - Recorre sesiones del usuario (una o todas).
 * - Crea/actualiza UN Exercise por sesión (id determinístico: "<sessionId>__0").
 * - No requiere etiquetas en la descripción.
 */
export async function POST(req: Request) {
  const session = await getServerSession();
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const onlySessionId = url.searchParams.get("sessionId") || undefined;

  const sessions = await prisma.session.findMany({
    where: { createdBy: userId, ...(onlySessionId ? { id: onlySessionId } : {}) },
    orderBy: { date: "desc" },
    select: { id: true, date: true, title: true, description: true },
  });

  let created = 0;
  let updated = 0;

  const derive = (txt?: string | null) => {
    const t = (txt || "").trim();
    const duration = (t.match(/(\d+)\s*min/i)?.[1] && `${t.match(/(\d+)\s*min/i)![1]} minutos`) || null;
    const players = /todos/i.test(t) ? "Todos" : null;
    const space = /gimnasio/i.test(t) ? "Gimnasio" : null;
    return { duration, players, space, description: t || null };
  };

  for (const s of sessions) {
    const id = `${s.id}__0`; // determinístico
    const g = derive(s.description);

    const base = {
      id,
      userId,
      title: (s.title || "Sin título").trim(),
      kindId: null,
      space: g.space,
      players: g.players,
      duration: g.duration,
      description: g.description,
      imageUrl: null,
      tags: [] as string[],
      // si tu schema tiene sessionId, podés incluirlo:
      // sessionId: s.id,
    };

    const exists = await prisma.exercise.findUnique({ where: { id } });
    if (exists) {
      await prisma.exercise.update({ where: { id }, data: { ...base } as any });
      updated++;
    } else {
      await prisma.exercise.create({ data: { ...base } as any });
      created++;
    }
  }

  return NextResponse.json({ ok: true, created, updated });
}
