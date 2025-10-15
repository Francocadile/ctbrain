// src/app/api/ct/rivales/[id]/videos/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";
const prisma = new PrismaClient();

type RivalVideo = { title?: string | null; url: string };

function sanitize(list: any): RivalVideo[] {
  if (!Array.isArray(list)) return [];
  const out: RivalVideo[] = [];
  for (const raw of list.slice(0, 100)) {
    const url = typeof raw?.url === "string" ? raw.url.trim() : "";
    if (!url) continue;
    const title =
      typeof raw?.title === "string" && raw.title.trim()
        ? raw.title.trim()
        : null;
    out.push({ url, title });
  }
  return out;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const r = await prisma.rival.findUnique({
      where: { id },
      select: { planVideos: true },
    });
    if (!r) return new NextResponse("No encontrado", { status: 404 });

    const videos = Array.isArray(r.planVideos) ? (r.planVideos as any[]) : [];
    return NextResponse.json({ data: sanitize(videos) });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const body = await req.json();
    const videos = sanitize(body?.videos);

    const row = await prisma.rival.update({
      where: { id },
      data: { planVideos: videos as any },
      select: { planVideos: true },
    });

    const data = Array.isArray(row.planVideos) ? row.planVideos : [];
    return NextResponse.json({ data });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
