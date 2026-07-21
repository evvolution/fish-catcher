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
  "chinaProtectionStatus",
  "chinaProtectionNote",
  "chinaProtectionBasis",
  "chinaProtectionSourceUrl",
  "citesAppendix",
  "citesNote",
  "citesSourceUrl",
  "threeHaveStatus",
  "threeHaveNote",
  "toxicityStatus",
  "toxicityNote",
  "edibilityStatus",
  "edibilityNote",
  "legalReviewedAt",
  "sourceName",
  "sourcePageUrl",
  "imageSourceName",
  "imageSourcePageUrl",
  "licenseLabel",
];

const protectionStatuses = new Set([
  "NONE",
  "NATIONAL_II",
  "WILD_ONLY_NATIONAL_II",
  "CITES_APPROVED_I",
  "CITES_APPROVED_II",
  "WILD_ONLY_CITES_APPROVED_II",
]);
const toxicityStatuses = new Set([
  "NONE_KNOWN",
  "VENOMOUS",
  "TOXIC_TISSUE",
  "TOXIC_PART",
  "ELECTRIC",
  "CIGUATERA_RISK",
]);
const edibilityStatuses = new Set([
  "EDIBLE",
  "CONDITIONAL",
  "NOT_RECOMMENDED",
  "LEGAL_PROHIBITED",
  "WILD_ONLY_PROHIBITED",
]);
const fullyProtectedStatuses = new Set(["NATIONAL_II", "CITES_APPROVED_I", "CITES_APPROVED_II"]);
const wildOnlyProtectedStatuses = new Set(["WILD_ONLY_NATIONAL_II", "WILD_ONLY_CITES_APPROVED_II"]);

for (const entry of entries) {
  for (const field of requiredTextFields) assert(entry[field]?.trim(), `${entry.slug}: missing ${field}`);
  assert(new URL(entry.sourcePageUrl).hostname.endsWith("fishbase.se"), `${entry.slug}: unexpected data source`);
  assert(
    ["commons.wikimedia.org", "www.fishbase.se"].includes(new URL(entry.imageSourcePageUrl).hostname),
    `${entry.slug}: unexpected image source`,
  );
  assert(entry.imagePath === `/assets/fishes/${entry.slug}.webp`, `${entry.slug}: image path is not OSS-ready`);
  assert(protectionStatuses.has(entry.chinaProtectionStatus), `${entry.slug}: invalid protection status`);
  assert(["I", "II", "NONE"].includes(entry.citesAppendix), `${entry.slug}: invalid CITES appendix`);
  assert(entry.threeHaveStatus === "NOT_APPLICABLE", `${entry.slug}: fish cannot be tagged as a terrestrial 三有 animal`);
  assert(entry.threeHaveNote.includes("陆生野生动物"), `${entry.slug}: missing 三有 scope explanation`);
  assert(toxicityStatuses.has(entry.toxicityStatus), `${entry.slug}: invalid toxicity status`);
  assert(edibilityStatuses.has(entry.edibilityStatus), `${entry.slug}: invalid edibility status`);
  assert(entry.legalReviewedAt === "2026-07-21", `${entry.slug}: legal review is stale`);
  assert(new URL(entry.chinaProtectionSourceUrl).hostname.endsWith("gov.cn"), `${entry.slug}: non-government protection source`);
  assert(new URL(entry.citesSourceUrl).hostname.endsWith("gov.cn"), `${entry.slug}: non-government CITES source`);
  if (fullyProtectedStatuses.has(entry.chinaProtectionStatus)) {
    assert(entry.edibilityStatus === "LEGAL_PROHIBITED", `${entry.slug}: protected species must be marked prohibited`);
  }
  if (wildOnlyProtectedStatuses.has(entry.chinaProtectionStatus)) {
    assert(entry.edibilityStatus === "WILD_ONLY_PROHIBITED", `${entry.slug}: wild-only protection must affect edibility`);
  }

  const metadata = await sharp(path.join(projectRoot, "public", entry.imagePath)).metadata();
  assert(metadata.format === "webp", `${entry.slug}: image is not WebP`);
  assert(metadata.width === 960 && metadata.height === 640, `${entry.slug}: image is not 960x640`);
  assert(metadata.hasAlpha, `${entry.slug}: image has no alpha channel`);
  assert(!(await sharp(path.join(projectRoot, "public", entry.imagePath)).stats()).isOpaque, `${entry.slug}: image background is opaque`);
}

assert(entries.filter((entry) => entry.chinaProtectionStatus !== "NONE").length === 10, "unexpected national protection count");
assert(entries.filter((entry) => entry.citesAppendix !== "NONE").length === 21, "unexpected CITES count");

const publicEntries = (await fs.readdir(path.join(projectRoot, "public"))).filter((entry) => !entry.startsWith("."));
assert(publicEntries.length === 1 && publicEntries[0] === "assets", "public must contain only the assets root");

console.log("fish catalog: 200 sourced, legally tagged records and 200 transparent OSS-ready images are valid");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
