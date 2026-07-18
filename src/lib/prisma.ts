import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  return new PrismaClient();
}

function getClient() {
  const existing = globalForPrisma.prisma;
  // Tras `prisma generate`, el singleton de HMR puede quedar sin modelos nuevos
  if (existing && "exclusion_fiscal" in existing) {
    return existing;
  }
  const client = createClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = getClient();
