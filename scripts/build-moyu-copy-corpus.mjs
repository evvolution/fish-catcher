import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import {
  analyzeMoyuSemantics,
  MOYU_SEMANTIC_VERSION,
  scoreMoyuSemanticActivityFit,
} from "../src/lib/moyu-semantics.ts";
import { assertMoyuCopyPolicy, isMoyuCopyCandidateAllowed } from "./moyu-content-policy.mjs";

const VERSION = `2026-07-18-semantic-v${MOYU_SEMANTIC_VERSION}`;
const OUTPUT_URL = new URL("../src/lib/moyu-copy-corpus.json", import.meta.url);
const QUOTE_SOURCE_URL = new URL("../src/lib/moyu-quotes.ts", import.meta.url);
const ACTIVITIES = ["drift", "tea", "breathe", "stroll"];
const RAW_FREEVERSE = "https://raw.githubusercontent.com/Pro777/freeverse/main/";
const FREEVERSE_TREE = "https://api.github.com/repos/Pro777/freeverse/git/trees/main?recursive=1";

const westernAuthors = [
  ["william-shakespeare", "William Shakespeare", "classical", 14],
  ["john-donne", "John Donne", "classical", 10],
  ["andrew-marvell", "Andrew Marvell", "classical", 8],
  ["george-herbert", "George Herbert", "classical", 10],
  ["william-blake", "William Blake", "modern", 12],
  ["emily-dickinson", "Emily Dickinson", "modern", 14],
  ["walt-whitman", "Walt Whitman", "modern", 14],
  ["ralph-waldo-emerson", "Ralph Waldo Emerson", "modern", 10],
  ["christina-rossetti", "Christina Rossetti", "modern", 10],
  ["edgar-allan-poe", "Edgar Allan Poe", "modern", 10],
  ["emily-bronte", "Emily Brontë", "modern", 10],
  ["elizabeth-barrett-browning", "Elizabeth Barrett Browning", "modern", 8],
  ["gerard-manley-hopkins", "Gerard Manley Hopkins", "modern", 8],
];

const existingContents = new Set(
  [...readFileSync(QUOTE_SOURCE_URL, "utf8").matchAll(/quote\("[^"]+", "(?:RESULT|CARD)", "[^"]+", "([^"]+)",/g)].map(
    (match) => normalize(match[1]),
  ),
);
const usedContents = new Set(existingContents);

const previousCorpus = readPreviousCorpus();
const freeversePaths = await fetchFreeversePaths(previousCorpus);

const [eastAsia, west, easternModern, latinAmerica] = await Promise.all([
  buildEastAsia(),
  buildWest(),
  buildEasternModern(),
  buildLatinAmerica(),
]);

const entries = [
  ...assignPool(eastAsia, 500, 0),
  ...assignPool(west, 250, 0),
  ...assignPool(easternModern, 150, 2),
  ...assignPool(latinAmerica, 100, 0),
].map((entry, index) => {
  const output = { ...entry };
  delete output.score;
  return {
    slug: `corpus-${VERSION}-${String(index + 1).padStart(4, "0")}`,
    kind: index % 4 === 0 ? "CARD" : "RESULT",
    dropRate: index % 4 === 0 ? (index % 8 === 0 ? 16 : 24) : 0,
    ...output,
    rights: "public-domain",
    semantics: analyzeMoyuSemantics(output),
  };
});

assert.equal(entries.length, 1000);
entries.forEach(assertMoyuCopyPolicy);
writeFileSync(
  OUTPUT_URL,
  `${JSON.stringify(
    {
      version: VERSION,
      generatedAt: "2026-07-18",
      entries,
    },
    null,
    2,
  )}\n`,
);

console.log(`wrote ${entries.length} public-domain entries to ${OUTPUT_URL.pathname}`);

