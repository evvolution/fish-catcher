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

const requiredGapModelFields = {
  FishSpecies: ["chinaProtectionStatus", "citesAppendix", "toxicityStatus", "edibilityStatus", "legalReviewedAt"],
} as const;

type RuntimeModelClient = PrismaClient & {
  // ponytail: Prisma 7 exposes this private model map; re-check this guard when upgrading Prisma major versions.
  _runtimeDataModel?: {
    models?: Record<string, { fields?: Array<{ name?: string }> }>;
  };
};

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

function isCurrentPrismaClient(client: PrismaClient) {
  if (!requiredGapModelDelegates.every((delegate) => delegate in client)) return false;

  const models = (client as RuntimeModelClient)._runtimeDataModel?.models;
  return Object.entries(requiredGapModelFields).every(([modelName, requiredFields]) => {
    const fields = new Set(models?.[modelName]?.fields?.map((field) => field.name));
    return requiredFields.every((field) => fields.has(field));
  });
}

if (globalForPrisma.prisma && !isCurrentPrismaClient(globalForPrisma.prisma)) {
  // ponytail: HMR can keep an old generated client alive; scalar-field checks avoid one process-wide stale schema.
  void globalForPrisma.prisma.$disconnect();
  delete globalForPrisma.prisma;
}

const currentPrisma = globalForPrisma.prisma ?? createPrismaClient();

if (!isCurrentPrismaClient(currentPrisma)) {
  void currentPrisma.$disconnect();
  throw new Error('Prisma Client schema is stale. Run "npm run prisma:generate" and restart the Next.js process.');
}

export const prisma = currentPrisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
