import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = (globalThis as any).prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") (globalThis as any).prisma = prisma;

function fromYMD(s?: string | null): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 0, 0, 0));
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));

  const data: any = {};
  if ("status" in body) data.status = String(body.status);
  if ("bodyPart" in body) data.bodyPart = body.bodyPart ?? null;
  if ("laterality" in body) data.laterality = body.laterality ?? null;
  if ("mechanism" in body) data.mechanism = body.mechanism ?? null;
  if ("expectedReturn" in body) data.expectedReturn = fromYMD(body.expectedReturn);
  if ("notes" in body) data.notes = body.notes ?? null;

  try {
    const saved = await prisma.injuryEntry.update({ where: { id }, data });
    return NextResponse.json({ ok: true, id: saved.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Update failed" }, { status: 400 });
  }
}
