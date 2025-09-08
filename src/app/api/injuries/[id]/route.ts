// src/app/api/injuries/[id]/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });
    const b = await req.json();

    const data: any = {};
    if (b.status !== undefined) data.status = String(b.status);
    if (b.bodyPart !== undefined) data.bodyPart = b.bodyPart ? String(b.bodyPart) : null;
    if (b.laterality !== undefined) data.laterality = b.laterality ? String(b.laterality) : null;
    if (b.mechanism !== undefined) data.mechanism = b.mechanism ? String(b.mechanism) : null;
    if (b.expectedReturn !== undefined)
      data.expectedReturn = b.expectedReturn ? new Date(b.expectedReturn) : null;
    if (b.notes !== undefined) data.notes = b.notes ? String(b.notes) : null;

    const entry = await prisma.injuryEntry.update({
      where: { id },
      data,
      include: { user: { select: { name: true, email: true } } },
    });
    return NextResponse.json({
      ...entry,
      userName: entry.user?.name ?? entry.user?.email ?? "—",
    });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
