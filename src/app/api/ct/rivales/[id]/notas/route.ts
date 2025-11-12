// src/app/api/ct/rivales/[id]/notas/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { requireTeamIdFromRequest } from "@/lib/teamContext";
import { scopedWhere } from "@/lib/dbScope";

export const dynamic = "force-dynamic";
const prisma = new PrismaClient();

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

    const teamId = await requireTeamIdFromRequest(req);
    const r = await prisma.rival.findFirst({
      where: scopedWhere(teamId, { id }) as any,
      select: { planNotes: true },
    });
    if (!r) return new NextResponse("No encontrado", { status: 404 });
    return NextResponse.json({ data: r.planNotes || {} });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const teamId = await requireTeamIdFromRequest(req);
    const current = await prisma.rival.findFirst({ where: scopedWhere(teamId, { id }) as any, select: { id: true } });
    if (!current) return new NextResponse("No encontrado", { status: 404 });

    const body = await req.json().catch(() => ({}));
    const clean = sanitize(body);

    const row = await prisma.rival.update({
      where: { id },
      data: { planNotes: clean },
      select: { planNotes: true },
    });
    return NextResponse.json({ data: row.planNotes || {} });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
