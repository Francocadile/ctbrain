import { NextResponse } from "next/server";
import { dbScope, scopedWhere } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

type SquadVideo = { title?: string | null; url: string };
type SquadPlayer = {
  number?: string | number | null;
  name: string;
  position?: string | null;
  video?: SquadVideo | null;
};

// Elimina undefined / valores no-JSON
function toCleanJson<T>(v: T): T {
  return JSON.parse(JSON.stringify(v ?? null));
}

// GET /api/ct/rivales/:id/squad
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const { prisma, team } = await dbScope({ req });
    const row = await prisma.rival.findFirst({
      where: scopedWhere(team.id, { id }) as any,
      select: { planSquad: true },
    });
    if (!row) return new NextResponse("No encontrado", { status: 404 });

    const data = Array.isArray(row.planSquad) ? row.planSquad : [];
    return NextResponse.json({ data });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("multitenant rival squad get error", error);
    return new NextResponse(error?.message || "Error", { status: 500 });
  }
}

// PUT /api/ct/rivales/:id/squad
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

  const { prisma, team } = await dbScope({ req });
  const exists = await prisma.rival.findFirst({ where: scopedWhere(team.id, { id }) as any, select: { id: true } });
  if (!exists) return new NextResponse("No encontrado", { status: 404 });

    const body = await req.json().catch(() => ({}));

    // Aceptamos body.squad o body.players
    const raw =
      Array.isArray(body?.squad)   ? (body.squad as any[]) :
      Array.isArray(body?.players) ? (body.players as any[]) :
      [];

    const prepared: SquadPlayer[] = raw
      .map((p) => ({
        number: p?.number ?? null,
        name: String(p?.name || "").trim(),
        position: p?.position ?? null,
        video: p?.video?.url
          ? {
              title: p?.video?.title === undefined ? null : (p?.video?.title ?? null),
              url: String(p?.video?.url),
            }
          : null,
      }))
      .filter((p) => p.name.length > 0);

    const clean = toCleanJson(prepared);

    const updated = await prisma.rival.updateMany({
      where: { id, teamId: team.id },
      data: { planSquad: clean as any },
    });
    if (updated.count === 0) return new NextResponse("No encontrado", { status: 404 });

    const row = await prisma.rival.findFirst({
      where: scopedWhere(team.id, { id }) as any,
      select: { planSquad: true },
    });

    const data = Array.isArray(row?.planSquad) ? row?.planSquad : [];
    return NextResponse.json({ data });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("multitenant rival squad put error", error);
    return new NextResponse(error?.message || "Error", { status: 500 });
  }
}
