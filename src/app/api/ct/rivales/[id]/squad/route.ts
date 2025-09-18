// src/app/api/ct/rivales/[id]/squad/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

// Reusar Prisma en dev / hot-reload
const prisma = (globalThis as any).__prisma__ ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") {
  (globalThis as any).__prisma__ = prisma;
}

type SquadVideo = { title?: string | null; url: string };
type SquadPlayer = {
  number?: string | number | null;
  name: string;
  position?: string | null;
  video?: SquadVideo | null;
};

// Elimina undefined / valores no-JSON
function toCleanJson<T>(v: T): T {
  return JSON.parse(JSON.stringify(v ?? null));
}

// GET: devuelve el plantel guardado (array) o []
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

// PUT: guarda el plantel (sanitizado)
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const body = await req.json().catch(() => ({}));
    const raw = Array.isArray(body?.squad) ? (body.squad as any[]) : [];

    // Normalizamos + quitamos undefined
    const prepared: SquadPlayer[] = raw
      .map((p) => ({
        number: p?.number ?? null,
        name: String(p?.name || "").trim(),
        position: p?.position ?? null,
        video:
          p?.video?.url
            ? {
                title:
                  p?.video?.title === undefined ? null : (p?.video?.title ?? null),
                url: String(p?.video?.url),
              }
            : null,
      }))
      .filter((p) => p.name.length > 0);

    const clean = toCleanJson(prepared); // <-- clave: sin undefined

    const row = await prisma.rival.update({
      where: { id },
      data: { planSquad: clean as any },
      select: { planSquad: true },
    });

    const data = Array.isArray(row.planSquad) ? row.planSquad : [];
    return NextResponse.json({ data });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
