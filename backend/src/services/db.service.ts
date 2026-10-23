import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  transactionOptions: {
    maxWait: 10_000,   // up to 10s to acquire a connection from the pool
    timeout: 15_000,   // up to 15s for the transaction to complete
  },
});

// Graceful teardown hooks to release database locks on exit
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});