import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

const requiredGapModelDelegates = [
  "momentActivity",
  "dimensionGroup",
  "copywritingEntry",
  "backgroundAsset",
  "cityGuide",
  "fishSpecies",
] as const;

function createPrismaClient() {
  const host = process.env.DATABASE_HOST;
  const user = process.env.DATABASE_USER;
  const password = process.env.DATABASE_PASSWORD;
  const database = process.env.DATABASE_NAME;

  if (!host || !user || !password || !database) {
    throw new Error("Database environment variables are not fully configured.");
  }

  const adapter = new PrismaMariaDb({
    host,
    port: Number(process.env.DATABASE_PORT ?? 3306),
    user,
    password,
    database,
    connectionLimit: 5,
    connectTimeout: 5_000,
    idleTimeout: 300,
  });

  return new PrismaClient({ adapter });
}

if (
  globalForPrisma.prisma &&
  !requiredGapModelDelegates.every((delegate) => delegate in globalForPrisma.prisma!)
) {
  // ponytail: delegate presence is the cheapest dev-time schema version check; predev still regenerates the client.
  void globalForPrisma.prisma.$disconnect();
  delete globalForPrisma.prisma;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
