// src/app/api/metrics/rpe/[id]/route.ts
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getCurrentTeamId } from "@/lib/sessionScope";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const staffRoles = new Set<Role>([
  Role.ADMIN,
  Role.CT,
  Role.MEDICO,
  Role.DIRECTIVO,
]);

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = String(params?.id || "");
    if (!id) return new NextResponse("id requerido", { status: 400 });

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("UNAUTHENTICATED", { status: 401 });
    }

    const role = session.user.role as Role | undefined;
    if (!role) {
      return new NextResponse("FORBIDDEN", { status: 403 });
    }

    const b = await req.json();
    const duration =
      b?.duration == null ? null : Math.max(0, Number(b.duration));

    const row = await prisma.rPEEntry.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            teams: { select: { teamId: true } },
            name: true,
            email: true,
          },
        },
      },
    });
    if (!row) return new NextResponse("No encontrado", { status: 404 });

    if (role !== Role.SUPERADMIN) {
      if (!staffRoles.has(role)) {
        return new NextResponse("FORBIDDEN", { status: 403 });
      }
      const teamId = getCurrentTeamId(session);
      if (!teamId) {
        return new NextResponse("TEAM_REQUIRED", { status: 428 });
      }
      const allowed = row.user?.teams?.some((t) => t.teamId === teamId);
      if (!allowed) {
        return new NextResponse("FORBIDDEN", { status: 403 });
      }
    }

    const load =
      duration == null ? null : (Math.round(Number(row.rpe)) || 0) * duration;

    const updated = await prisma.rPEEntry.update({
      where: { id },
      data: { duration, load },
      include: { user: { select: { name: true, email: true } } },
    });

    return NextResponse.json({
      ...updated,
      userName: updated.user?.name ?? updated.user?.email ?? "—",
    });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}
