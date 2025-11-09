// src/app/api/ct/settings/kinds/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { DEFAULT_KINDS } from "@/lib/settings";

const prisma = new PrismaClient();

/** Intenta obtener un modelo de Prisma por nombre (varias opciones por compat) */
function getModel(...names: string[]): any | null {
  for (const n of names) {
    const m = (prisma as any)[n];
    if (m && typeof m === "object") return m;
  }
  return null;
}

/**
 * GET: devuelve la lista de tipos de ejercicio (kinds)
 * - Si existe modelo (e.g. ExerciseKind / exerciseKind), lee de DB.
 * - Si no, devuelve DEFAULT_KINDS (front cachea en LS).
 */
export async function GET(req: Request) {
  return new Response("Not implemented", { status: 501 });
}

/**
 * POST: upsert de un kind por nombre, devuelve lista completa (ordenada)
 * Body: { name: string }
 */
export async function POST(req: Request) {
  try {
    const model = getModel("exerciseKind", "ExerciseKind", "kind", "Kind");
    if (!model) {
      return new NextResponse(
        "Modelo ExerciseKind/Kind no disponible en el schema actual",
        { status: 501 }
      );
    }
    const { name } = await req.json();
    const n = String(name || "").trim();
    if (!n) return new NextResponse("name requerido", { status: 400 });

    await model.upsert({
      where: { name: n },
      update: {},
      create: { name: n },
    });

    const rows = await model.findMany({ orderBy: { name: "asc" } });
    const list = (rows || []).map((r: any) => String(r.name)).filter(Boolean);
    return NextResponse.json(list);
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

/**
 * PUT: reemplaza TODO el set de kinds, devuelve lista resultante (ordenada)
 * Body: { items: string[] }
 */
export async function PUT(req: Request) {
  try {
    const model = getModel("exerciseKind", "ExerciseKind", "kind", "Kind");
    if (!model) {
      return new NextResponse(
        "Modelo ExerciseKind/Kind no disponible en el schema actual",
        { status: 501 }
      );
    }
    const { items } = await req.json();
    const clean: string[] = Array.from(
      new Set(
        (Array.isArray(items) ? items : [])
          .map((s) => String(s).trim())
          .filter(Boolean)
      )
    );

    const currentRows = await model.findMany({ select: { name: true } });
    const currentSet: Set<string> = new Set(
      (currentRows || []).map((r: any) => String(r.name))
    );
    const nextSet: Set<string> = new Set(clean);

    const toDelete: string[] = [...currentSet].filter((n) => !nextSet.has(n));
    if (toDelete.length) {
      await model.deleteMany({ where: { name: { in: toDelete } } });
    }

    await Promise.all(
      clean.map((n) =>
        model.upsert({
          where: { name: n },
          update: {},
          create: { name: n },
        })
      )
    );

    const rows = await model.findMany({ orderBy: { name: "asc" } });
    const list = (rows || []).map((r: any) => String(r.name)).filter(Boolean);
    return NextResponse.json(list);
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