async function buildEastAsia() {
  const [tangBook, shijing] = await Promise.all([
    fetchJson(
      "https://raw.githubusercontent.com/chinese-poetry/chinese-poetry/master/%E8%92%99%E5%AD%A6/tangshisanbaishou.json",
    ),
    fetchJson("https://raw.githubusercontent.com/chinese-poetry/chinese-poetry/master/%E8%AF%97%E7%BB%8F/shijing.json"),
  ]);
  const tangPoems = tangBook.content.flatMap((section) => section.content);
  const tangGroups = tangPoems.map((poem) => ({
    score: 0,
    entries: poem.paragraphs
      .map(cleanChineseText)
      .filter((text) => isUsable(text, 8, 72))
      .map((content) => ({
        author: poem.author,
        work: poem.chapter,
        title: `${poem.author}《${poem.chapter}》`,
        content,
        region: "east_asia",
        era: "ancient",
        language: "zh-Hant",
        sourceUrl:
          "https://github.com/chinese-poetry/chinese-poetry/blob/master/%E8%92%99%E5%AD%A6/tangshisanbaishou.json",
        score: scoreText(content, "zh"),
      })),
  }));
  const shijingGroups = shijing.map((poem) => ({
    score: 0,
    entries: poem.content
      .flatMap((paragraph) => paragraph.match(/[^。！？]+[。！？]?/g) ?? [])
      .map(cleanChineseText)
      .filter((text) => isUsable(text, 8, 72))
      .map((content) => ({
        author: "佚名",
        work: `诗经·${poem.title}`,
        title: `《诗经·${poem.title}》`,
        content,
        region: "east_asia",
        era: "ancient",
        language: "zh-Hans",
        sourceUrl:
          "https://github.com/chinese-poetry/chinese-poetry/blob/master/%E8%AF%97%E7%BB%8F/shijing.json",
        score: scoreText(content, "zh"),
      })),
  }));

  return [
    ...takeUnique(selectRoundRobin(sortGroups(tangGroups), 650), 420),
    ...takeUnique(selectRoundRobin(sortGroups(shijingGroups), 160), 80),
  ];
}

async function buildWest() {
  const groups = await mapLimit(westernAuthors, 5, async ([authorSlug, author, era, fileLimit]) => {
    const paths = freeversePaths
      .filter((path) => path.startsWith(`poems/${authorSlug}/`) && path.endsWith(".txt"))
      .slice(0, fileLimit);
    const poems = await mapLimit(paths, 8, async (path) => {
      const poemSlug = path.split("/").at(-1).replace(/\.txt$/, "");
      const text = await fetchText(`${RAW_FREEVERSE}${path}`);
      return pairCandidates(text).map((content) => ({
        author,
        work: titleCase(poemSlug),
        title: `${author} · ${titleCase(poemSlug)}`,
        content,
        region: "west",
        era,
        language: "en",
        sourceUrl: `https://thefreeverse.org/poem/${authorSlug}%2F${poemSlug}/`,
        score: scoreText(content, "en"),
      }));
    });
    return { score: 0, entries: poems.flat().sort(byScore) };
  });

  return takeUnique(selectRoundRobin(sortGroups(groups), 360), 250);
}

