#!/usr/bin/env tsx
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const res = await prisma.user.updateMany({ where: { isApproved: false }, data: { isApproved: true } });
  console.log(`Approved ${res.count} pending user(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
