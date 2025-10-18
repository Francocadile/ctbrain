// prisma/seed.ts
import { prisma } from "@/lib/prisma"; // si preferís, reemplazá por new PrismaClient() sólo en el seed
import { Role } from "@prisma/client";
import { hash } from "bcryptjs";

// Si preferís evitar path alias en el seed, usá:
// import { PrismaClient, Role } from "@prisma/client";
// const prisma = new PrismaClient();

async function seedSuperAdmin() {
  const name = process.env.SEED_SUPERADMIN_NAME || "Super Admin";
  const email = process.env.SEED_SUPERADMIN_EMAIL || "superadmin@ctbrain.local";
  const password = process.env.SEED_SUPERADMIN_PASSWORD || "superadmin123";

  const passwordHash = await hash(password, 10);

  const superadmin = await prisma.user.upsert({
    where: { email },
    update: { role: Role.SUPERADMIN, isApproved: true },
    create: {
      name,
      email,
      password: passwordHash,
      role: Role.SUPERADMIN,
      isApproved: true,
    },
  });

  console.log("✅ SUPERADMIN listo:", { email: superadmin.email, role: superadmin.role });
}

async function main() {
  await seedSuperAdmin();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
