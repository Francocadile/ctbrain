'use client';

import { useSession } from 'next-auth/react';
import type { AppRole } from '@/types/next-auth';

type Props =
  | { allow: AppRole[]; allowed?: never; children: React.ReactNode }
  | { allowed: AppRole[]; allow?: never; children: React.ReactNode };

export default function RoleGate(props: Props) {
  const { data: session, status } = useSession();

  // Normaliza la prop a una única lista de roles permitidos
  const roles = 'allow' in props ? props.allow : props.allowed;

  // Evitar parpadeo mientras carga la sesión
  if (status === 'loading') return null;

  const userRole = session?.user?.role;
  if (!userRole || !roles?.includes(userRole)) return null;

  return <>{props.children}</>;
}
