#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const USERS = [
  { email: 'ct@admin.com',         name: 'CT',         role: 'CT' },
  { email: 'jugador@admin.com',    name: 'Jugador',    role: 'JUGADOR' },
  { email: 'medico@admin.com',     name: 'Médico',     role: 'MEDICO' },
  { email: 'admin@admin.com',      name: 'Admin',      role: 'ADMIN' },
  { email: 'superadmin@admin.com', name: 'SuperAdmin', role: 'SUPERADMIN' },
];

async function main() {
  const plain = '123456';
  const hashed = await bcrypt.hash(plain, 10);

  // Detectar si existe la columna 'approved' en la tabla "User"
  let hasApproved = false;
  try {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'User'
        AND column_name = 'approved'
      LIMIT 1;
    `);
    hasApproved = Array.isArray(rows) && rows.length > 0;
  } catch (e) {
    console.warn('[seed-users] No pude inspeccionar information_schema, asumo sin approved');
  }

  for (const u of USERS) {
    const email = u.email.toLowerCase();
    const dataBase = {
      name: u.name,
      email,
      password: hashed,
      role: u.role,
    };
    const data = hasApproved ? { ...dataBase, approved: true } : dataBase;

    const res = await prisma.user.upsert({
      where: { email },
      update: data,
      create: data,
      select: { id: true, email: true, role: true, ...(hasApproved ? { approved: true } : {}) },
    });

    console.log('UPSERT', res);
  }
}

main()
  .catch((e) => {
    console.error('[seed-users] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
