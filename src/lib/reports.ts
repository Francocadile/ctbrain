import type { NextRequest } from "next/server";
import type { Prisma, Role } from "@prisma/client";
import { dbScope } from "@/lib/dbScope";

export const REPORT_TYPE_OPTIONS = [
  { value: "pre-partido", label: "Pre-partido" },
  { value: "post-partido", label: "Post-partido" },
  { value: "microciclo", label: "Microciclo" },
] as const;

export type ReportTypeValue = (typeof REPORT_TYPE_OPTIONS)[number]["value"];

export function isReportType(value: string | undefined | null): value is ReportTypeValue {
  return REPORT_TYPE_OPTIONS.some((option) => option.value === (value || "").toLowerCase());
}

export function getReportTypeLabel(value: string) {
  return REPORT_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export const reportSelect = {
  id: true,
  teamId: true,
  title: true,
  summary: true,
  content: true,
  type: true,
  authorId: true,
  createdAt: true,
  author: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
} satisfies Prisma.ReportSelect;

export type ReportDTO = Prisma.ReportGetPayload<{ select: typeof reportSelect }>;

type ListOptions = {
  req?: Request | NextRequest;
  roles?: Role[];
  take?: number;
};

export async function listReportsForTeam(options: ListOptions = {}) {
  const { prisma, team } = await dbScope({ req: options.req, roles: options.roles });
  return prisma.report.findMany({
    where: { teamId: team.id },
    orderBy: { createdAt: "desc" },
    select: reportSelect,
    take: options.take,
  });
}
