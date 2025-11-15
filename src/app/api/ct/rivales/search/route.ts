import { NextResponse } from "next/server";
import { dbScope, scopedFindManyArgs } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = Math.max(1, Math.min(20, Number(searchParams.get("limit") || "10")));

    if (!q) return NextResponse.json({ data: [] });

    const { prisma, team } = await dbScope({ req });
    const rows = await prisma.rival.findMany(
      scopedFindManyArgs(team.id, {
        where: { name: { contains: q, mode: "insensitive" } },
        orderBy: { name: "asc" },
        take: limit,
        select: { id: true, name: true, logoUrl: true },
      }) as any,
    );

    return NextResponse.json({ data: rows });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("multitenant rivales search error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
