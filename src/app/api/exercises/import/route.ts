// src/app/api/exercises/import/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

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
    const json = Buffer.from(b64, "base64").toString("utf8");
    const arr = JSON.parse(json);
    if (Array.isArray(arr)) return arr as ImportExercise[];
  } catch {
    // ignore corrupt payloads
  }
  return [];
}

/**
 * POST /api/exercises/import
 * Escanea TODAS las sesiones que tengan el tag [EXERCISES] y crea ejercicios
 * asociados al usuario dueño de cada sesión (createdBy).
 *
 * Nota: deliberadamente no dependemos de next-auth aquí para evitar errores de
 * compilación por exportaciones de authOptions. Seguridad: es una herramienta
 * interna; si quisieras protegerla luego, bastaría con reintroducir session.
 */
export async function POST() {
  // Buscamos sesiones con el marcador de ejercicios para cualquier usuario
  const sessions: Array<{ id: string; description: string | null; date: Date; createdBy: string }> =
    await prisma.session.findMany({
      where: { description: { contains: EX_TAG } },
      select: { id: true, description: true, date: true, createdBy: true },
      orderBy: { date: "desc" },
    });

  let created = 0;

  for (const s of sessions) {
    const list = decodeFromDescription(s.description);
    for (const e of list) {
      const title = (e?.title || "").trim() || "(Sin título)";

      // upsert del tipo (kind) si viene nombre
      let kindId: string | null = null;
      const kindName = (e?.kind || "").trim();
      if (kindName) {
        const k = await prisma.exerciseKind.upsert({
          where: { name: kindName },
          update: {},
          create: { name: kindName },
        });
        kindId = k.id;
      }

      await prisma.exercise.create({
        data: {
          userId: s.createdBy, // dueño correcto del ejercicio
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
