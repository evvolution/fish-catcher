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

export async function syncCopyDimensions(
  tx: Prisma.TransactionClient,
  copyId: string,
  dimensionRefs: string[],
  optionMap: Map<string, string>,
) {
  const optionIds = dimensionRefs.map((item) => optionMap.get(item)).filter((item): item is string => Boolean(item));
  await tx.copywritingEntryDimension.deleteMany({ where: { copywritingEntryId: copyId } });
  if (!optionIds.length) return;
  await tx.copywritingEntryDimension.createMany({
    data: optionIds.map((optionId) => ({ copywritingEntryId: copyId, optionId })),
  });
}

export async function syncBackgroundDimensions(
  tx: Prisma.TransactionClient,
  backgroundId: string,
  dimensionRefs: string[],
  optionMap: Map<string, string>,
) {
  const optionIds = dimensionRefs.map((item) => optionMap.get(item)).filter((item): item is string => Boolean(item));
  await tx.backgroundAssetDimension.deleteMany({ where: { backgroundAssetId: backgroundId } });
  if (!optionIds.length) return;
  await tx.backgroundAssetDimension.createMany({
    data: optionIds.map((optionId) => ({ backgroundAssetId: backgroundId, optionId })),
  });
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
