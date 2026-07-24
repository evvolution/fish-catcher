import type { Prisma } from "~~/src/generated/prisma/client";
import { prisma } from "~~/src/lib/prisma";

export async function buildActivityIdMap(tx: Prisma.TransactionClient) {
  const items = await tx.momentActivity.findMany();
  return new Map(items.map((item) => [item.slug, item.id]));
}

export async function buildDimensionOptionIdMap(tx: Prisma.TransactionClient) {
  const items = await tx.dimensionOption.findMany({ include: { group: true } });
  return new Map(items.map((item) => [`${item.group.key}:${item.slug}`, item.id]));
}

export function assertMoyuModelDelegates() {
  const prismaRecord = prisma as unknown as Record<string, unknown>;
  const requiredDelegates = [
    "momentActivity",
    "copywritingEntry",
    "backgroundAsset",
    "cityGuide",
    "dimensionGroup",
    "dimensionOption",
    "citySnack",
    "fishSpecies",
  ] as const;
  const missing = requiredDelegates.filter((key) => !prismaRecord[key]);
  if (!missing.length) return;
  throw new Error(
    `Prisma Client is out of date for 摸鱼 models (${missing.join(", ")}). Run "npm run prisma:generate" and restart the Nuxt dev server.`,
  );
}
