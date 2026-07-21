import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import sharp from "sharp";

const projectRoot = process.cwd();
const entries = JSON.parse(await fs.readFile(path.join(projectRoot, "src/lib/fish-species.json"), "utf8"));

assert(entries.length === 200, `expected 200 records, received ${entries.length}`);
assert(new Set(entries.map((entry) => entry.slug)).size === 200, "fish slugs must be unique");
assert(new Set(entries.map((entry) => entry.scientificName)).size === 200, "scientific names must be unique");
assert(new Set(entries.map((entry) => entry.imagePath)).size === 200, "image paths must be unique");

const requiredTextFields = [
  "commonNameZh",
  "commonNameEn",
  "scientificName",
  "habitatLabel",
  "summary",
  "habits",
  "distribution",
  "sourceName",
  "sourcePageUrl",
  "imageSourceName",
  "imageSourcePageUrl",
  "licenseLabel",
];

for (const entry of entries) {
  for (const field of requiredTextFields) assert(entry[field]?.trim(), `${entry.slug}: missing ${field}`);
  assert(new URL(entry.sourcePageUrl).hostname.endsWith("fishbase.se"), `${entry.slug}: unexpected data source`);
  assert(
    ["commons.wikimedia.org", "www.fishbase.se"].includes(new URL(entry.imageSourcePageUrl).hostname),
    `${entry.slug}: unexpected image source`,
  );
  assert(entry.imagePath === `/assets/fishes/${entry.slug}.webp`, `${entry.slug}: image path is not OSS-ready`);

  const metadata = await sharp(path.join(projectRoot, "public", entry.imagePath)).metadata();
  assert(metadata.format === "webp", `${entry.slug}: image is not WebP`);
  assert(metadata.width === 960 && metadata.height === 640, `${entry.slug}: image is not 960x640`);
  assert(metadata.hasAlpha, `${entry.slug}: image has no alpha channel`);
  assert(!(await sharp(path.join(projectRoot, "public", entry.imagePath)).stats()).isOpaque, `${entry.slug}: image background is opaque`);
}

const publicEntries = (await fs.readdir(path.join(projectRoot, "public"))).filter((entry) => !entry.startsWith("."));
assert(publicEntries.length === 1 && publicEntries[0] === "assets", "public must contain only the assets root");

console.log("fish catalog: 200 sourced records and 200 transparent OSS-ready images are valid");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
