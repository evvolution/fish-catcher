import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const projectRoot = process.cwd();
const catalogPath = path.join(projectRoot, "src/lib/moyu-masters-evaluation.json");
const outputDirectory = path.join(projectRoot, "oss-upload/fish/assets/backgrounds");
const activities = ["drift", "breathe", "stroll", "tea"];
const finalistsPage =
  "https://petapixel.com/2026/04/28/hasselblad-unveils-the-70-exceptional-hasselblad-masters-2026-finalists/";
const winners2026Page =
  "https://petapixel.com/2026/06/30/the-7-spectacular-winners-of-the-hasselblad-masters-2026-photo-contest/";
const winners2023Page =
  "https://petapixel.com/2024/06/26/2023-hasselblad-masters-winners-show-the-best-in-fine-art-photography/";
const gridCells = [
  [0, 0],
  [1, 0],
  [2, 0],
  [0, 1],
  [2, 1],
  [0, 2],
  [2, 2],
  [0, 3],
  [1, 3],
  [2, 3],
];
const columns = [
  { left: 0, width: 2667 },
  { left: 2667, width: 2666 },
  { left: 5333, width: 2667 },
];
const categorySpecs = [
  ["architecture", "建筑", "Architecture", "#70777e"],
  ["art", "艺术", "Art", "#747478"],
  ["landscape", "风景", "Landscape", "#6d7477"],
  ["portrait", "肖像", "Portrait", "#7d746d"],
  ["project-21", "青年项目", "Project_21", "#6c7b80"],
  ["street", "街头", "Street", "#555d64"],
  ["wildlife", "野生动物", "Wildlife", "#5e685f"],
].map(([slug, label, fileKey, blurColor]) => ({
  slug,
  label,
  blurColor,
  sourceImageUrl: `https://petapixel.com/assets/uploads/2026/04/${fileKey}_1.jpg`,
}));

