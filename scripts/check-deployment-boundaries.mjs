import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

import { DEFAULT_ASSET_BASE_URL, resolveAssetUrl } from "../src/lib/asset-url.ts";

const projectRoot = process.cwd();
const uploadRoot = path.join(projectRoot, "oss-upload/fish/assets");
const manifestPath = path.join(uploadRoot, "manifest.json");
const backgroundMigrationPath = path.join(
  projectRoot,
  "prisma/migrations/20260721180000_update_background_paths_to_webp/migration.sql",
);

assert.equal(
  resolveAssetUrl(DEFAULT_ASSET_BASE_URL, "/assets/icons/fish.svg"),
  "https://apex-res.nefelibata.ink/fish/assets/icons/fish.svg",
);
assert.throws(() => resolveAssetUrl(DEFAULT_ASSET_BASE_URL, "/assets/../secret"));
assert.throws(() => resolveAssetUrl(DEFAULT_ASSET_BASE_URL, "https://example.com/fish.webp"));

const packageJson = JSON.parse(await fs.readFile(path.join(projectRoot, "package.json"), "utf8"));
assert.equal(packageJson.dependencies?.next, undefined, "Next must not be an application dependency");
assert.equal(packageJson.devDependencies?.next, undefined, "Next must not be a development dependency");
await assertMissing(path.join(projectRoot, ".next"), "The .next directory must not exist");
await assertMissing(path.join(projectRoot, "public/assets"), "OSS assets must not be copied into Nuxt public output");

const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
const uploadFiles = (await walk(uploadRoot)).map((filePath) => path.relative(uploadRoot, filePath).split(path.sep).join("/"));
assert.equal(manifest.bucket, "apexres");
assert.equal(manifest.ossPrefix, "fish/assets/");
assert.equal(manifest.assetBaseUrl, `${DEFAULT_ASSET_BASE_URL}/assets`);
assert.equal(manifest.objectCount, uploadFiles.length, "Manifest must count every uploaded object, including itself");
assert.deepEqual(
  uploadFiles.sort(),
  [...manifest.files.map((entry) => entry.path), manifest.manifestObject.path].sort(),
  "Manifest must list the complete upload directory",
);
for (const entry of manifest.files) {
  assert.equal(entry.ossKey, `fish/assets/${entry.path}`);
  assert.equal(entry.url, `${DEFAULT_ASSET_BASE_URL}/assets/${entry.path}`);
}
assert.equal(
  uploadFiles.filter((filePath) => /\.(?:jpe?g|png|gif|bmp|tiff?)$/i.test(filePath)).length,
  0,
  "Raster images in the OSS upload directory must be WebP",
);

const backgroundMigration = await fs.readFile(backgroundMigrationPath, "utf8");
for (const backgroundName of ["mist-lake-dawn", "forest-light-path", "mountain-dusk", "tea-window-night"]) {
  assert(backgroundMigration.includes(`/assets/backgrounds/${backgroundName}.jpg`));
  assert(backgroundMigration.includes(`/assets/backgrounds/${backgroundName}.webp`));
}

const vueFiles = (await walk(path.join(projectRoot, "app"))).filter((filePath) => filePath.endsWith(".vue"));
for (const filePath of vueFiles) {
  if (filePath.endsWith("MoyuAssetImage.vue")) continue;
  const source = await fs.readFile(filePath, "utf8");
  assert(!source.includes("<img"), `${path.relative(projectRoot, filePath)} bypasses the OSS image component`);
}

console.log(`deployment boundaries: ${uploadFiles.length} OSS objects, final domains and Nuxt-only runtime are valid`);

async function assertMissing(filePath, message) {
  try {
    await fs.access(filePath);
  } catch {
    return;
  }
  throw new Error(message);
}

async function walk(directory) {
  const children = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(children.map((child) => {
    const childPath = path.join(directory, child.name);
    return child.isDirectory() ? walk(childPath) : [childPath];
  }));
  return nested.flat();
}
