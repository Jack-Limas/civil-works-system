import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Admin123!", 10);

  await prisma.user.upsert({
    where: { email: "admin@civilworks.com" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@civilworks.com",
      passwordHash,
      role: Role.ADMIN,
    },
  });

  console.log("Seed completado: admin@civilworks.com / Admin123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });