// src/lib/planner/labels.ts
// Shared helper to fetch planner labels/row IDs the same way the API does.

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export type PlannerLabelsResult = {
  rowLabels: Record<string, string> | null;
  contentRowIds: string[] | null;
};

/**
 * Team-scoped helper: returns the exact shape used by GET /api/planner/labels.
 *
 * Notes:
 * - PlannerPrefs are per teamId.
 * - This helper intentionally returns nulls (not empty defaults) to match the API.
 */
export async function getPlannerLabelsForTeam(teamId: string): Promise<PlannerLabelsResult> {
  const where = { teamId } as unknown as Prisma.PlannerPrefsWhereUniqueInput;
  const pref = await (prisma as any).plannerPrefs.findUnique({ where });
  return {
    rowLabels: (pref?.rowLabels as Record<string, string> | null) ?? null,
    contentRowIds: (pref?.contentRowIds as string[] | null) ?? null,
  };
}

// Back-compat: older call sites still pass userId; team-scoped ignores it.
export async function getPlannerLabelsForUserTeam(
  _userId: string,
  teamId: string,
): Promise<PlannerLabelsResult> {
  return getPlannerLabelsForTeam(teamId);
}