async function buildEasternModern() {
  const tagoreUrl =
    "https://raw.githubusercontent.com/standardebooks/rabindranath-tagore_gitanjali/master/src/epub/text/gitanjali.xhtml";
  const prophetTocUrl =
    "https://raw.githubusercontent.com/standardebooks/kahlil-gibran_the-prophet/master/src/epub/toc.xhtml";
  const [gitanjali, prophetToc] = await Promise.all([fetchText(tagoreUrl), fetchText(prophetTocUrl)]);

  const tagoreGroups = [...gitanjali.matchAll(/<article id="song-(\d+)"[\s\S]*?<\/article>/g)].map((article) => ({
    score: 0,
    entries: [...article[0].matchAll(/<p>([\s\S]*?)<\/p>/g)]
      .flatMap((match) => splitSentences(stripHtml(match[1])))
      .filter((content) => isUsable(content, 28, 150))
      .map((content) => ({
        author: "Rabindranath Tagore",
        work: `Gitanjali ${article[1]}`,
        title: `Rabindranath Tagore · Gitanjali ${article[1]}`,
        content,
        region: "south_asia_middle_east",
        era: "modern",
        language: "en",
        sourceUrl: "https://standardebooks.org/ebooks/rabindranath-tagore/gitanjali/text/single-page",
        score: scoreText(content, "en"),
      })),
  }));
  const tagore = takeUnique(selectRoundRobin(sortGroups(tagoreGroups), 140), 100);

  const prophetPaths = [
    ...new Set(
      [...prophetToc.matchAll(/href="text\/(on-[^"]+\.xhtml)"/g)].map(
        (match) => `src/epub/text/${match[1]}`,
      ),
    ),
  ];
  assert.ok(prophetPaths.length >= 20, "The Prophet table of contents is incomplete");
  const gibranGroups = await mapLimit(prophetPaths, 7, async (path) => {
    const chapter = titleCase(path.split("/").at(-1).replace(/\.xhtml$/, ""));
    const html = await fetchText(
      `https://raw.githubusercontent.com/standardebooks/kahlil-gibran_the-prophet/master/${path}`,
    );
    const paragraphs = [...html.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((match) => stripHtml(match[1]));
    const candidates = [
      ...paragraphs.flatMap(splitSentences),
      ...pairShortParagraphs(paragraphs),
    ]
      .filter((content) => isUsable(content, 24, 150))
      .map((content) => ({
        author: "Kahlil Gibran",
        work: `The Prophet · ${chapter}`,
        title: `Kahlil Gibran · ${chapter}`,
        content,
        region: "south_asia_middle_east",
        era: "modern",
        language: "en",
        sourceUrl: "https://standardebooks.org/ebooks/kahlil-gibran/the-prophet/text/single-page",
        score: scoreText(content, "en"),
      }));
    return { score: 0, entries: candidates.sort(byScore) };
  });
  const gibran = takeUnique(selectRoundRobin(sortGroups(gibranGroups), 90), 50);

  return [...tagore, ...gibran];
}

