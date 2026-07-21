import { slugify } from "~~/src/lib/moyu-engine";
import { prisma } from "~~/src/lib/prisma";
import {
  optionalNumber,
  optionalText,
  requireText,
  syncBackgroundDimensions,
} from "~~/server/utils/operator";

type BackgroundBody = {
  action?: "create" | "update" | "delete";
  id?: string;
  slug?: string;
  title?: string;
  imagePath?: string;
  sourceName?: string;
  sourcePageUrl?: string;
  photographerName?: string;
  licenseLabel?: string;
  blurColor?: string;
  description?: string;
  activityId?: string;
  sortOrder?: string;
  isActive?: boolean;
  dimensionOptionIds?: string[];
};

export default defineEventHandler(async (event) => {
  const body = await readBody<BackgroundBody>(event) ?? {};
  if (body.action === "delete") {
    if (!body.id) throw createError({ statusCode: 400, statusMessage: "id is required" });
    await prisma.backgroundAsset.delete({ where: { id: body.id } });
    return { ok: true };
  }
  const title = requireText(body.title, "title");
  const data = {
    slug: slugify(body.slug?.trim() || title),
    title,
    imagePath: requireText(body.imagePath, "imagePath"),
    sourceName: requireText(body.sourceName, "sourceName"),
    sourcePageUrl: requireText(body.sourcePageUrl, "sourcePageUrl"),
    photographerName: optionalText(body.photographerName),
    licenseLabel: optionalText(body.licenseLabel),
    blurColor: optionalText(body.blurColor),
    description: optionalText(body.description),
    activityId: optionalText(body.activityId),
    sortOrder: optionalNumber(body.sortOrder) ?? 0,
    isActive: body.isActive !== false,
  };
  const saved = body.action === "update"
    ? await prisma.backgroundAsset.update({ where: { id: requireText(body.id, "id") }, data })
    : await prisma.backgroundAsset.create({ data });
  await syncBackgroundDimensions(saved.id, body.dimensionOptionIds);
  return { ok: true, id: saved.id };
});
