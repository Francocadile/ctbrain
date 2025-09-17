import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

// Reusar Prisma en dev/hot-reload
const prisma = (globalThis as any).__prisma__ ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") {
  (globalThis as any).__prisma__ = prisma;
}

// ---- Tipos de cada jugador que guardamos en JSON ----
type SquadItem = {
  number?: number | null;        // dorsal (opcional)
  name: string;                  // nombre (requerido)
  position?: string | null;      // ej: DL, MC
  videoTitle?: string | null;    // título opcional
  videoUrl?: string | null;      // url opcional
};

// Limpieza/normalización para asegurar que el JSON sea seguro
function normalizeSquad(input: any): SquadItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((raw) => {
      const name = String(raw?.name || "").trim();
      if (!name) return null;

      const n = raw?.number;
      const number =
        n === undefined || n === null || n === ""
          ? null
          : Number.isFinite(Number(n))
          ? Number(n)
          : null;

      const position = raw?.position ? String(raw.position).trim() : null;
      const videoTitle = raw?.videoTitle ? String(raw.videoTitle).trim() : null;
      const videoUrl = raw?.videoUrl ? String(raw.videoUrl).trim() : null;

      return { number, name, position, videoTitle, videoUrl } as SquadItem;
    })
    .filter(Boolean) as SquadItem[];
}

// GET /api/ct/rivales/:id/squad  -> devuelve el plantel
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const row = await prisma.rival.findUnique({
      where: { id },
      select: { squad: true },
    });
    if (!row) return new NextResponse("No encontrado", { status: 404 });

    // Aseguramos array
    const data = Array.isArray(row.squad) ? (row.squad as any[]) : [];
    return NextResponse.json({ data });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

// PUT /api/ct/rivales/:id/squad  -> guarda el plantel completo
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const body = await req.json().catch(() => ({}));
    const normalized = normalizeSquad(body?.squad);

    // Guardamos como JSON en la columna Rival.squad
    const row = await prisma.rival.update({
      where: { id },
      data: { squad: normalized as any },
      select: { squad: true },
    });

    const data = Array.isArray(row.squad) ? (row.squad as any[]) : [];
    return NextResponse.json({ data });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