async function buildLatinAmerica() {
  const martiPaths = freeversePaths.filter(
    (path) => path.startsWith("poems/jose-marti/") && path.endsWith(".txt"),
  );
  const martiGroups = await mapLimit(martiPaths, 8, async (path) => {
    const poemSlug = path.split("/").at(-1).replace(/\.txt$/, "");
    const text = await fetchText(`${RAW_FREEVERSE}${path}`);
    return {
      score: 0,
      entries: stanzaCandidates(text)
        .map((content) => ({
          author: "José Martí",
          work: titleCase(poemSlug),
          title: `José Martí · ${titleCase(poemSlug)}`,
          content,
          region: "latin_america",
          era: "modern",
          language: "es",
          sourceUrl: `https://thefreeverse.org/poem/jose-marti%2F${poemSlug}/`,
          score: scoreText(content, "es"),
        }))
        .sort(byScore),
    };
  });
  const marti = takeUnique(selectRoundRobin(sortGroups(martiGroups), 90), 50);

  const darioRaw = await fetchText(
    "https://raw.githubusercontent.com/GITenberg/Poema-del-Otono-y-otros-poemas-Obras-Completas-Vol-XI_51569/master/51569-8.txt",
    "windows-1252",
  );
  const darioBody = darioRaw.split("*** START OF THIS PROJECT GUTENBERG EBOOK").at(-1).split("*** END OF")[0];
  const dario = takeUnique(
    stanzaCandidates(darioBody, (line) => {
      const clean = cleanText(line.replace(/^[_*]+|[_*]+$/g, ""));
      return /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(clean) &&
        !/gutenberg|imagen|volumen|editorial|http|ebook|copyright/i.test(clean) &&
        clean !== clean.toUpperCase()
        ? clean
        : "";
    })
      .filter((content) => /^[A-ZÁÉÍÓÚÜÑ¿¡"“]/.test(content) && /[.!?…;:]$/.test(content))
      .map((content) => ({
        author: "Rubén Darío",
        work: "Poema del Otoño y otros poemas",
        title: "Rubén Darío · Poema del Otoño",
        content,
        region: "latin_america",
        era: "modern",
        language: "es",
        sourceUrl: "https://www.gutenberg.org/ebooks/51569",
        score: scoreText(content, "es"),
      }))
      .sort(byScore),
    50,
  );

  return [...marti, ...dario];
}

function assignPool(entries, expectedCount, quotaOffset) {
  assert.equal(entries.length, expectedCount, `pool must contain ${expectedCount} entries`);
  const quotas = Object.fromEntries(ACTIVITIES.map((activity) => [activity, Math.floor(expectedCount / 4)]));
  for (let index = 0; index < expectedCount % 4; index += 1) {
    quotas[ACTIVITIES[(index + quotaOffset) % ACTIVITIES.length]] += 1;
  }

  // ponytail: 四个固定容量用“错配代价最大者优先”的贪心分配；行为或约束继续增长时再升级为最小费用流。
  const candidates = entries
    .map((entry, index) => ({ entry, index, choices: rankActivities(entry) }))
    .toSorted((left, right) => {
      const leftRegret = left.choices[0].score - left.choices[1].score;
      const rightRegret = right.choices[0].score - right.choices[1].score;
      return rightRegret - leftRegret || right.choices[0].score - left.choices[0].score || left.index - right.index;
    });
  const assignedActivity = new Map();

  for (const candidate of candidates) {
    const activitySlug = candidate.choices.find((choice) => quotas[choice.activitySlug] > 0)?.activitySlug;
    assert.ok(activitySlug, "activity quota assignment failed");
    quotas[activitySlug] -= 1;
    assignedActivity.set(candidate.index, activitySlug);
  }

  return entries.map((entry, index) => ({ ...entry, activitySlug: assignedActivity.get(index) }));
}

function rankActivities(entry) {
  return ACTIVITIES.map((activitySlug) => {
    const semantics = analyzeMoyuSemantics({
      content: entry.content,
      title: entry.title,
      activitySlug,
    });
    return {
      activitySlug,
      score: scoreMoyuSemanticActivityFit(semantics, activitySlug) * 10 + scoreActivitySurface(entry.content, activitySlug),
    };
  })
    .toSorted((left, right) => right.score - left.score || left.activitySlug.localeCompare(right.activitySlug));
}

function scoreActivitySurface(text, activitySlug) {
  const lower = text.toLowerCase();
  const patterns = {
    drift: countMatches(lower, /dream|silence|quiet|still|心|梦|靜|静|寂|悠|思|alma|silencio|sueñ/g),
    tea: countMatches(lower, /warm|home|fire|cup|wine|friend|家|酒|茶|燈|灯|暖|友|casa|fuego|amor/g),
    breathe: countMatches(lower, /wind|air|sky|cloud|moon|sea|river|light|風|风|雲|云|月|江|海|天|aire|cielo|mar|luz/g),
    stroll: countMatches(lower, /road|path|walk|journey|field|mountain|hill|路|行|山|野|徑|径|camino|monte|viaje/g),
  };
  return patterns[activitySlug];
}

function pairCandidates(text, lineCleaner = cleanText) {
  return text
    .split(/\r?\n\s*\r?\n/)
    .flatMap((stanza) => {
      const lines = stanza.split(/\r?\n/).map(lineCleaner).filter(Boolean);
      return lines.slice(0, -1).map((line, index) => `${line}\n${lines[index + 1]}`);
    })
    .map(cleanText)
    .filter((content) => isUsable(content, 24, 150));
}

function stanzaCandidates(text, lineCleaner = cleanText) {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((stanza) => stanza.split(/\r?\n/).map(lineCleaner).filter(Boolean).join("\n"))
    .map(cleanText)
    .filter((content) => isUsable(content, 24, 150));
}

function pairShortParagraphs(paragraphs) {
  return paragraphs
    .slice(0, -1)
    .map((paragraph, index) => `${paragraph} ${paragraphs[index + 1]}`)
    .filter((content) => content.length <= 150);
}

function selectRoundRobin(groups, count) {
  const output = [];
  for (let round = 0; output.length < count; round += 1) {
    let added = false;
    for (const group of groups) {
      if (group.entries[round]) {
        output.push(group.entries[round]);
        added = true;
      }
      if (output.length === count) return output;
    }
    if (!added) break;
  }
  return output;
}

function takeUnique(entries, count) {
  const output = [];
  for (const entry of entries) {
    if (!isMoyuCopyCandidateAllowed(entry)) continue;
    const key = normalize(entry.content);
    if (usedContents.has(key)) continue;
    usedContents.add(key);
    output.push(entry);
    if (output.length === count) return output;
  }
  assert.fail(`only found ${output.length} unique entries; expected ${count}`);
}

function sortGroups(groups) {
  return groups
    .filter((group) => group.entries.length > 0)
    .map((group) => ({ ...group, entries: group.entries.toSorted(byScore) }))
    .toSorted((left, right) => (right.entries[0]?.score ?? 0) - (left.entries[0]?.score ?? 0));
}

function scoreText(text, language) {
  const keywords = {
    zh: /心|夢|梦|月|風|风|雲|云|山|水|花|春|秋|光|人|歸|归|靜|静|天|海|夜/g,
    en: /love|life|heart|soul|light|night|world|dream|hope|time|wind|sea|sky|home|truth|beauty/gi,
    es: /amor|vida|alma|corazón|luz|noche|mundo|sueño|esperanza|tiempo|viento|mar|cielo|verdad|belleza/gi,
  };
  const lengthScore = text.length >= 36 && text.length <= 120 ? 4 : 1;
  return lengthScore + countMatches(text, keywords[language] ?? keywords.en) * 3 + (/[.!?。！？]$/.test(text) ? 2 : 0);
}

function splitSentences(text) {
  return (text.match(/[^.!?]+[.!?]+[”’"]?|[^.!?]+$/g) ?? []).map(cleanText);
}

function stripHtml(value) {
  return cleanText(
    value
      .replace(/<[^>]+>/g, " ")
      .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
      .replace(/&(?:nbsp|#160);/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'"),
  );
}

function titleCase(slug) {
  return slug
    .split("-")
    .map((word) => (/^[ivxlcdm]+$/i.test(word) ? word.toUpperCase() : word ? `${word[0].toUpperCase()}${word.slice(1)}` : word))
    .join(" ");
}

function cleanChineseText(value) {
  return cleanText(value.replace(/[（(][^）)]*(?:[）)]|$)/g, ""));
}

function cleanText(value) {
  return value.replace(/[\t ]+/g, " ").replace(/ *\n */g, "\n").trim();
}

function normalize(value) {
  return cleanText(value).toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

function isUsable(value, min, max) {
  return value.length >= min && value.length <= max && !/[�□]/.test(value);
}

function byScore(left, right) {
  return right.score - left.score || left.content.localeCompare(right.content);
}

function countMatches(value, pattern) {
  pattern.lastIndex = 0;
  return [...value.matchAll(pattern)].length;
}

async function fetchJson(url) {
  return JSON.parse(await fetchText(url));
}

async function fetchFreeversePaths(previous) {
  try {
    const tree = await fetchJson(FREEVERSE_TREE);
    assert.equal(tree.truncated, false, "Freeverse tree response was truncated");
    return tree.tree.map((item) => item.path);
  } catch (error) {
    const fallback = previous?.entries
      ?.map((entry) => entry.sourceUrl?.match(/thefreeverse\.org\/poem\/([^%/]+)%2F([^/]+)\//))
      .filter(Boolean)
      .map((match) => `poems/${match[1]}/${match[2]}.txt`);
    assert.ok(fallback?.length >= 100, `Freeverse source manifest is unavailable: ${error}`);
    return [...new Set(fallback)];
  }
}

function readPreviousCorpus() {
  try {
    return JSON.parse(readFileSync(OUTPUT_URL, "utf8"));
  } catch {
    return null;
  }
}

async function fetchText(url, encoding = "utf-8") {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": "fish-catcher-content-builder/1.0" } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return new TextDecoder(encoding).decode(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 400));
    }
  }
  throw new Error(`Unable to fetch ${url}: ${lastError}`);
}

async function mapLimit(items, limit, mapper) {
  // ponytail: 固定语料构建最多并发 8 个请求；若扩到万条，再换成带重试队列的下载器。
  const output = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        output[index] = await mapper(items[index], index);
      }
    }),
  );
  return output;
}
