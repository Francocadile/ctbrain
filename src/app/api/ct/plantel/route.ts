import { NextResponse } from "next/server";
import { dbScope, scopedCreateArgs } from "@/lib/dbScope";

export async function POST(req: Request) {
  try {
  const { prisma, team } = await dbScope({ req });
    const body = await req.json();

    if (!body?.name) {
      return NextResponse.json({ error: "name requerido" }, { status: 400 });
    }

    const player = await (prisma as any).player.create(
      scopedCreateArgs(team.id, {
        data: {
          name: body.name,
          shirtNumber: body.shirtNumber ?? null,
          position: body.position ?? null,
          photoUrl: body.photoUrl ?? null,
          status: body.status ?? "ACTIVO",
        },
      }) as any
    );

    return NextResponse.json({ data: player }, { status: 201 });
  } catch (err: any) {
    console.error("ct plantel create error", err);
    return NextResponse.json({ error: err?.message ?? "Error" }, { status: 500 });
  }
}
