// src/app/api/ct/rivals/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

function getModel(name: string): any | null {
  const m = (prisma as any)[name];
  return m && typeof m === "object" ? m : null;
}

export async function GET() {
  try {
    const model = getModel("rival");
    if (!model) {
      return NextResponse.json([]);
    }
    const all = await model.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(
      all.map((r: any) => ({ id: r.id, name: r.name, logoUrl: r.logoUrl ?? null }))
    );
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const model = getModel("rival");
    if (!model) {
      return new NextResponse("Modelo Rival no disponible en el schema actual", { status: 501 });
    }
    const { id, name, logoUrl } = await req.json();
    const n = String(name || "").trim();
    if (!n) return new NextResponse("name requerido", { status: 400 });

    const data = id
      ? await model.update({ where: { id: String(id) }, data: { name: n, logoUrl: logoUrl || null } })
      : await model.upsert({
          where: { name: n },
          update: { logoUrl: logoUrl || null },
          create: { name: n, logoUrl: logoUrl || null },
        });

    return NextResponse.json({ id: data.id, name: data.name, logoUrl: data.logoUrl ?? null });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const model = getModel("rival");
    if (!model) {
      return new NextResponse("Modelo Rival no disponible en el schema actual", { status: 501 });
    }
    const { idOrName } = await req.json();
    if (!idOrName) return new NextResponse("idOrName requerido", { status: 400 });

    await model.delete({ where: { id: String(idOrName) } }).catch(async () => {
      await model.deleteMany({ where: { name: String(idOrName) } });
    });

    return NextResponse.json({});
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
