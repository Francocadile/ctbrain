// src/app/api/ct/rivales/[id]/squad/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

const prisma = (globalThis as any).__prisma__ ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") {
  (globalThis as any).__prisma__ = prisma;
}

export type SquadPlayer = {
  number?: number | null;
  name: string;
  pos?: string | null;
  videoTitle?: string | null;
  videoUrl?: string | null;
};

function sanitizeSquad(input: any): SquadPlayer[] {
  const arr = Array.isArray(input) ? input : [];
  const out: SquadPlayer[] = [];
  for (const raw of arr) {
    const name = String(raw?.name ?? "").trim();
    if (!name) continue;

    let number: number | null = null;
    const n = raw?.number;
    if (typeof n === "number" && Number.isFinite(n)) number = n;
    else if (typeof n === "string" && n.trim() !== "" && !Number.isNaN(Number(n))) number = Number(n);

    const pos = (raw?.pos ?? "").toString().trim() || null;
    const videoTitle = (raw?.videoTitle ?? "").toString().trim() || null;
    const videoUrl = (raw?.videoUrl ?? "").toString().trim() || null;

    out.push({ number, name, pos, videoTitle, videoUrl });
  }
  return out.slice(0, 80);
}

// GET /api/ct/rivales/:id/squad
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const rival = await prisma.rival.findUnique({ where: { id }, select: { squad: true } });
    if (!rival) return new NextResponse("No encontrado", { status: 404 });

    const data = Array.isArray(rival.squad) ? rival.squad : [];
    return NextResponse.json({ data });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

// PUT /api/ct/rivales/:id/squad
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const body = await req.json().catch(() => ({}));
    const cleaned = sanitizeSquad(body?.squad);

    const updated = await prisma.rival.update({
      where: { id },
      data: { squad: cleaned as any },
      select: { squad: true },
    });

    const data = Array.isArray(updated.squad) ? updated.squad : [];
    return NextResponse.json({ data });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
