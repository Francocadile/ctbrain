// src/app/api/ct/settings/places/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function GET() {
  try {
    const all = await prisma.place.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(all.map(p => p.name));
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    const n = String(name || "").trim();
    if (!n) return new NextResponse("Nombre requerido", { status: 400 });
    await prisma.place.upsert({ where: { name: n }, update: {}, create: { name: n } });
    const all = await prisma.place.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(all.map(p => p.name));
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { items } = await req.json();
    if (!Array.isArray(items)) return new NextResponse("items[] requerido", { status: 400 });
    const clean: string[] = Array.from(new Set(items.map((s: string)=> (s||"").trim()).filter(Boolean)));

    const current = await prisma.place.findMany();
    const currentSet = new Set(current.map(x => x.name));
    const nextSet = new Set(clean);

    const toDelete = [...currentSet].filter(n => !nextSet.has(n));
    if (toDelete.length) await prisma.place.deleteMany({ where: { name: { in: toDelete } } });

    await Promise.all(clean.map((n)=> prisma.place.upsert({ where: { name: n }, update: {}, create: { name: n } })));

    const all = await prisma.place.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(all.map(p => p.name));
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
