import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { dbScope } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

// GET /api/jugador/next-rival
export async function GET(req: Request) {
  try {
    const { prisma, team } = await dbScope({ req, roles: [Role.JUGADOR, Role.ADMIN] });

    const row = await prisma.nextRivalFile.findUnique({
      where: { teamId: team.id },
      select: { fileName: true, uploadedAt: true },
    });

    if (!row) return NextResponse.json({ exists: false });
    return NextResponse.json({
      exists: true,
      fileName: row.fileName,
      uploadedAt: row.uploadedAt.toISOString(),
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("jugador next-rival GET error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
