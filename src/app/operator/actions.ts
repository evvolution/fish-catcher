"use server";

import { revalidatePath } from "next/cache";

import { slugify } from "@/lib/gap-engine";
import { prisma } from "@/lib/prisma";

export async function createCopyEntryAction(formData: FormData) {
  const payload = parseCopyForm(formData);

  const created = await prisma.copywritingEntry.create({
    data: {
      slug: payload.slug,
      kind: payload.kind,
      activityId: payload.activityId,
      title: payload.title,
      content: payload.content,
      notes: payload.notes,
      minDurationSec: payload.minDurationSec,
      maxDurationSec: payload.maxDurationSec,
      weight: payload.weight,
      dropRate: payload.kind === "CARD" ? payload.dropRate : 0,
      isActive: payload.isActive,
    },
  });

  await syncCopyDimensions(created.id, payload.dimensionOptionIds);
  revalidateOperatorViews();
}

export async function updateCopyEntryAction(formData: FormData) {
  const id = readRequiredString(formData, "id");
  const payload = parseCopyForm(formData);

  await prisma.copywritingEntry.update({
    where: {
      id,
    },
    data: {
      slug: payload.slug,
      kind: payload.kind,
      activityId: payload.activityId,
      title: payload.title,
      content: payload.content,
      notes: payload.notes,
      minDurationSec: payload.minDurationSec,
      maxDurationSec: payload.maxDurationSec,
      weight: payload.weight,
      dropRate: payload.kind === "CARD" ? payload.dropRate : 0,
      isActive: payload.isActive,
    },
  });

  await syncCopyDimensions(id, payload.dimensionOptionIds);
  revalidateOperatorViews();
}

export async function deleteCopyEntryAction(formData: FormData) {
  const id = readRequiredString(formData, "id");

  await prisma.copywritingEntry.delete({
    where: {
      id,
    },
  });

  revalidateOperatorViews();
}

export async function createBackgroundAction(formData: FormData) {
  const payload = parseBackgroundForm(formData);

  const created = await prisma.backgroundAsset.create({
    data: {
      slug: payload.slug,
      title: payload.title,
      imagePath: payload.imagePath,
      sourceName: payload.sourceName,
      sourcePageUrl: payload.sourcePageUrl,
      photographerName: payload.photographerName,
      licenseLabel: payload.licenseLabel,
      blurColor: payload.blurColor,
      description: payload.description,
      activityId: payload.activityId,
      sortOrder: payload.sortOrder,
      isActive: payload.isActive,
    },
  });

  await syncBackgroundDimensions(created.id, payload.dimensionOptionIds);
  revalidateOperatorViews();
}

export async function updateBackgroundAction(formData: FormData) {
  const id = readRequiredString(formData, "id");
  const payload = parseBackgroundForm(formData);

  await prisma.backgroundAsset.update({
    where: {
      id,
    },
    data: {
      slug: payload.slug,
      title: payload.title,
      imagePath: payload.imagePath,
      sourceName: payload.sourceName,
      sourcePageUrl: payload.sourcePageUrl,
      photographerName: payload.photographerName,
      licenseLabel: payload.licenseLabel,
      blurColor: payload.blurColor,
      description: payload.description,
      activityId: payload.activityId,
      sortOrder: payload.sortOrder,
      isActive: payload.isActive,
    },
  });

  await syncBackgroundDimensions(id, payload.dimensionOptionIds);
  revalidateOperatorViews();
}

export async function deleteBackgroundAction(formData: FormData) {
  const id = readRequiredString(formData, "id");

  await prisma.backgroundAsset.delete({
    where: {
      id,
    },
  });

  revalidateOperatorViews();
}

async function syncCopyDimensions(copyEntryId: string, optionIds: string[]) {
  await prisma.copywritingEntryDimension.deleteMany({
    where: {
      copywritingEntryId: copyEntryId,
    },
  });

  if (!optionIds.length) {
    return;
  }

  await prisma.copywritingEntryDimension.createMany({
    data: optionIds.map((optionId) => ({
      copywritingEntryId: copyEntryId,
      optionId,
    })),
  });
}

async function syncBackgroundDimensions(backgroundAssetId: string, optionIds: string[]) {
  await prisma.backgroundAssetDimension.deleteMany({
    where: {
      backgroundAssetId,
    },
  });

  if (!optionIds.length) {
    return;
  }

  await prisma.backgroundAssetDimension.createMany({
    data: optionIds.map((optionId) => ({
      backgroundAssetId,
      optionId,
    })),
  });
}

function parseCopyForm(formData: FormData) {
  const title = readRequiredString(formData, "title");
  const content = readRequiredString(formData, "content");
  const slugInput = readOptionalString(formData, "slug");
  const kind = readRequiredString(formData, "kind") as "RESULT" | "CARD" | "GREETING" | "GUIDE";

  return {
    slug: slugify(slugInput || title),
    kind,
    activityId: readOptionalString(formData, "activityId"),
    title,
    content,
    notes: readOptionalString(formData, "notes"),
    minDurationSec: readOptionalNumber(formData, "minDurationSec"),
    maxDurationSec: readOptionalNumber(formData, "maxDurationSec"),
    weight: readOptionalNumber(formData, "weight") ?? 100,
    dropRate: readOptionalNumber(formData, "dropRate") ?? 20,
    isActive: formData.get("isActive") === "on",
    dimensionOptionIds: readUniqueSelections(formData, "dimensionOptionIds"),
  };
}

function parseBackgroundForm(formData: FormData) {
  const title = readRequiredString(formData, "title");
  const imagePath = readRequiredString(formData, "imagePath");
  const sourcePageUrl = readRequiredString(formData, "sourcePageUrl");
  const sourceName = readRequiredString(formData, "sourceName");
  const slugInput = readOptionalString(formData, "slug");

  return {
    slug: slugify(slugInput || title),
    title,
    imagePath,
    sourceName,
    sourcePageUrl,
    photographerName: readOptionalString(formData, "photographerName"),
    licenseLabel: readOptionalString(formData, "licenseLabel"),
    blurColor: readOptionalString(formData, "blurColor"),
    description: readOptionalString(formData, "description"),
    activityId: readOptionalString(formData, "activityId"),
    sortOrder: readOptionalNumber(formData, "sortOrder") ?? 0,
    isActive: formData.get("isActive") === "on",
    dimensionOptionIds: readUniqueSelections(formData, "dimensionOptionIds"),
  };
}

function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} is required`);
  }

  return value.trim();
}

function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function readOptionalNumber(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readUniqueSelections(formData: FormData, key: string) {
  return [
    ...new Set(
      formData.getAll(key).filter((value): value is string => typeof value === "string" && Boolean(value.trim())),
    ),
  ];
}

function revalidateOperatorViews() {
  revalidatePath("/operator");
  revalidatePath("/forest");
  revalidatePath("/");
}
