import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const rutina = await prisma.playerRoutine.findUnique({
      where: { id: params.id },
    });
    if (!rutina) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
    return NextResponse.json(rutina);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener rutina' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    const body = await req.json();
    const { day, ejercicios, feedback } = body;
    const rutina = await prisma.playerRoutine.update({
      where: { id: params.id },
      data: { day, ejercicios, feedback },
    });
    return NextResponse.json(rutina);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar rutina' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !['CT', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }
    await prisma.playerRoutine.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar rutina' }, { status: 500 });
  }
}
