import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const name = process.env.SEED_ADMIN_NAME || "Super Admin";
  const email = process.env.SEED_ADMIN_EMAIL || "admin@ctbrain.local";
  const password = process.env.SEED_ADMIN_PASSWORD || "admin123";

  const passwordHash = await hash(password, 10);

  // guardamos en el campo "password"
  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name,
      email,
      password: passwordHash,
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
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
