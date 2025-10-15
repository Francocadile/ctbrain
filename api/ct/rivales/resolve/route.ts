// src/app/api/ct/rivales/resolve/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

// Reusar Prisma en dev/hot-reload
const prisma = (globalThis as any).__prisma__ ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") {
  (globalThis as any).__prisma__ = prisma;
}

// Extrae candidato del título: "Partido vs Boca", "vs. River", "contra San Lorenzo"
function extractCandidate(raw: string) {
  const s = raw.replace(/\s+/g, " ").trim();
  const m = s.match(/\b(?:vs\.?|v\.?|contra)\s+(.*)$/i);
  const cand = (m ? m[1] : s).trim();
  // Limpieza simple de adornos comunes
  return cand.replace(/^[\-–:]+/, "").replace(/[\(\)]/g, "").trim();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = String(searchParams.get("q") || "").trim();
    if (!q) return new NextResponse("q requerido", { status: 400 });

    const candidate = extractCandidate(q);
    if (!candidate) return new NextResponse("query vacío", { status: 400 });

    // 1) Intento exacto (insensible a mayúsculas)
    let rival = await prisma.rival.findFirst({
      where: { name: { equals: candidate, mode: "insensitive" } },
      select: { id: true, name: true },
    });

    // 2) Si no, por 'contains'
    if (!rival) {
      rival = await prisma.rival.findFirst({
        where: { name: { contains: candidate, mode: "insensitive" } },
        select: { id: true, name: true },
      });
    }

    if (!rival) return new NextResponse("No encontrado", { status: 404 });
    return NextResponse.json({ data: rival });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
