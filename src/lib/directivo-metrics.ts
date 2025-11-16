import type { Prisma } from "@prisma/client";
import { dbScope, scopedWhere } from "@/lib/dbScope";

export type WeekKey = string; // YYYY-WW

export type WeeklyLoadPoint = {
  week: WeekKey;
  label: string;
  sessions: number;
  minutes: number;
};

export type WeeklyResponsePoint = {
  week: WeekKey;
  label: string;
  responses: number;
  responseRate: number; // 0..100
};

export type DirectivoAlerts = {
  lowLoadWeeks: WeekKey[];
  lowResponseWeeks: WeekKey[];
};

export type DirectivoMetrics = {
  windowStart: Date;
  windowEnd: Date;
  loadSeries: WeeklyLoadPoint[];
  responseSeries: WeeklyResponsePoint[];
  alerts: DirectivoAlerts;
};

const WEEKS_WINDOW = 4;

function startOfISOWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay() || 7; // 1..7 (Mon..Sun)
  if (day !== 1) {
    date.setDate(date.getDate() - (day - 1));
  }
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function weekKeyOf(d: Date): WeekKey {
  const year = d.getFullYear();
  const oneJan = new Date(year, 0, 1);
  const diff = Math.round((Number(d) - Number(oneJan)) / 86400000);
  const week = Math.floor(diff / 7) + 1;
  return `${year}-${String(week).padStart(2, "0")}`;
}

function formatWeekLabel(start: Date) {
  const end = addDays(start, 6);
  const fmt = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

export async function getDirectivoMetrics(): Promise<DirectivoMetrics> {
  const { prisma, team } = await dbScope();

  const now = new Date();
  const windowEnd = startOfISOWeek(now);
  const windowStart = addDays(windowEnd, -7 * (WEEKS_WINDOW - 1));

  const sessionWhere = scopedWhere(team.id, {
    date: { gte: windowStart, lt: addDays(windowEnd, 7) },
  }) as Prisma.SessionWhereInput;

  const feedbackWhere = scopedWhere(team.id, {
    createdAt: { gte: windowStart, lt: addDays(windowEnd, 7) },
  }) as Prisma.PlayerFeedbackWhereInput;

  const [sessions, feedbacks, players] = await Promise.all([
    prisma.session.findMany({
      where: sessionWhere,
      select: { id: true, date: true },
    }),
    prisma.playerFeedback.findMany({
      where: feedbackWhere,
      select: { id: true, createdAt: true },
    }),
    prisma.user.findMany({
      where: {
        teams: {
          some: { teamId: team.id },
        },
      },
      select: { id: true },
    }),
  ]);

  const weeks: { [key: string]: { start: Date; sessions: number; minutes: number } } = {};
  const respWeeks: { [key: string]: { start: Date; responses: number } } = {};

  function ensureWeek(map: any, date: Date) {
    const start = startOfISOWeek(date);
    const key = weekKeyOf(start);
    if (!map[key]) {
      map[key] = { start, sessions: 0, minutes: 0, responses: 0 };
    }
    return { key, bucket: map[key] };
  }

  for (const s of sessions) {
    const d = s.date instanceof Date ? s.date : new Date(s.date as any);
    const { key, bucket } = ensureWeek(weeks, d);
    bucket.sessions += 1;
    bucket.minutes += 1;
  }

  for (const f of feedbacks) {
    const d = f.createdAt instanceof Date ? f.createdAt : new Date(f.createdAt as any);
    const { key, bucket } = ensureWeek(respWeeks, d);
    bucket.responses += 1;
  }

  const playerCount = players.length || 1;

  const allKeys = new Set<WeekKey>();
  const cursor = new Date(windowStart);
  for (let i = 0; i < WEEKS_WINDOW; i++) {
    const start = addDays(cursor, i * 7);
    allKeys.add(weekKeyOf(start));
  }
  Object.keys(weeks).forEach((k) => allKeys.add(k as WeekKey));
  Object.keys(respWeeks).forEach((k) => allKeys.add(k as WeekKey));

  const sortedKeys = Array.from(allKeys).sort();

  const loadSeries: WeeklyLoadPoint[] = [];
  const responseSeries: WeeklyResponsePoint[] = [];

  for (const key of sortedKeys) {
    const w = weeks[key];
    const r = respWeeks[key];
    const start = w?.start ?? r?.start ?? windowStart;

    const sessionsCount = w?.sessions ?? 0;
    const minutesCount = w?.minutes ?? sessionsCount;
    const responses = r?.responses ?? 0;
    const responseRate = (responses / playerCount) * 100;

    loadSeries.push({
      week: key,
      label: formatWeekLabel(start),
      sessions: sessionsCount,
      minutes: minutesCount,
    });

    responseSeries.push({
      week: key,
      label: formatWeekLabel(start),
      responses,
      responseRate,
    });
  }

  // Alerts
  const lowLoadWeeks: WeekKey[] = [];
  const lowResponseWeeks: WeekKey[] = [];

  for (let i = 1; i < loadSeries.length; i++) {
    const prev = loadSeries[i - 1];
    const cur = loadSeries[i];
    if (cur.minutes < prev.minutes) {
      lowLoadWeeks.push(cur.week);
    }
  }

  for (const r of responseSeries) {
    if (r.responseRate < 60) {
      lowResponseWeeks.push(r.week);
    }
  }

  return {
    windowStart,
    windowEnd: addDays(windowEnd, 6),
    loadSeries,
    responseSeries,
    alerts: {
      lowLoadWeeks,
      lowResponseWeeks,
    },
  };
}
