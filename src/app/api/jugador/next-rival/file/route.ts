import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { dbScope } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

function contentDispositionInline(filename: string) {
  // filename="..." (simple). Evitamos caracteres raros.
  const safe = filename
    .replace(/\r|\n/g, " ")
    .replace(/"/g, "'")
    .slice(0, 180);
  return `inline; filename="${safe}"`;
}

// GET /api/jugador/next-rival/file
export async function GET(req: Request) {
  try {
    const { prisma, team } = await dbScope({ req, roles: [Role.JUGADOR, Role.ADMIN] });

    const row = await prisma.nextRivalFile.findUnique({
      where: { teamId: team.id },
      select: { fileUrl: true, fileName: true },
    });

    if (!row) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const upstream = await fetch(row.fileUrl, { cache: "no-store" });
    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => "");
      console.error("next-rival upstream fetch failed", {
        status: upstream.status,
        statusText: upstream.statusText,
        body: text,
      });
      return NextResponse.json({ error: "UPSTREAM_ERROR" }, { status: 502 });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDispositionInline(row.fileName || "next-rival.pdf"),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("jugador next-rival file proxy error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
