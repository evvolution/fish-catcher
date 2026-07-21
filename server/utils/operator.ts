import { prisma } from "~~/src/lib/prisma";

export function requireText(value: string | undefined, key: string) {
  if (!value?.trim()) throw createError({ statusCode: 400, statusMessage: `${key} is required` });
  return value.trim();
}

export function optionalText(value: string | undefined) {
  return value?.trim() || null;
}

export function optionalNumber(value: string | undefined) {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw createError({ statusCode: 400, statusMessage: "invalid number" });
  return parsed;
}

export async function syncCopyDimensions(copywritingEntryId: string, selections?: string[]) {
  await prisma.copywritingEntryDimension.deleteMany({ where: { copywritingEntryId } });
  const optionIds = [...new Set(selections?.filter(Boolean) ?? [])];
  if (!optionIds.length) return;
  await prisma.copywritingEntryDimension.createMany({
    data: optionIds.map((optionId) => ({ copywritingEntryId, optionId })),
  });
}

export async function syncBackgroundDimensions(backgroundAssetId: string, selections?: string[]) {
  await prisma.backgroundAssetDimension.deleteMany({ where: { backgroundAssetId } });
  const optionIds = [...new Set(selections?.filter(Boolean) ?? [])];
  if (!optionIds.length) return;
  await prisma.backgroundAssetDimension.createMany({
    data: optionIds.map((optionId) => ({ backgroundAssetId, optionId })),
  });
}
