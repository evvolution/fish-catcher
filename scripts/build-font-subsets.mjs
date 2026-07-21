import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const projectRoot = process.cwd();
const checkOnly = process.argv.includes("--check");
const sourceRoot = path.join(projectRoot, "assets/font-sources");
const outputRoot = path.join(projectRoot, "oss-upload/fish/assets/fonts");
const corpusRoots = [
  path.join(projectRoot, "app"),
  path.join(projectRoot, "src"),
  path.join(projectRoot, "oss-upload/fish/assets/data"),
];
const textExtensions = new Set([".json", ".ts", ".vue"]);
const fonts = [
  ["Alibaba-PuHuiTi-Medium.ttf", "Alibaba-PuHuiTi-Medium.subset.woff2"],
  ["SourceHanSerifSC-Medium.otf", "SourceHanSerifSC-Medium.subset.woff2"],
];
const alwaysIncluded =
  Array.from({ length: 95 }, (_, index) => String.fromCodePoint(0x20 + index)).join("") +
  "　，。！？；：、“”‘’（）【】《》〈〉…—·￥℃°％‰№™©®＋－×÷＝≈≠≤≥→←↑↓•✓";

const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "moyu-fonts-"));

try {
  const corpusFiles = (await Promise.all(corpusRoots.map(walkTextFiles))).flat().sort();
  const corpus = `${(await Promise.all(corpusFiles.map((file) => fs.readFile(file, "utf8")))).join("")}\n${alwaysIncluded}`;
  const characters = [...new Set(corpus.normalize("NFC"))]
    .sort((left, right) => left.codePointAt(0) - right.codePointAt(0))
    .join("");
  const textPath = path.join(temporaryRoot, "characters.txt");
  await fs.writeFile(textPath, characters, "utf8");
  await fs.mkdir(outputRoot, { recursive: true });

  for (const [sourceName, outputName] of fonts) {
    const sourcePath = path.join(sourceRoot, sourceName);
    const generatedPath = path.join(temporaryRoot, outputName);
    const outputPath = path.join(outputRoot, outputName);

    try {
      await execFileAsync(
        "python3",
        [
          "-m",
          "fontTools.subset",
          sourcePath,
          `--text-file=${textPath}`,
          `--output-file=${generatedPath}`,
          "--flavor=woff2",
          "--layout-features=*",
          "--glyph-names",
          "--symbol-cmap",
          "--legacy-cmap",
          "--notdef-glyph",
          "--notdef-outline",
          "--recommended-glyphs",
          "--name-IDs=*",
          "--name-legacy",
          "--name-languages=*",
          "--canonical-order",
          "--no-recalc-timestamp",
        ],
        { maxBuffer: 10 * 1024 * 1024 },
      );
    } catch (error) {
      throw new Error("fontTools with Brotli support is required: python3 -m pip install fonttools brotli", {
        cause: error,
      });
    }

    const sourceBytes = await fs.readFile(sourcePath);
    const generatedBytes = await fs.readFile(generatedPath);
    if (generatedBytes.subarray(0, 4).toString("ascii") !== "wOF2" || generatedBytes.length >= sourceBytes.length) {
      throw new Error(`invalid font subset: ${outputName}`);
    }

    if (checkOnly) {
      const currentBytes = await fs.readFile(outputPath).catch(() => Buffer.alloc(0));
      if (!currentBytes.equals(generatedBytes)) {
        throw new Error(`${outputName} is stale; run npm run build:fonts`);
      }
    } else {
      await fs.copyFile(generatedPath, outputPath);
    }

    console.log(`${outputName}: ${sourceBytes.length} -> ${generatedBytes.length} bytes`);
  }

  console.log(`font subsets: ${[...characters].length} characters ${checkOnly ? "are current" : "written"}`);
} finally {
  await fs.rm(temporaryRoot, { recursive: true, force: true });
}

async function walkTextFiles(target) {
  const metadata = await fs.stat(target);
  if (metadata.isFile()) return textExtensions.has(path.extname(target)) ? [target] : [];

  const children = await fs.readdir(target, { withFileTypes: true });
  return (
    await Promise.all(
      children.map((child) => walkTextFiles(path.join(target, child.name))),
    )
  ).flat();
}
