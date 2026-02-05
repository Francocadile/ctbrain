import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

// GET /api/ct/routines/search?q=
export async function GET(req: Request) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();

    if (!q) {
      return NextResponse.json({ ok: true, routines: [] });
    }

    const routines = await prisma.routine.findMany({
      where: {
        teamId: team.id,
        title: {
          contains: q,
          mode: "insensitive",
        },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 20,
      select: { id: true, title: true },
    });

    return NextResponse.json({ ok: true, routines });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct routines search error", error);
    return NextResponse.json({ ok: false, error: error?.message || "Error" }, { status: 500 });
  }
}
