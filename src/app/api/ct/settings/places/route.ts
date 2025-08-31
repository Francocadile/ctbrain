// src/app/api/ct/settings/places/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

function getModel(name: string): any | null {
  const m = (prisma as any)[name];
  return m && typeof m === "object" ? m : null;
}

export async function GET() {
  try {
    const model = getModel("place");
    if (!model) {
      return NextResponse.json([]);
    }
    const all = await model.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(all.map((p: any) => String(p.name)));
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const model = getModel("place");
    if (!model) {
      return new NextResponse("Modelo Place no disponible en el schema actual", { status: 501 });
    }
    const { name } = await req.json();
    const n = String(name || "").trim();
    if (!n) return new NextResponse("Nombre requerido", { status: 400 });

    await model.upsert({ where: { name: n }, update: {}, create: { name: n } });
    const all = await model.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(all.map((p: any) => String(p.name)));
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const model = getModel("place");
    if (!model) {
      return new NextResponse("Modelo Place no disponible en el schema actual", { status: 501 });
    }
    const { items } = await req.json();
    if (!Array.isArray(items)) return new NextResponse("items[] requerido", { status: 400 });

    const clean: string[] = Array.from(new Set(items.map((s: any) => String(s || "").trim()).filter(Boolean)));

    const current = await model.findMany();
    const currentSet = new Set<string>(current.map((x: any) => String(x.name)));
    const nextSet = new Set<string>(clean);

    const toDelete: string[] = [...currentSet].filter((n) => !nextSet.has(n));
    if (toDelete.length) await model.deleteMany({ where: { name: { in: toDelete } } });

    await Promise.all(clean.map((n) => model.upsert({ where: { name: n }, update: {}, create: { name: n } })));

    const all = await model.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(all.map((p: any) => String(p.name)));
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
