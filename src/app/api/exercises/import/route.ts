import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";

const prisma = new PrismaClient();

// Debe coincidir con el usado por el editor de ejercicios
const EX_TAG = "[EXERCISES]";

type ExerciseEncoded = {
  title: string;
  kind?: string;      // nombre (opcional)
  kindId?: string;    // id (opcional)
  space?: string;
  players?: string;
  duration?: string;
  description?: string;
  imageUrl?: string;
  tags?: string[];
};

function decodeFromDescription(desc?: string | null): ExerciseEncoded[] {
  const text = (desc || "").trimEnd();
  const idx = text.lastIndexOf(EX_TAG);
  if (idx === -1) return [];
  const after = text.slice(idx + EX_TAG.length).trim();
  const b64 = after.split(/\s+/)[0] || "";
  try {
    const json = Buffer.from(b64, "base64").toString("utf8");
    const arr = JSON.parse(json);
    if (Array.isArray(arr)) return arr as ExerciseEncoded[];
  } catch {}
  return [];
}

export async function POST() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = String(session.user.id);

  // Trae sesiones del usuario que potencialmente tengan ejercicios embebidos
  const sessions = await prisma.session.findMany({
    where: { createdBy: userId, description: { contains: EX_TAG } },
    select: { id: true, description: true, date: true },
    orderBy: { date: "desc" },
  });

  let created = 0;
  for (const s of sessions) {
    const items = decodeFromDescription(s.description);
    for (const it of items) {
      const title = (it.title || "").trim();
      const description = (it.description || "").trim();

      // Evita duplicados básicos por usuario + title + description
      const exists = await prisma.exercise.findFirst({
        where: { userId, title, description },
        select: { id: true },
      });
      if (exists) continue;

      // Resolver kindId por nombre si vino "kind"
      let kindId: string | null = (it as any).kindId || null;
      const kindName = (it as any).kind;
      if (!kindId && kindName) {
        const found = await prisma.exerciseKind.findFirst({
          where: { name: { equals: String(kindName), mode: "insensitive" } },
          select: { id: true },
        });
        if (found) kindId = found.id;
      }

      await prisma.exercise.create({
        data: {
          userId,
          title: title || "(Sin título)",
          kindId,
          space: it.space || null,
          players: it.players || null,
          duration: it.duration || null,
          description: description || null,
          imageUrl: it.imageUrl || null,
          tags: Array.isArray(it.tags) ? it.tags.filter((x) => typeof x === "string") : [],
        },
      });
      created++;
    }
  }

  return NextResponse.json({ ok: true, imported: created, scanned: sessions.length });
}