const seriesSpecs = [
  series(
    2026,
    "art",
    "艺术",
    "Waste Colonialism",
    "Yudha Kusuma Putera",
    winners2026Page,
    "#766d64",
    [
      "https://petapixel.com/assets/uploads/2026/06/ART-_Yudha-Kusuma-Putera.jpg",
      "https://petapixel.com/assets/uploads/2026/06/ART-_Yudha-Kusuma-Putera-II.jpg",
      "https://petapixel.com/assets/uploads/2026/06/ART-_Yudha-Kusuma-Putera-III.jpg",
    ],
  ),
  series(
    2026,
    "architecture",
    "建筑",
    "DaySleeper | Movieland",
    "Kevin Boyle",
    winners2026Page,
    "#4e5155",
    [
      "https://petapixel.com/assets/uploads/2026/06/ARCHITECTURE-Kevin-Boyle.jpg",
      "https://petapixel.com/assets/uploads/2026/06/ARCHITECTURE-Kevin-Boyle-II.jpg",
      "https://petapixel.com/assets/uploads/2026/06/ARCHITECTURE-Kevin-Boyle.jpg-III.jpg",
    ],
  ),
  series(
    2026,
    "portrait",
    "肖像",
    "Otherness",
    "Svetlana Jovanovic",
    winners2026Page,
    "#7d746e",
    [
      "https://petapixel.com/assets/uploads/2026/06/PORTRAIT-Svetlana-Jovanovic.jpg",
      "https://petapixel.com/assets/uploads/2026/06/PORTRAIT-Svetlana-Jovanovic-II.jpg",
      "https://petapixel.com/assets/uploads/2026/06/PORTRAIT-Svetlana-Jovanovic-III.jpg",
    ],
  ),
  series(
    2026,
    "landscape",
    "风景",
    "Ephemeral Visions",
    "Rohan Reilly",
    winners2026Page,
    "#8a8b85",
    [
      "https://petapixel.com/assets/uploads/2026/06/LANDSCAPE_Rohan-Reilly.jpg",
      "https://petapixel.com/assets/uploads/2026/06/LANDSCAPE_Rohan-Reilly-II.jpg",
      "https://petapixel.com/assets/uploads/2026/06/LANDSCAPE_Rohan-Reilly-III.jpg",
    ],
  ),
  series(
    2026,
    "project-21",
    "青年项目",
    "Dwellers of the Night",
    "Panitbhand Paribatra Na Ayudhya",
    winners2026Page,
    "#312c3d",
    [
      "https://petapixel.com/assets/uploads/2026/06/PROJECT-21-Panitbhand-Paribatra-Na-Ayudhya.jpg",
      "https://petapixel.com/assets/uploads/2026/06/PROJECT-21-Panitbhand-Paribatra-Na-Ayudhya-II.jpg.jpg",
      "https://petapixel.com/assets/uploads/2026/06/PROJECT-21-Panitbhand-Paribatra-Na-Ayudhya-III.jpg.jpg",
    ],
  ),
  series(
    2026,
    "street",
    "街头",
    "Morning Ritual",
    "Gosse Bouma",
    winners2026Page,
    "#455662",
    [
      "https://petapixel.com/assets/uploads/2026/06/STREET-Gosse-Bouma.jpg",
      "https://petapixel.com/assets/uploads/2026/06/STREET-Gosse-Bouma-II.jpg",
      "https://petapixel.com/assets/uploads/2026/06/STREET-Gosse-Bouma-III.jpg",
    ],
  ),
  series(
    2026,
    "wildlife",
    "野生动物",
    "The Forest I Roam",
    "Alfred Minnaar",
    winners2026Page,
    "#385a59",
    [
      "https://petapixel.com/assets/uploads/2026/06/WILDLIFE_Alfred-Minnaar.jpg",
      "https://petapixel.com/assets/uploads/2026/06/WILDLIFE_Alfred-Minnaar-II-.jpg",
      "https://petapixel.com/assets/uploads/2026/06/WILDLIFE_Alfred-Minnaar-III.jpg",
    ],
  ),
  series(
    2023,
    "landscape",
    "风景",
    "Tibetan Landscape from the Train Window",
    "Weimin Chu",
    winners2023Page,
    "#7b7f82",
    [
      "https://petapixel.com/assets/uploads/2024/06/Landscape_Weimin-Chu_Tibetan-Landscape-from-the-Train-Window_1-.jpg",
      "https://petapixel.com/assets/uploads/2024/06/Landscape_RECOMMENDED_Weimin-Chu_Tibetan-Landscape-from-the-Train-Window_2.jpg",
      "https://petapixel.com/assets/uploads/2024/06/Landscape_Weimin-Chu_Tibetan-Landscape-from-the-Train-Window_3.jpg",
    ],
  ),
  series(
    2023,
    "architecture",
    "建筑",
    "Home",
    "Tiina Itkonen",
    winners2023Page,
    "#788086",
    [
      "https://petapixel.com/assets/uploads/2024/06/Architecture_Tiina-Itkonen_Home_-1.jpg",
      "https://petapixel.com/assets/uploads/2024/06/Architecture_Tiina-Itkonen_Home_2.jpg",
      "https://petapixel.com/assets/uploads/2024/06/Architecture_RECOMMENDED_Tiina-Itkonen_Home_3.jpg",
    ],
  ),
  series(
    2023,
    "portrait",
    "肖像",
    "Bicycle Street Sellers of Jakarta",
    "Panji Indra Permana",
    winners2023Page,
    "#776b5e",
    [
      "https://petapixel.com/assets/uploads/2024/06/Portrait_Panji-Indra-Permana-_Bicycle-Street-Sellers-of-Jakarta_1.jpg",
      "https://petapixel.com/assets/uploads/2024/06/Portrait_Panji-Indra-Permana-_Bicycle-Street-Sellers-of-Jakarta_2.jpg",
      "https://petapixel.com/assets/uploads/2024/06/Portrait_RECOMMENDED_Panji-Indra-Permana-_Bicycle-Street-Sellers-of-Jakarta_3.jpg",
    ],
  ),
  series(
    2023,
    "street",
    "街头",
    "The Commute",
    "Tom Pitts",
    winners2023Page,
    "#626468",
    [
      "https://petapixel.com/assets/uploads/2024/06/Street_Tom-Pitts_-The-Commute_1.jpg",
      "https://petapixel.com/assets/uploads/2024/06/Street_Tom-Pitts_-The-Commute_2.jpg",
      "https://petapixel.com/assets/uploads/2024/06/Street_RECOMMENDED_Tom-Pitts_-The-Commute_3.jpg",
    ],
  ),
  series(
    2023,
    "art",
    "艺术",
    "Diorama",
    "Jan Pypers",
    winners2023Page,
    "#666c68",
    [
      "https://petapixel.com/assets/uploads/2024/06/Art_Jan-Pypers_Diorama_1-.jpg",
      "https://petapixel.com/assets/uploads/2024/06/Art_RECOMMENDED_Jan-Pypers_Diorama_2.jpg",
      "https://petapixel.com/assets/uploads/2024/06/Art_Jan-Pypers_Diorama_3.jpg",
    ],
  ),
  series(
    2023,
    "project-21",
    "青年项目",
    "Tiny Titans",
    "Efraïm Baaijens",
    winners2023Page,
    "#676e66",
    [
      "https://petapixel.com/assets/uploads/2024/06/Project-21_RECOMMENDED_Efraim-Baaijens_-Tiny-Titans_1.jpg",
      "https://petapixel.com/assets/uploads/2024/06/Project-21_Efraim-Baaijens_-Tiny-Titans_2.jpg",
      "https://petapixel.com/assets/uploads/2024/06/Project-21_Efraim-Baaijens_-Tiny-Titans_3-.jpg",
    ],
  ),
];

