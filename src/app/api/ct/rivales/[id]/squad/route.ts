// src/app/api/ct/rivales/[id]/squad/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

// Reutilizamos un único cliente en dev para evitar "too many clients"
const prisma = (globalThis as any).__prisma__ ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") {
  (globalThis as any).__prisma__ = prisma;
}

type SquadItem = {
  number?: number | null;
  name: string;
  position?: string | null;
  videoTitle?: string | null;
  videoUrl?: string | null;
};

function cleanSquad(input: any): SquadItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((r) => ({
      number:
        r?.number === "" || r?.number == null
          ? null
          : Number.isFinite(Number(r?.number))
          ? Number(r.number)
          : null,
      name: String(r?.name || "").trim(),
      position: (r?.position ?? null) ? String(r.position).trim() : null,
      videoTitle: (r?.videoTitle ?? null) ? String(r.videoTitle).trim() : null,
      videoUrl: (r?.videoUrl ?? null) ? String(r.videoUrl).trim() : null,
    }))
    .filter((r) => r.name.length > 0);
}

// GET /api/ct/rivales/:id/squad
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const row = await prisma.rival.findUnique({
      where: { id },
      select: { squad: true },
    });
    if (!row) return new NextResponse("No encontrado", { status: 404 });

    const data = Array.isArray(row.squad) ? (row.squad as any[]) : [];
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
    const squad = cleanSquad(body?.squad);

    const row = await prisma.rival.update({
      where: { id },
      data: { squad: squad as any },
      select: { squad: true },
    });

    return NextResponse.json({ data: row.squad || [] });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
