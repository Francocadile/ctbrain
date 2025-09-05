// src/app/api/exercises/import/from-session/[id]/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const EX_TAG = "[EXERCISES]";

type ExercisePayload = {
  title?: string;
  kind?: string;
  space?: string;
  players?: string;
  duration?: string;
  description?: string;
  imageUrl?: string;
};

function decode(desc?: string | null): ExercisePayload[] {
  const text = (desc || "").trimEnd();
  const idx = text.lastIndexOf(EX_TAG);
  if (idx === -1) return [];
  const rest = text.slice(idx + EX_TAG.length).trim();
  const b64 = (rest.split(/\s+/)[0] || "").trim();
  if (!b64) return [];
  try {
    const json = Buffer.from(b64, "base64").toString("utf8");
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const sess = await prisma.session.findUnique({
    where: { id: params.id },
    select: { id: true, description: true, createdBy: true },
  });
  if (!sess) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

  const items = decode(sess.description);
  if (!items.length) return NextResponse.json({ ok: true, created: 0, updated: 0 });

  let created = 0;
  let updated = 0;

  for (let i = 0; i < items.length; i++) {
    const it = items[i] as ExercisePayload;
    const title = (it.title || "").trim() || "(Sin título)";
    const tag = `from:session:${sess.id}:${i}`;

    // Resolver kindId (si hay)
    let kindId: string | null = null;
    const kindName = (it.kind || "").trim();
    if (kindName) {
      const k = await prisma.exerciseKind.upsert({
        where: { name: kindName },
        update: {},
        create: { name: kindName },
      });
      kindId = k.id;
    }

    // Buscar por tag de origen
    const existing = await prisma.exercise.findFirst({
      where: { userId: sess.createdBy, tags: { has: tag } },
    });

    if (existing) {
      await prisma.exercise.update({
        where: { id: existing.id },
        data: {
          title,
          kindId,
          space: it.space ?? null,
          players: it.players ?? null,
          duration: it.duration ?? null,
          description: it.description ?? null,
          imageUrl: it.imageUrl ?? null,
        },
      });
      updated++;
    } else {
      await prisma.exercise.create({
        data: {
          userId: sess.createdBy,
          title,
          kindId,
          space: it.space ?? null,
          players: it.players ?? null,
          duration: it.duration ?? null,
          description: it.description ?? null,
          imageUrl: it.imageUrl ?? null,
          tags: [tag], // ← marca de origen para futuras actualizaciones
        },
      });
      created++;
    }
  }

  return NextResponse.json({ ok: true, created, updated });
}
