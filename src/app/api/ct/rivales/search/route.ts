import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { requireTeamIdFromRequest } from "@/lib/teamContext";
import { scopedFindManyArgs } from "@/lib/dbScope";

export const dynamic = "force-dynamic";
const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = Math.max(1, Math.min(20, Number(searchParams.get("limit") || "10")));

    if (!q) return NextResponse.json({ data: [] });

    const teamId = await requireTeamIdFromRequest(req);
    const rows = await prisma.rival.findMany(
      scopedFindManyArgs(teamId, {
        where: { name: { contains: q, mode: "insensitive" } },
        orderBy: { name: "asc" },
        take: limit,
        select: { id: true, name: true, logoUrl: true },
      }) as any,
    );

    return NextResponse.json({ data: rows });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
