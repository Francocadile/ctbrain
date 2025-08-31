// src/app/api/ct/settings/places/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { DEFAULT_PLACES } from "@/lib/settings";

const prisma = new PrismaClient();

/** Intenta obtener un modelo de Prisma por nombre (case-insensitive) */
function getModel(...names: string[]): any | null {
  for (const n of names) {
    const m = (prisma as any)[n];
    if (m && typeof m === "object") return m;
  }
  return null;
}

/**
 * GET: devuelve la lista de lugares
 * - Si existe un modelo en DB (p.ej. Place / place), lee de DB.
 * - Si no existe, devuelve DEFAULT_PLACES (para que el front cachee en LS).
 */
export async function GET() {
  try {
    const model = getModel("place", "Place", "places", "Places");
    if (!model) {
      return NextResponse.json([...DEFAULT_PLACES]);
    }
    const rows = await model.findMany({ orderBy: { name: "asc" } });
    const list = (rows || []).map((r: any) => String(r.name)).filter(Boolean);
    return NextResponse.json(list);
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

/**
 * POST: upsert de un lugar por nombre, devuelve la lista completa (ordenada)
 * Body: { name: string }
 */
export async function POST(req: Request) {
  try {
    const model = getModel("place", "Place", "places", "Places");
    if (!model) {
      return new NextResponse(
        "Modelo Place no disponible en el schema actual",
        { status: 501 }
      );
    }
    const { name } = await req.json();
    const n = String(name || "").trim();
    if (!n) return new NextResponse("name requerido", { status: 400 });

    // upsert por nombre
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
 * PUT: reemplaza TODO el set de lugares, devuelve la lista resultante (ordenada)
 * Body: { items: string[] }
 */
export async function PUT(req: Request) {
  try {
    const model = getModel("place", "Place", "places", "Places");
    if (!model) {
      return new NextResponse(
        "Modelo Place no disponible en el schema actual",
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

    // upsert de todos los que deben existir
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
