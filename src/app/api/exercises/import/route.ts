// src/app/api/exercises/import/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const prisma = new PrismaClient();
const EX_TAG = "[EXERCISES]";

type ImportExercise = {
  title?: string;
  kind?: string;
  space?: string;
  players?: string;
  duration?: string;
  description?: string;
  imageUrl?: string;
};

function decodeFromDescription(desc?: string | null): ImportExercise[] {
  const text = (desc || "").trimEnd();
  const idx = text.lastIndexOf(EX_TAG);
  if (idx === -1) return [];
  const rest = text.slice(idx + EX_TAG.length).trim();
  const b64 = rest.split(/\s+/)[0] || "";
  try {
    const json = atob(b64);
    const arr = JSON.parse(json);
    if (Array.isArray(arr)) return arr as ImportExercise[];
  } catch {}
  return [];
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  // sesiones que potencialmente tienen ejercicios embebidos
  const sessions: Array<{ id: string; description: string | null; date: Date }> =
    await prisma.session.findMany({
      where: { createdBy: userId, description: { contains: EX_TAG } },
      select: { id: true, description: true, date: true },
      orderBy: { date: "desc" },
    });

  let created = 0;

  for (const s of sessions) {
    const list = decodeFromDescription(s.description);
    for (const e of list) {
      const title = (e?.title || "").trim() || "(Sin título)";
      let kindId: string | null = null;
      const kindName = (e?.kind || "").trim();
      if (kindName) {
        // upsert del tipo por nombre
        const k = await prisma.exerciseKind.upsert({
          where: { name: kindName },
          update: {},
          create: { name: kindName },
        });
        kindId = k.id;
      }

      await prisma.exercise.create({
        data: {
          userId,
          title,
          kindId,
          space: (e?.space || null) as string | null,
          players: (e?.players || null) as string | null,
          duration: (e?.duration || null) as string | null,
          description: (e?.description || null) as string | null,
          imageUrl: (e?.imageUrl || null) as string | null,
          tags: [],
        },
      });
      created++;
    }
  }

  return NextResponse.json({ ok: true, created });
}
