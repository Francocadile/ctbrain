// src/app/api/ct/settings/kinds/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

function getModel(name: string): any | null {
  const m = (prisma as any)[name];
  return m && typeof m === "object" ? m : null;
}

export async function GET() {
  try {
    const model = getModel("exerciseKind");
    if (!model) {
      // Sin modelo -> lista vacía (el front tiene fallback a localStorage)
      return NextResponse.json([]);
    }
    const all = await model.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(all.map((k: any) => k.name));
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const model = getModel("exerciseKind");
    if (!model) {
      return new NextResponse(
        "Modelo ExerciseKind no disponible en el schema actual",
        { status: 501 }
      );
    }
    const { name } = await req.json();
    const n = String(name || "").trim();
    if (!n) return new NextResponse("Nombre requerido", { status: 400 });
    await model.upsert({ where: { name: n }, update: {}, create: { name: n } });
    const all = await model.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(all.map((k: any) => k.name));
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const model = getModel("exerciseKind");
    if (!model) {
      return new NextResponse(
        "Modelo ExerciseKind no disponible en el schema actual",
        { status: 501 }
      );
    }
    const { items } = await req.json();
    if (!Array.isArray(items)) return new NextResponse("items[] requerido", { status: 400 });
    const clean: string[] = Array.from(new Set(items.map((s: string)=> (s||"").trim()).filter(Boolean)));

    const current = await model.findMany();
    const currentSet = new Set(current.map((x: any) => x.name));
    const nextSet = new Set(clean);

    const toDelete = [...currentSet].filter(n => !nextSet.has(n));
    if (toDelete.length) await model.deleteMany({ where: { name: { in: toDelete } } });

    await Promise.all(clean.map((n)=> model.upsert({ where: { name: n }, update: {}, create: { name: n } })));

    const all = await model.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(all.map((k: any) => k.name));
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