const catalog = buildCatalog();

if (process.argv.includes("--check")) {
  await checkCatalog(catalog);
} else {
  await fs.writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  await buildAssets(catalog);
}

function series(year, categorySlug, categoryLabel, title, photographerName, sourcePageUrl, blurColor, urls) {
  return { year, categorySlug, categoryLabel, title, photographerName, sourcePageUrl, blurColor, urls };
}

function buildCatalog() {
  const entries = [];
  for (const category of categorySpecs) {
    for (const [index, [columnIndex, rowIndex]] of gridCells.entries()) {
      const column = columns[columnIndex];
      entries.push({
        slug: `masters-2026-finalist-${category.slug}-${String(index + 1).padStart(2, "0")}`,
        title: `大师赛 2026 · ${category.label}决赛 ${String(index + 1).padStart(2, "0")}`,
        sourceName: "Hasselblad Masters via PetaPixel",
        sourcePageUrl: finalistsPage,
        sourceImageUrl: category.sourceImageUrl,
        photographerName: "Finalist name not published",
        licenseLabel: "Evaluation only — permission required for production",
        blurColor: category.blurColor,
        description: `哈苏大师赛 2026 ${category.label}类决赛作品，仅用于学习版视觉连续性评估。`,
        activitySlug: activities[entries.length % activities.length],
        sortOrder: 1001 + entries.length,
        dimensions: [],
        evaluationOnly: true,
        year: 2026,
        category: category.slug,
        sourceKind: "collage_crop",
        sourceCrop: {
          left: column.left,
          top: rowIndex * 2000,
          width: column.width,
          height: 2000,
        },
      });
    }
  }
  for (const group of seriesSpecs) {
    for (const [index, sourceImageUrl] of group.urls.entries()) {
      entries.push({
        slug: `masters-${group.year}-winner-${group.categorySlug}-${String(index + 1).padStart(2, "0")}`,
        title: `大师赛 ${group.year} · ${group.categoryLabel}获奖 ${String(index + 1).padStart(2, "0")}`,
        sourceName: "Hasselblad Masters via PetaPixel",
        sourcePageUrl: group.sourcePageUrl,
        sourceImageUrl,
        photographerName: group.photographerName,
        licenseLabel: "Evaluation only — permission required for production",
        blurColor: group.blurColor,
        description: `${group.title}，${group.photographerName}；仅用于学习版视觉连续性评估。`,
        activitySlug: activities[entries.length % activities.length],
        sortOrder: 1001 + entries.length,
        dimensions: [],
        evaluationOnly: true,
        year: group.year,
        category: group.categorySlug,
        sourceKind: "standalone",
      });
    }
  }
  return entries;
}

