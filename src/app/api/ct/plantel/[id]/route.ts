import { NextResponse } from "next/server";
import { dbScope, scopedWhere } from "@/lib/dbScope";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { prisma, team } = await dbScope({ req });
    const body = await req.json();

    const data = {
      name: body.name,
      shirtNumber: body.shirtNumber ?? null,
      position: body.position ?? null,
      photoUrl: body.photoUrl ?? null,
      status: body.status,
    } as any; // cast local mientras Prisma no exponga PlayerUpdateInput

    const updated = await (prisma as any).player.updateMany({
      where: scopedWhere(team.id, { id: params.id }) as any, // PlayerWhereInput
      data,
    });

    if (!updated.count) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("ct plantel update error", err);
    return NextResponse.json({ error: err?.message ?? "Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { prisma, team } = await dbScope({ req });

    const deleted = await (prisma as any).player.deleteMany({
      where: scopedWhere(team.id, { id: params.id }) as any, // PlayerWhereInput
    });

    if (!deleted.count) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("ct plantel delete error", err);
    return NextResponse.json({ error: err?.message ?? "Error" }, { status: 500 });
  }
}
