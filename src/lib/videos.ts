import type { NextRequest } from "next/server";
import { Role, type Prisma } from "@prisma/client";
import { dbScope } from "@/lib/dbScope";

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
  createdAt: true,
} satisfies Prisma.TeamVideoSelect;

export type TeamVideoDTO = Prisma.TeamVideoGetPayload<{ select: typeof teamVideoSelect }>;

type ListOptions = {
  req?: Request | NextRequest;
  roles?: Role[];
  take?: number;
};

export async function listTeamVideos(options: ListOptions = {}) {
  const { prisma, team } = await dbScope({ req: options.req, roles: options.roles });
  return prisma.teamVideo.findMany({
    where: { teamId: team.id },
    orderBy: { createdAt: "desc" },
    select: teamVideoSelect,
    take: options.take,
  });
}