async function buildAssets(entries) {
  await fs.mkdir(outputDirectory, { recursive: true });
  const sourceUrls = [...new Set(entries.map((entry) => entry.sourceImageUrl))];
  const sourceBuffers = new Map();
  await mapLimit(sourceUrls, 4, async (url) => {
    sourceBuffers.set(url, await download(url));
  });
  let completed = 0;
  await mapLimit(entries, 4, async (entry) => {
    const input = sourceBuffers.get(entry.sourceImageUrl);
    if (!input) throw new Error(`Missing source buffer: ${entry.slug}`);
    const metadata = await sharp(input).metadata();
    if (Math.max(metadata.width ?? 0, metadata.height ?? 0) < 1000) {
      throw new Error(`Evaluation source is too small: ${entry.slug}`);
    }
    let image = sharp(input).rotate();
    if (entry.sourceCrop) image = image.extract(entry.sourceCrop);
    await image
      .resize(1280, 853, { fit: "cover", position: "attention" })
      .webp({ quality: 76, effort: 6 })
      .toFile(path.join(outputDirectory, `${entry.slug}.webp`));
    completed += 1;
    if (completed % 20 === 0 || completed === entries.length) {
      console.log(`masters evaluation: ${completed}/${entries.length} generated`);
    }
  });
  console.log(`masters evaluation: ${entries.length} WebP files generated`);
}

async function checkCatalog(expectedCatalog) {
  const savedCatalog = JSON.parse(await fs.readFile(catalogPath, "utf8"));
  if (JSON.stringify(savedCatalog) !== JSON.stringify(expectedCatalog)) {
    throw new Error("Masters evaluation catalog is stale; run npm run build:masters-eval");
  }
  if (savedCatalog.length !== 109) throw new Error(`Expected 109 entries, found ${savedCatalog.length}`);
  const slugs = new Set();
  const activityCounts = new Map();
  for (const entry of savedCatalog) {
    if (slugs.has(entry.slug)) throw new Error(`Duplicate evaluation slug: ${entry.slug}`);
    if (!entry.evaluationOnly || !entry.licenseLabel.startsWith("Evaluation only")) {
      throw new Error(`Missing evaluation-only boundary: ${entry.slug}`);
    }
    if (!entry.sourceImageUrl.startsWith("https://petapixel.com/assets/uploads/")) {
      throw new Error(`Unexpected evaluation source: ${entry.slug}`);
    }
    slugs.add(entry.slug);
    activityCounts.set(entry.activitySlug, (activityCounts.get(entry.activitySlug) ?? 0) + 1);
    const metadata = await sharp(path.join(outputDirectory, `${entry.slug}.webp`)).metadata();
    if (metadata.format !== "webp" || metadata.width !== 1280 || metadata.height !== 853) {
      throw new Error(`Invalid evaluation output: ${entry.slug}.webp`);
    }
  }
  const counts = [...activityCounts.values()];
  if (activityCounts.size !== activities.length || Math.max(...counts) - Math.min(...counts) > 1) {
    throw new Error(`Unbalanced evaluation activities: ${JSON.stringify(Object.fromEntries(activityCounts))}`);
  }
  console.log(
    `masters evaluation: ${savedCatalog.length} WebP files verified (${JSON.stringify(Object.fromEntries(activityCounts))})`,
  );
}

async function mapLimit(items, limit, worker) {
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (nextIndex < items.length) {
        const item = items[nextIndex];
        nextIndex += 1;
        await worker(item);
      }
    }),
  );
}

async function download(url) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; MoyuStyleEvaluation/1.0)",
        },
      });
      if (!response.ok) throw new Error(`Download failed: ${response.status} ${url}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 800));
    }
  }
  throw new Error(`Download failed: ${url}`);
}
