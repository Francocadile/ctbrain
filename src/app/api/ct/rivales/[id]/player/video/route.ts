import { NextResponse } from "next/server";
import { dbScope, scopedWhere } from "@/lib/dbScope";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

type Body = {
  player_name?: string;
  videoUrl?: string;
  videoTitle?: string;
};

const asObj = <T extends Record<string, any> = Record<string, any>>(x: unknown): T =>
  (x && typeof x === "object" ? (x as T) : ({} as T));

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const { prisma, team } = await dbScope({ req });

    const body: Body = await req.json().catch(() => ({}));
    const playerName = String(body.player_name || "").trim();
    const videoUrl   = String(body.videoUrl || "").trim();
    const videoTitle = String(body.videoTitle || "").trim();

    if (!playerName) return NextResponse.json({ error: "player_name requerido" }, { status: 400 });
    if (!videoUrl)   return NextResponse.json({ error: "videoUrl requerido" }, { status: 400 });

    const rival = await prisma.rival.findFirst({
      where: scopedWhere(team.id, { id }) as any,
      select: { planReport: true }
    });
    if (!rival) return NextResponse.json({ error: "Rival no encontrado" }, { status: 404 });

    const pr = asObj<any>(rival.planReport);
    const players: any[] = Array.isArray(pr.players) ? pr.players : [];

    // Buscar jugador por nombre (case-insensitive)
    const idx = players.findIndex(p => String(p?.player_name || "").toLowerCase() === playerName.toLowerCase());

    if (idx >= 0) {
      players[idx] = {
        ...asObj(players[idx]),
        player_name: players[idx]?.player_name ?? playerName,
        videoUrl,
        ...(videoTitle ? { videoTitle } : {})
      };
    } else {
      // Si no existe, lo agregamos mínimo con su nombre y el video
      players.push({
        player_name: playerName,
        videoUrl,
        ...(videoTitle ? { videoTitle } : {})
      });
    }

    const planReport = { ...pr, players };
    const updated = await prisma.rival.updateMany({ where: { id, teamId: team.id }, data: { planReport } });
    if (updated.count === 0) return NextResponse.json({ error: "Rival no encontrado" }, { status: 404 });

    return NextResponse.json({ ok: true, player_name: playerName, videoUrl, videoTitle });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("multitenant rival player video error", error);
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}
