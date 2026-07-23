import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const projectRoot = process.cwd();
const catalogPath = path.join(projectRoot, "src/lib/moyu-backgrounds.json");
const outputDirectory = path.join(projectRoot, "oss-upload/fish/assets/backgrounds");
const sourceDirectory = process.argv
  .find((argument) => argument.startsWith("--source-dir="))
  ?.slice("--source-dir=".length);
const selectedIds = new Set(
  process.argv
    .find((argument) => argument.startsWith("--ids="))
    ?.slice("--ids=".length)
    .split(",")
    .filter(Boolean) ?? [],
);

if (process.argv.includes("--check")) {
  await checkCatalog();
} else {
  await buildCatalog();
}

async function buildCatalog() {
  const fullCatalog = await readCatalog();
  const catalog = selectedIds.size
    ? fullCatalog.filter((entry) => selectedIds.has(entry.id))
    : fullCatalog;
  if (selectedIds.size && catalog.length !== selectedIds.size) {
    throw new Error("One or more requested background ids are missing from the catalog");
  }
  await fs.mkdir(outputDirectory, { recursive: true });
  for (const entry of catalog) {
    const input = sourceDirectory
      ? await fs.readFile(path.join(sourceDirectory, `pexels-photo-${entry.id}.jpg`))
      : await download(entry.sourceImageUrl);
    const metadata = await sharp(input).metadata();
    if ((metadata.width ?? 0) < 800 || (metadata.height ?? 0) < 750) {
      throw new Error(`Background source is too small: ${entry.slug}`);
    }
    await sharp(input)
      .rotate()
      .resize(1280, 853, { fit: "cover", position: "attention" })
      .modulate({ brightness: 0.94, saturation: 0.84 })
      .webp({ quality: 80, effort: 6 })
      .toFile(path.join(outputDirectory, `${entry.slug}.webp`));
  }
  console.log(`background catalog: ${catalog.length} Pexels images generated`);
}

async function checkCatalog() {
  const catalog = await readCatalog();
  const ids = new Set();
  const slugs = new Set();
  const sourcePages = new Set();
  const activityCounts = new Map();
  for (const entry of catalog) {
    if (!entry.id || ids.has(entry.id)) throw new Error(`Duplicate background id: ${entry.id}`);
    if (!entry.slug || slugs.has(entry.slug)) throw new Error(`Duplicate background slug: ${entry.slug}`);
    if (!entry.sourcePageUrl.startsWith("https://www.pexels.com/photo/") || sourcePages.has(entry.sourcePageUrl)) {
      throw new Error(`Invalid background source page: ${entry.slug}`);
    }
    if (!entry.sourceImageUrl.startsWith("https://images.pexels.com/photos/")) {
      throw new Error(`Invalid background image source: ${entry.slug}`);
    }
    if (!entry.photographerName || !entry.description || !entry.dimensions?.length) {
      throw new Error(`Incomplete background metadata: ${entry.slug}`);
    }
    ids.add(entry.id);
    slugs.add(entry.slug);
    sourcePages.add(entry.sourcePageUrl);
    activityCounts.set(entry.activitySlug, (activityCounts.get(entry.activitySlug) ?? 0) + 1);
    const metadata = await sharp(path.join(outputDirectory, `${entry.slug}.webp`)).metadata();
    if (metadata.format !== "webp" || metadata.width !== 1280 || metadata.height !== 853) {
      throw new Error(`Invalid background output: ${entry.slug}.webp`);
    }
  }
  for (const activity of ["drift", "breathe", "stroll", "tea"]) {
    if (activityCounts.get(activity) !== 10) {
      throw new Error(`Expected 10 ${activity} backgrounds, found ${activityCounts.get(activity) ?? 0}`);
    }
  }
  console.log(`background catalog: ${catalog.length} unique Pexels WebP files verified`);
}

async function readCatalog() {
  return JSON.parse(await fs.readFile(catalogPath, "utf8"));
}

async function download(url) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Image download failed: ${response.status} ${url}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 600));
    }
  }
  throw new Error(`Image download failed: ${url}`);
}
