// src/app/api/metrics/rpe/[id]/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const b = await req.json();
    const duration =
      b?.duration == null ? null : Math.max(0, Number(b.duration));

    const row = await prisma.rPEEntry.findUnique({ where: { id } });
    if (!row) return new NextResponse("No encontrado", { status: 404 });

    const load =
      duration == null ? null : (Math.round(Number(row.rpe)) || 0) * duration;

    const updated = await prisma.rPEEntry.update({
      where: { id },
      data: { duration, load },
      include: { user: { select: { name: true, email: true } } },
    });

    return NextResponse.json({
      ...updated,
      userName: updated.user?.name ?? updated.user?.email ?? "—",
    });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
