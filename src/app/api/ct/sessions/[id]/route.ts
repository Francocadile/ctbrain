import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSessionWithRoles } from '@/lib/auth-helpers';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSessionWithRoles(['CT', 'ADMIN']);
    const { isVisibleToPlayers } = await req.json();
    if (typeof isVisibleToPlayers !== 'boolean') {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
    }
    const updated = await prisma.session.update({
      where: { id: params.id },
      data: { isVisibleToPlayers },
    });
    return NextResponse.json({ ok: true, isVisibleToPlayers: updated.isVisibleToPlayers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: err.status || 500 });
  }
}
