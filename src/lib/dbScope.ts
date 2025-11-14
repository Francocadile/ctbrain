import type { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getCurrentTeamId } from "@/lib/sessionScope";

type WhereInput = Record<string, unknown>;
type ScopedArgs = { where?: WhereInput } & Record<string, unknown>;

type DbScopeOptions = {
  req?: Request | NextRequest;
  roles?: Role[];
};

type ResolvedSession = NonNullable<Awaited<ReturnType<typeof getServerSession>>>;
type DbScopeResult = {
  prisma: typeof prisma;
  session: ResolvedSession;
  user: Required<Session>["user"] & { id: string };
  team: { id: string };
};

export async function dbScope(options: DbScopeOptions = {}): Promise<DbScopeResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Response("No autenticado", { status: 401 });
  }

  if (options.roles?.length) {
    const role = session.user.role as Role | undefined;
    if (!role || !options.roles.includes(role)) {
      throw new Response("No autorizado", { status: 403 });
    }
  }

  let teamId = options.req?.headers.get("x-team")?.trim() ?? null;
  if (!teamId) {
    teamId = getCurrentTeamId(session);
  }
  if (!teamId) {
    throw new Response("Team selection required", { status: 428 });
  }

  const user = session.user as Required<Session>["user"] & { id: string };

  return {
    prisma,
    session,
    user,
    team: { id: teamId },
  };
}

export function scopedWhere<T extends WhereInput | undefined>(teamId: string, where: T): WhereInput {
  return { ...(where ?? {}), teamId };
}

export function scopedFindManyArgs<T extends ScopedArgs>(teamId: string, args: T = {} as T): T {
  return { ...args, where: scopedWhere(teamId, args?.where) };
}

export function scopedCreateArgs<T extends { data: WhereInput }>(teamId: string, args: T): T & {
  data: T["data"] & { teamId: string };
} {
  return { ...args, data: { ...args.data, teamId } } as T & {
    data: T["data"] & { teamId: string };
  };
}

export function scopedUpdateArgs<T extends { where?: WhereInput; data?: WhereInput }>(teamId: string, args: T): T {
  return {
    ...args,
    where: scopedWhere(teamId, args?.where),
    data: args.data ? { ...args.data, teamId: (args.data as any).teamId ?? teamId } : args.data,
  };
}
