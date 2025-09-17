// src/app/api/ct/rivales/[id]/squad/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

// Evitar múltiples clientes en dev/hot-reload
const prisma = (globalThis as any).__prisma__ ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") {
  (globalThis as any).__prisma__ = prisma;
}

function cleanString(v: any) {
  if (typeof v !== "string") return "";
  const s = v.trim();
  return s === "" ? "" : s;
}
function cleanNumber(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// GET: devuelve planSquad
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const row = await prisma.rival.findUnique({
      where: { id },
      select: { planSquad: true },
    });
    if (!row) return new NextResponse("No encontrado", { status: 404 });

    const data = Array.isArray(row.planSquad) ? row.planSquad : [];
    return NextResponse.json({ data });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

// PUT: guarda planSquad
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const body = await req.json().catch(() => ({}));
    const items = Array.isArray(body?.squad) ? body.squad : [];

    const cleaned = items.map((it: any) => ({
      number: cleanNumber(it?.number),
      name: cleanString(it?.name),
      position: cleanString(it?.position),
      videoTitle: cleanString(it?.videoTitle),
      videoUrl: cleanString(it?.videoUrl),
    }));

    const row = await prisma.rival.update({
      where: { id },
      data: { planSquad: cleaned as any },
      select: { planSquad: true },
    });

    return NextResponse.json({ data: row.planSquad ?? [] });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
