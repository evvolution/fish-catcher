import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const assetRoot = path.join(projectRoot, "public/assets");
const manifestPath = path.join(assetRoot, "manifest.json");
const checkOnly = process.argv.includes("--check");
const contentTypes = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".svg", "image/svg+xml"],
  [".json", "application/json"],
  [".ttf", "font/ttf"],
  [".otf", "font/otf"],
]);

const files = (await walk(assetRoot))
  .filter((filePath) => filePath !== manifestPath)
  .sort((left, right) => left.localeCompare(right));
const entries = await Promise.all(
  files.map(async (filePath) => {
    const bytes = await fs.readFile(filePath);
    const relativePath = path.relative(assetRoot, filePath).split(path.sep).join("/");
    return {
      path: relativePath,
      bytes: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      contentType: contentTypes.get(path.extname(filePath).toLowerCase()) ?? "application/octet-stream",
    };
  }),
);
const manifest = `${JSON.stringify({ version: 1, basePath: "/assets", files: entries }, null, 2)}\n`;

if (checkOnly) {
  const current = await fs.readFile(manifestPath, "utf8").catch(() => "");
  if (current !== manifest) throw new Error("public/assets/manifest.json is stale; run npm run build:assets");
  console.log(`asset manifest: ${entries.length} files are current`);
} else {
  await fs.writeFile(manifestPath, manifest, "utf8");
  console.log(`asset manifest: ${entries.length} files written to ${manifestPath}`);
}

async function walk(directory) {
  const children = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    children.map((child) => {
      const childPath = path.join(directory, child.name);
      return child.isDirectory() ? walk(childPath) : [childPath];
    }),
  );
  return nested.flat();
}
