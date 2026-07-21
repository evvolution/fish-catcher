import { slugify } from "~~/src/lib/moyu-engine";
import { prisma } from "~~/src/lib/prisma";
import { optionalNumber, optionalText, requireText, syncCopyDimensions } from "~~/server/utils/operator";

type CopyBody = {
  action?: "create" | "update" | "delete";
  id?: string;
  slug?: string;
  kind?: "RESULT" | "CARD" | "GREETING" | "GUIDE";
  activityId?: string;
  title?: string;
  content?: string;
  notes?: string;
  minDurationSec?: string;
  maxDurationSec?: string;
  weight?: string;
  dropRate?: string;
  isActive?: boolean;
  dimensionOptionIds?: string[];
};

export default defineEventHandler(async (event) => {
  const body = await readBody<CopyBody>(event) ?? {};
  if (body.action === "delete") {
    if (!body.id) throw createError({ statusCode: 400, statusMessage: "id is required" });
    await prisma.copywritingEntry.delete({ where: { id: body.id } });
    return { ok: true };
  }
  const title = requireText(body.title, "title");
  const content = requireText(body.content, "content");
  const kind = body.kind ?? "RESULT";
  const data = {
    slug: slugify(body.slug?.trim() || title),
    kind,
    activityId: optionalText(body.activityId),
    title,
    content,
    notes: optionalText(body.notes),
    minDurationSec: optionalNumber(body.minDurationSec),
    maxDurationSec: optionalNumber(body.maxDurationSec),
    weight: optionalNumber(body.weight) ?? 100,
    dropRate: kind === "CARD" ? optionalNumber(body.dropRate) ?? 20 : 0,
    isActive: body.isActive !== false,
  };
  const saved = body.action === "update"
    ? await prisma.copywritingEntry.update({ where: { id: requireText(body.id, "id") }, data })
    : await prisma.copywritingEntry.create({ data });
  await syncCopyDimensions(saved.id, body.dimensionOptionIds);
  return { ok: true, id: saved.id };
});
