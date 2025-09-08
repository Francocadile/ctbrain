import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/injuries/[id]
export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const body = await _req.json();

  const data: any = { ...body };
  if ("expectedReturn" in data) {
    data.expectedReturn = data.expectedReturn ? new Date(data.expectedReturn) : null;
  }

  const updated = await prisma.injuryEntry.update({
    where: { id },
    data,
    include: { user: { select: { name: true, email: true } } },
  });

  return NextResponse.json({
    ...updated,
    date: updated.date.toISOString().slice(0, 10),
    expectedReturn: updated.expectedReturn ? updated.expectedReturn.toISOString().slice(0, 10) : null,
  });
}
