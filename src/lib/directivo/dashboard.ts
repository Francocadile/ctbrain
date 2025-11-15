import type { Prisma } from "@prisma/client";
import { dbScope, scopedWhere } from "@/lib/dbScope";

const METRIC_WINDOW_DAYS = 7;

export type DirectivoDashboardMetrics = {
  windowStart: Date;
  windowEnd: Date;
  sessionCount: number;
  plannedMinutes: number;
  feedbackResponses: number;
  playersResponded: number;
};

function subtractDays(base: Date, days: number) {
  const copy = new Date(base);
  copy.setDate(copy.getDate() - days);
  return copy;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export async function getDirectivoDashboardMetrics(): Promise<DirectivoDashboardMetrics> {
  const { prisma, team } = await dbScope();
  const windowEnd = new Date();
  const windowStart = startOfDay(subtractDays(windowEnd, METRIC_WINDOW_DAYS));

  const sessionWhere = scopedWhere(team.id, {
    date: { gte: windowStart },
  }) as Prisma.SessionWhereInput;

  const feedbackWhere = scopedWhere(team.id, {
    createdAt: { gte: windowStart },
  }) as Prisma.PlayerFeedbackWhereInput;

  const [sessionCount, feedbackResponses, playerRows] = await Promise.all([
    prisma.session.count({ where: sessionWhere }),
    prisma.playerFeedback.count({ where: feedbackWhere }),
    prisma.playerFeedback.findMany({
      where: feedbackWhere,
      distinct: ["playerId"],
      select: { playerId: true },
    }),
  ]);

  return {
    windowStart,
    windowEnd,
    sessionCount,
    plannedMinutes: sessionCount,
    feedbackResponses,
    playersResponded: playerRows.length,
  };
}
