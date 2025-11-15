// src/app/api/ct/rivales/[id]/notas/route.ts
import { NextResponse } from "next/server";
import { dbScope, scopedWhere } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

export type NoteItem = { text: string; done?: boolean };
export type RivalNotes = { observations?: string; checklist?: NoteItem[] };

function sanitize(body: any): RivalNotes {
  const observations =
    typeof body?.observations === "string" ? body.observations.trim() : undefined;

  const checklistIn = Array.isArray(body?.checklist) ? body.checklist : [];
  const checklist: NoteItem[] = [];
  for (const it of checklistIn.slice(0, 100)) {
    const text =
      typeof it?.text === "string" ? it.text.trim() : "";
    if (!text) continue;
    checklist.push({ text, done: Boolean(it?.done) });
  }

  return { observations, checklist };
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const { prisma, team } = await dbScope({ req });
    const r = await prisma.rival.findFirst({
      where: scopedWhere(team.id, { id }) as any,
      select: { planNotes: true },
    });
    if (!r) return new NextResponse("No encontrado", { status: 404 });
    return NextResponse.json({ data: r.planNotes || {} });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("multitenant rival notes get error", error);
    return new NextResponse(error?.message || "Error", { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const { prisma, team } = await dbScope({ req });
    const exists = await prisma.rival.findFirst({ where: scopedWhere(team.id, { id }) as any, select: { id: true } });
    if (!exists) return new NextResponse("No encontrado", { status: 404 });

    const body = await req.json().catch(() => ({}));
    const clean = sanitize(body);

    const updated = await prisma.rival.updateMany({
      where: { id, teamId: team.id },
      data: { planNotes: clean },
    });
    if (updated.count === 0) return new NextResponse("No encontrado", { status: 404 });

    const row = await prisma.rival.findFirst({ where: scopedWhere(team.id, { id }) as any, select: { planNotes: true } });
    return NextResponse.json({ data: row?.planNotes || {} });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("multitenant rival notes put error", error);
    return new NextResponse(error?.message || "Error", { status: 500 });
  }
}
