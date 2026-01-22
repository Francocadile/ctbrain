import type { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { dbScope } from "@/lib/dbScope";
import prisma from "@/lib/prisma";

export const VIDEO_TYPE_OPTIONS = [
  { value: "propio", label: "Propio" },
  { value: "rival", label: "Rival" },
] as const;

export type TeamVideoTypeValue = (typeof VIDEO_TYPE_OPTIONS)[number]["value"];

export function isVideoType(value: unknown): value is TeamVideoTypeValue {
  if (typeof value !== "string") return false;
  return VIDEO_TYPE_OPTIONS.some((option) => option.value === value);
}

export function getVideoTypeLabel(value: string) {
  return VIDEO_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export const teamVideoSelect = {
  id: true,
  teamId: true,
  url: true,
  title: true,
  notes: true,
  type: true,
  visibleToDirectivo: true,
  audienceMode: true,
  audience: {
    select: { userId: true },
  },
  createdAt: true,
};

export type TeamVideoDTO = {
  id: string;
  teamId: string;
  url: string;
  title: string;
  notes: string | null;
  type: string;
  visibleToDirectivo: boolean;
  audienceMode: "ALL" | "SELECTED";
  selectedUserIds: string[];
  createdAt: Date;
};

type ListOptions = {
  req?: Request | NextRequest;
  roles?: Role[];
  take?: number;
  scope?: "ct" | "directivo" | "all";
  userId?: string;
};

export async function listTeamVideos(options: ListOptions = {}) {
  const { team, user } = await dbScope({ req: options.req, roles: options.roles });

  const where: any = { teamId: team.id };
  if (options.scope === "directivo") {
    where.visibleToDirectivo = true;
  }

  // Jugador: solo videos habilitados (ALL o SELECTED con audiencia explícita).
  // No afecta CT/ADMIN/DIRECTIVO porque el scope/roles para esos flujos es distinto.
  const effectiveUserId = options.userId ?? user.id;
  if ((user.role as any) === Role.JUGADOR) {
    where.OR = [
      { audienceMode: "ALL" },
      { audienceMode: "SELECTED", audience: { some: { userId: effectiveUserId } } },
    ];
  }

  const rows = await prisma.teamVideo.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: teamVideoSelect,
    take: options.take,
  });

  return rows.map((row: any) => {
    const selectedUserIds = Array.isArray(row.audience) ? row.audience.map((a: any) => a.userId) : [];
    const { audience, ...rest } = row;
    return {
      ...rest,
      selectedUserIds,
    } as TeamVideoDTO;
  });
}
