// src/app/api/exercises/import/route.ts
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

function decodeExercises(desc?: string | null): ExercisePayload[] {
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

export async function POST() {
  const sessions = await prisma.session.findMany({
    where: { description: { contains: EX_TAG } },
    select: { id: true, description: true, createdBy: true, date: true },
    orderBy: { date: "desc" },
  });

  let created = 0;
  let updated = 0;

  for (const s of sessions) {
    const items = decodeExercises(s.description);
    if (!items.length) continue;

    for (let i = 0; i < items.length; i++) {
      const it = items[i] as ExercisePayload;
      const title = (it.title || "").trim() || "(Sin título)";
      const tag = `from:session:${s.id}:${i}`;

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

      const existing = await prisma.exercise.findFirst({
        where: { userId: s.createdBy, tags: { has: tag } },
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
            userId: s.createdBy,
            title,
            kindId,
            space: it.space ?? null,
            players: it.players ?? null,
            duration: it.duration ?? null,
            description: it.description ?? null,
            imageUrl: it.imageUrl ?? null,
            tags: [tag],
          },
        });
        created++;
      }
    }
  }

  return NextResponse.json({ ok: true, created, updated });
}
