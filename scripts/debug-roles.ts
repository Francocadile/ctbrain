import prisma from "@/lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, role: true, isApproved: true }
  });
  console.table(users);
}

main().finally(() => prisma.$disconnect());
