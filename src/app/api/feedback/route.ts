import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireTeamIdFromRequest } from "@/lib/teamContext";
import { scopedCreateArgs, scopedFindManyArgs, scopedWhere } from "@/lib/dbScope";

const secret = process.env.NEXTAUTH_SECRET;

const listSchema = z.object({
  playerId: z.string().trim().min(1).optional(),
  from: z.string().trim().datetime().optional(),
  to: z.string().trim().datetime().optional(),
});

const createSchema = z.object({
  playerId: z.string().trim().min(1),
  subject: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => v || null),
  text: z.string().trim().min(1).max(2000),
  rating: z
    .coerce.number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .transform((v) => (Number.isFinite(v) ? v : null)),
});

function asMap<T extends { id: string }>(rows: T[]) {
  return rows.reduce<Record<string, T>>((acc, row) => {
    acc[row.id] = row;
    return acc;
  }, {} as Record<string, T>);
}

export async function GET(req: NextRequest) {
  try {
    if (!secret) throw new Error("NEXTAUTH_SECRET missing");

    const token = await getToken({ req, secret });
    if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (token as any).role as string | undefined;
    if (!role || !["CT", "MEDICO"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const params = listSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!params.success) return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });

    const teamId = await requireTeamIdFromRequest(req);
    const { playerId, from, to } = params.data;

    const where: Record<string, any> = scopedWhere(teamId, {});
    if (playerId) where.playerId = playerId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const entries = await prisma.playerFeedback.findMany(
      scopedFindManyArgs(teamId, {
        where,
        orderBy: [{ createdAt: "desc" }],
        take: 200,
      }) as any,
    );

    const ids = Array.from(new Set(entries.flatMap((e) => [e.playerId, e.createdBy])));
    const users = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, email: true },
    });
    const userMap = asMap(users);

    return NextResponse.json({
      data: entries.map((row) => ({
        id: row.id,
        playerId: row.playerId,
        playerName: userMap[row.playerId]?.name || userMap[row.playerId]?.email || row.playerId,
        subject: row.subject,
        text: row.text,
        rating: row.rating,
        createdAt: row.createdAt,
        createdBy: row.createdBy,
        createdByName: userMap[row.createdBy]?.name || userMap[row.createdBy]?.email || row.createdBy,
      })),
    });
  } catch (err) {
    console.error("[feedback] GET failed", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!secret) throw new Error("NEXTAUTH_SECRET missing");

    const token = await getToken({ req, secret });
    if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (token as any).role as string | undefined;
    if (role !== "JUGADOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

    const teamId = await requireTeamIdFromRequest(req);
    const { playerId, subject, text, rating } = parsed.data;

    if (playerId !== token.sub) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const entry = await prisma.playerFeedback.create(
      scopedCreateArgs(teamId, {
        data: {
          playerId,
          subject,
          text,
          rating,
          createdBy: token.sub,
        },
      }) as any,
    );

    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (err) {
    console.error("[feedback] POST failed", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
