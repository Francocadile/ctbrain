import { NextResponse } from "next/server";
import { dbScope } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { prisma, team } = await dbScope({ req, roles: ["CT", "ADMIN"] as any });

    const players = await prisma.user.findMany({
      where: {
        role: "JUGADOR",
        teams: {
          some: { teamId: team.id },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return NextResponse.json({ data: players });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct team players list error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
