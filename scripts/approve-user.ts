#!/usr/bin/env tsx
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.EMAIL || process.argv[2];
  if (!email) {
    console.error("Usage: EMAIL=usuario@dominio.com npx tsx scripts/approve-user.ts\nOr: npx tsx scripts/approve-user.ts usuario@dominio.com");
    process.exit(1);
  }

  const user = await prisma.user.updateMany({
    where: { email: email.toLowerCase() },
    data: { isApproved: true },
  });

  console.log(`Updated ${user.count} user(s) with email=${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
