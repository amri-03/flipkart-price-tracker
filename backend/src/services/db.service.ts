import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

// Graceful teardown hooks to release database locks on exit
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
