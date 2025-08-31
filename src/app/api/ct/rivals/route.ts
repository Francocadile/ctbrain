// src/app/api/ct/rivals/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function GET() {
  try {
    const all = await prisma.rival.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(all.map(r => ({ id: r.id, name: r.name, logoUrl: r.logoUrl || null })));
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { id, name, logoUrl } = await req.json();
    const n = String(name || "").trim();
    if (!n) return new NextResponse("name requerido", { status: 400 });

    let data;
    if (id) {
      data = await prisma.rival.update({ where: { id }, data: { name: n, logoUrl: logoUrl || null }});
    } else {
      data = await prisma.rival.upsert({
        where: { name: n },
        update: { logoUrl: logoUrl || null },
        create: { name: n, logoUrl: logoUrl || null }
      });
    }
    return NextResponse.json({ id: data.id, name: data.name, logoUrl: data.logoUrl || null });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { idOrName } = await req.json();
    if (!idOrName) return new NextResponse("idOrName requerido", { status: 400 });

    // intenta por id; si falla, por nombre
    await prisma.rival.delete({ where: { id: String(idOrName) } }).catch(async () => {
      await prisma.rival.deleteMany({ where: { name: String(idOrName) } });
    });

    return NextResponse.json({});
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
