type WhereInput = Record<string, unknown>;

export function scopedWhere<T extends WhereInput | undefined>(teamId: string, where: T): WhereInput {
  return { ...(where ?? {}), teamId };
}

export function scopedFindManyArgs<T extends { where?: WhereInput }>(teamId: string, args: T = {} as T): T {
  return { ...args, where: scopedWhere(teamId, args?.where) };
}

export function scopedCreateArgs<T extends { data: WhereInput }>(teamId: string, args: T): T {
  return { ...args, data: { ...args.data, teamId } };
}

export function scopedUpdateArgs<T extends { where?: WhereInput; data?: WhereInput }>(teamId: string, args: T): T {
  return {
    ...args,
    where: scopedWhere(teamId, args?.where),
    data: args.data ? { ...args.data, teamId: (args.data as any).teamId ?? teamId } : args.data,
  };
}
