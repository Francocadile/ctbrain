// prisma/seed.ts
import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function seedSuperAdmin() {
  const name = process.env.SEED_SUPERADMIN_NAME || "Super Admin";
  const email = process.env.SEED_SUPERADMIN_EMAIL || "superadmin@ctbrain.app";
  const password = process.env.SEED_SUPERADMIN_PASSWORD || "ChangeMeNow!2025";

  const passwordHash = await hash(password, 10);

  const superadmin = await prisma.user.upsert({
    where: { email },
    update: {
      role: Role.SUPERADMIN,
      isApproved: true,
      password: passwordHash,
      name,
    },
    create: {
      name,
      email,
      password: passwordHash,
      role: Role.SUPERADMIN,
      isApproved: true,
    },
  });

  console.log("✅ SUPERADMIN listo:", {
    email: superadmin.email,
    role: superadmin.role,
  });
}

async function main() {
  await seedSuperAdmin();
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
