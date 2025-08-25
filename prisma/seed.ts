import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const name = process.env.SEED_ADMIN_NAME || "Super Admin";
  const email = process.env.SEED_ADMIN_EMAIL || "admin@ctbrain.local";
  const passwordPlain = process.env.SEED_ADMIN_PASSWORD || "admin123";

  const passwordHashed = await hash(passwordPlain, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name,
      email,
      password: passwordHashed, // campo correcto según el schema
      role: Role.ADMIN,
    },
  });

  console.log("✅ Usuario admin creado/actualizado:", {
    id: admin.id,
    email: admin.email,
    role: admin.role,
  });
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

