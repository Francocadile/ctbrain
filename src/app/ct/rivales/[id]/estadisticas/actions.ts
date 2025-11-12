'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ensureTeamId } from '@/lib/sessionScope';
import { scopedWhere } from '@/lib/dbScope';

const prisma = new PrismaClient();

// Utilidad mínima
const asObj = <T extends Record<string, any> = Record<string, any>>(x: unknown): T =>
  typeof x === 'object' && x !== null ? (x as T) : ({} as T);

function toNum(v: FormDataEntryValue | null): number | undefined {
  if (v == null) return undefined;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

export async function guardarEstadisticas(rivalId: string, formData: FormData) {
  // Leer valores del form
  const gf = toNum(formData.get('gf'));
  const ga = toNum(formData.get('ga'));
  const possession = toNum(formData.get('possession'));
  const xg = toNum(formData.get('xg'));
  const shots = toNum(formData.get('shots'));
  const shotsOnTarget = toNum(formData.get('shotsOnTarget'));

  const session = await getServerSession(authOptions);
  const teamId = ensureTeamId(session);

  // Traer lo que hay hoy
  const current = await prisma.rival.findFirst({
    where: scopedWhere(teamId, { id: rivalId }) as any,
    select: { planReport: true },
  });
  if (!current) {
    return { ok: false, message: 'Rival no encontrado' };
  }

  const report = asObj<any>(current.planReport);
  const currentTotals = asObj<any>(report.totals);

  // Fusionar solo lo que vino
  const nextTotals = {
    ...currentTotals,
    ...(gf !== undefined ? { gf } : {}),
    ...(ga !== undefined ? { ga } : {}),
    ...(possession !== undefined ? { possession } : {}),
    ...(xg !== undefined ? { xg } : {}),
    ...(shots !== undefined ? { shots } : {}),
    ...(shotsOnTarget !== undefined ? { shotsOnTarget } : {}),
  };

  const nextReport = {
    ...report,
    totals: nextTotals,
  };

  await prisma.rival.update({
    where: { id: rivalId },
    data: { planReport: nextReport },
  });

  // Revalidar la página de estadísticas
  revalidatePath(`/ct/rivales/${rivalId}/estadisticas`);

  return { ok: true, message: 'Estadísticas guardadas' };
}
