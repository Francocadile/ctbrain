// src/app/api/ct/rivals/[id]/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";
const prisma = new PrismaClient();

function getModel(name: string): any | null {
  const m = (prisma as any)[name];
  return m && typeof m === "object" ? m : null;
}

/**
 * GET /api/ct/rivals/[id]
 * Devuelve un rival por id
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const model = getModel("rival");
    if (!model) {
      return new NextResponse("Modelo Rival no disponible", { status: 501 });
    }

    const id = params?.id;
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const rival = await model.findUnique({ where: { id: String(id) } });
    if (!rival) return new NextResponse("No encontrado", { status: 404 });

    return NextResponse.json({
      id: rival.id,
      name: rival.name,
      logoUrl: rival.logoUrl ?? null,
    });
  } catch (e: any) {
    console.error(e);
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
