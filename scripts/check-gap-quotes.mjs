import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  GAP_SEMANTIC_VERSION,
  gapSemanticValues,
  scoreGapSemanticActivityFit,
  semanticDimensionRefs,
} from "../src/lib/gap-semantics.ts";
import { assertGapCopyPolicy, findBlockedChinesePoliticalReference } from "./gap-content-policy.mjs";

const curatedSource = readFileSync(new URL("../src/lib/gap-quotes.ts", import.meta.url), "utf8");
const managedContentSource = readFileSync(new URL("../src/lib/gap-content.ts", import.meta.url), "utf8");
const corpus = JSON.parse(readFileSync(new URL("../src/lib/gap-copy-corpus.json", import.meta.url), "utf8"));
const forum = JSON.parse(readFileSync(new URL("../src/lib/gap-forum-copy.json", import.meta.url), "utf8"));
const curated = curatedSource
  .split("\n")
  .flatMap((line) => {
    const match = line.match(
      /quote\("([^"]+)", "(RESULT|CARD)", "[^"]+", "([^"]+)", "(drift|tea|breathe|stroll)",/,
    );
    return match ? [{ slug: `quote-${match[1]}`, kind: match[2], content: match[3], activitySlug: match[4] }] : [];
  });

assert.equal(curated.length, 80, "curated library must keep its 80 hand-reviewed entries");
assert.equal(findBlockedChinesePoliticalReference(curatedSource), null, "curated library contains blocked political copy");
const greetingBlocks = [...managedContentSource.matchAll(/slug: "greeting-[\s\S]*?dimensions:/g)].map((match) => match[0]);
assert.equal(greetingBlocks.length, 4, "all managed greetings must be politically screened");
assert.ok(greetingBlocks.every((block) => !findBlockedChinesePoliticalReference(block)), "greeting contains blocked political copy");
assert.ok(findBlockedChinesePoliticalReference("毛泽东"), "Chinese political-person screening is inactive");
assert.ok(findBlockedChinesePoliticalReference("Mao Zedong"), "English political-person screening is inactive");
assert.equal(corpus.entries.length, 1000, "cross-cultural corpus must contain exactly 1000 entries");
assert.equal(new Set(corpus.entries.map((entry) => entry.slug)).size, 1000, "corpus slugs must be unique");
assert.ok(corpus.entries.every((entry) => entry.slug.startsWith(`corpus-${corpus.version}-`)), "slug version mismatch");

assert.equal(forum.entries.length, 120, "forum layer must contain exactly 120 original comments");
assert.equal(new Set(forum.entries.map((entry) => entry.slug)).size, 120, "forum slugs must be unique");
assert.ok(forum.entries.every((entry) => entry.slug.startsWith(`forum-${forum.version}-`)), "forum slug version mismatch");

const allEntries = [...curated, ...corpus.entries, ...forum.entries];
assert.equal(new Set(allEntries.map((entry) => normalize(entry.content))).size, allEntries.length, "copy must be unique");
assert.equal(new Set(allEntries.map((entry) => entry.slug)).size, allEntries.length, "all slugs must be unique");

assert.deepEqual(countBy(corpus.entries, "region"), {
  east_asia: 500,
  latin_america: 100,
  south_asia_middle_east: 150,
  west: 250,
});
assert.deepEqual(countBy(corpus.entries, "activitySlug"), { breathe: 250, drift: 250, stroll: 250, tea: 250 });
assert.deepEqual(countBy(corpus.entries, "kind"), { CARD: 250, RESULT: 750 });
assert.deepEqual(countBy(corpus.entries, "language"), { en: 400, es: 100, "zh-Hans": 80, "zh-Hant": 420 });
assert.ok((countBy(corpus.entries, "era").modern ?? 0) >= 400, "modern pool is too small");
assert.ok(new Set(corpus.entries.map((entry) => entry.author)).size >= 80, "author pool is too narrow");
assert.ok(authorsIn("west").size >= 10, "western pool needs at least ten authors");
assert.ok(authorsIn("latin_america").size >= 2, "Latin American pool needs at least two authors");

assert.deepEqual(countBy(forum.entries, "forum"), { "Hacker News": 40, Reddit: 40, V2EX: 40 });
assert.deepEqual(countBy(forum.entries, "tone"), { deep: 60, light: 60 });
assert.deepEqual(countBy(forum.entries, "activitySlug"), { breathe: 30, drift: 30, stroll: 30, tea: 30 });
assert.deepEqual(countBy(forum.entries, "kind"), { CARD: 30, RESULT: 90 });
assert.equal(new Set(forum.entries.map((entry) => entry.sourceUrl)).size, 30, "forum source manifest must keep 30 threads");
for (const sourceUrl of new Set(forum.entries.map((entry) => entry.sourceUrl))) {
  const sourceEntries = forum.entries.filter((entry) => entry.sourceUrl === sourceUrl);
  assert.equal(sourceEntries.length, 4, `${sourceUrl} must have four original comments`);
  assert.deepEqual(countBy(sourceEntries, "tone"), { deep: 2, light: 2 });
}
for (const forumName of ["V2EX", "Hacker News", "Reddit"]) {
  for (const tone of ["light", "deep"]) {
    assert.equal(
      forum.entries.filter((entry) => entry.forum === forumName && entry.tone === tone).length,
      20,
      `${forumName}/${tone} must contain 20 comments`,
    );
  }
}
for (const tone of ["light", "deep"]) {
  for (const activitySlug of ["drift", "tea", "breathe", "stroll"]) {
    assert.equal(
      forum.entries.filter((entry) => entry.tone === tone && entry.activitySlug === activitySlug).length,
      15,
      `${tone}/${activitySlug} must contain 15 comments`,
    );
  }
}

const runtimeRegionQuotas = {
  RESULT: { east_asia: 6, west: 4, south_asia_middle_east: 3, latin_america: 3 },
  CARD: { east_asia: 3, west: 2, south_asia_middle_east: 1, latin_america: 1 },
};
for (const activitySlug of ["drift", "tea", "breathe", "stroll"]) {
  for (const kind of ["RESULT", "CARD"]) {
    const curatedCount = curated.filter((entry) => entry.activitySlug === activitySlug && entry.kind === kind).length;
    assert.ok(curatedCount >= (kind === "RESULT" ? 3 : 2), `${activitySlug}/${kind} curated runtime pool is too small`);
    for (const [region, quota] of Object.entries(runtimeRegionQuotas[kind])) {
      const count = corpus.entries.filter(
        (entry) => entry.activitySlug === activitySlug && entry.kind === kind && entry.region === region,
      ).length;
      assert.ok(count >= quota, `${activitySlug}/${kind}/${region} runtime pool is too small`);
    }
    const forumCount = forum.entries.filter(
      (entry) => entry.activitySlug === activitySlug && entry.kind === kind,
    ).length;
    assert.ok(forumCount >= (kind === "RESULT" ? 5 : 3), `${activitySlug}/${kind}/forum runtime pool is too small`);
  }
}

for (const region of ["east_asia", "west", "south_asia_middle_east", "latin_america"]) {
  const counts = Object.values(countBy(corpus.entries.filter((entry) => entry.region === region), "activitySlug"));
  assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, `${region} is not balanced across activities`);
}
for (const activitySlug of ["drift", "tea", "breathe", "stroll"]) {
  const activityEntries = corpus.entries.filter((entry) => entry.activitySlug === activitySlug);
  assert.ok(flatValues(activityEntries, "emotionalCores").size >= 8, `${activitySlug} emotional tags are too narrow`);
}
const activityFit = corpus.entries.map((entry) => {
  const scores = ["drift", "tea", "breathe", "stroll"].map((activitySlug) =>
    scoreGapSemanticActivityFit(entry.semantics, activitySlug),
  );
  return Math.max(...scores) - scoreGapSemanticActivityFit(entry.semantics, entry.activitySlug);
});
assert.ok(activityFit.filter((regret) => regret === 0).length >= 700, "too many entries miss their best semantic activity");
assert.ok(activityFit.filter((regret) => regret <= 10).length >= 800, "activity balancing causes too much semantic regret");
assert.ok(activityFit.reduce((sum, regret) => sum + regret, 0) / activityFit.length < 5, "average semantic regret is too high");
const forumActivityFit = forum.entries.map((entry) => {
  const scores = ["drift", "tea", "breathe", "stroll"].map((activitySlug) =>
    scoreGapSemanticActivityFit(entry.semantics, activitySlug),
  );
  return Math.max(...scores) - scoreGapSemanticActivityFit(entry.semantics, entry.activitySlug);
});
assert.ok(forumActivityFit.filter((regret) => regret === 0).length >= 100, "forum comments miss their best semantic activity too often");
assert.ok(forumActivityFit.filter((regret) => regret <= 10).length >= 100, "forum balancing causes too much semantic regret");
assert.ok(
  forumActivityFit.reduce((sum, regret) => sum + regret, 0) / forumActivityFit.length < 4,
  "forum average semantic regret is too high",
);
for (const key of ["psychologicalNeed", "literaryGesture", "energy"]) {
  const counts = [...Map.groupBy(corpus.entries, (entry) => entry.semantics[key]).values()].map((entries) => entries.length);
  assert.ok(Math.max(...counts) <= corpus.entries.length / 2, `${key} is dominated by one label`);
}

assertSemantic("嫦娥應悔", { emotionalCores: "melancholy", psychologicalNeed: "comfort" });
assertSemantic("For love is sufficient unto love", { emotionalCores: "tenderness", psychologicalNeed: "connection" });
assertSemantic("Yo he visto en la noche oscura", { emotionalCores: "wonder", literaryGesture: "open" });

for (const entry of corpus.entries) {
  assertGapCopyPolicy(entry);
  assert.ok(entry.title.length > 2 && entry.title.length <= 120, `${entry.slug} title length is invalid`);
  assert.ok(entry.content.length >= 8 && entry.content.length <= 150, `${entry.slug} content length is invalid`);
  assert.equal(entry.rights, "public-domain", `${entry.slug} rights status is missing`);
  assert.match(entry.sourceUrl, /^https:\/\//, `${entry.slug} source URL is invalid`);
  assert.equal(entry.semantics?.version, GAP_SEMANTIC_VERSION, `${entry.slug} semantic version mismatch`);
  assertTagList(entry, "scenes", gapSemanticValues.scene, 1, 2);
  assertTagList(entry, "emotionalCores", gapSemanticValues.emotionalCore, 1, 2);
  assert.ok(
    gapSemanticValues.psychologicalNeed.includes(entry.semantics.psychologicalNeed),
    `${entry.slug} psychological need is invalid`,
  );
  assert.ok(
    gapSemanticValues.literaryGesture.includes(entry.semantics.literaryGesture),
    `${entry.slug} literary gesture is invalid`,
  );
  assert.ok(gapSemanticValues.energy.includes(entry.semantics.energy), `${entry.slug} energy is invalid`);
  assert.ok(["contextual", "medium", "high"].includes(entry.semantics.confidence), `${entry.slug} confidence is invalid`);
  assert.equal(
    new Set(semanticDimensionRefs(entry.semantics)).size,
    semanticDimensionRefs(entry.semantics).length,
    `${entry.slug} semantic dimensions repeat`,
  );
  const notes = `区域=${regionLabel(entry.region)};时代=${entry.era};语言=${entry.language};权利=公版;来源=${entry.sourceUrl}`;
  assert.ok(notes.length <= 255, `${entry.slug} metadata exceeds the database notes limit`);
  assert.doesNotMatch(entry.content, /PROJECT GUTENBERG|copyright|�|□/i, `${entry.slug} contains source boilerplate`);
  if (entry.region === "east_asia") {
    assert.doesNotMatch(entry.content, /[（(][^）)]*$/, `${entry.slug} contains an unfinished variant note`);
  }
}

const vulgarPattern = /傻[逼屄]|操你|我操|卧槽|媽的|妈的|狗日|尼玛|艹|滾蛋|滚蛋|\b(?:fuck|shit|bullshit)\b/iu;
for (const entry of forum.entries) {
  assertGapCopyPolicy(entry);
  assert.ok(entry.title.length > 2 && entry.title.length <= 120, `${entry.slug} title length is invalid`);
  assert.ok(entry.content.length >= 16 && entry.content.length <= 120, `${entry.slug} content length is invalid`);
  assert.equal(entry.rights, "original-commentary", `${entry.slug} must be original commentary`);
  assert.equal(entry.language, "zh-Hans", `${entry.slug} language must be zh-Hans`);
  assert.equal(entry.era, "contemporary", `${entry.slug} era must be contemporary`);
  assert.equal(entry.region, "global_forum", `${entry.slug} region must be global_forum`);
  assert.ok(["light", "deep"].includes(entry.tone), `${entry.slug} tone is invalid`);
  assert.ok(entry.topic && entry.topicLabel, `${entry.slug} topic metadata is missing`);
  assert.equal(entry.semantics?.version, GAP_SEMANTIC_VERSION, `${entry.slug} semantic version mismatch`);
  assertTagList(entry, "scenes", gapSemanticValues.scene, 1, 2);
  assertTagList(entry, "emotionalCores", gapSemanticValues.emotionalCore, 1, 2);
  assert.ok(
    gapSemanticValues.psychologicalNeed.includes(entry.semantics.psychologicalNeed),
    `${entry.slug} psychological need is invalid`,
  );
  assert.ok(
    gapSemanticValues.literaryGesture.includes(entry.semantics.literaryGesture),
    `${entry.slug} literary gesture is invalid`,
  );
  assert.ok(gapSemanticValues.energy.includes(entry.semantics.energy), `${entry.slug} energy is invalid`);
  assert.ok(["contextual", "medium", "high"].includes(entry.semantics.confidence), `${entry.slug} confidence is invalid`);
  assert.equal(
    new Set(semanticDimensionRefs(entry.semantics)).size,
    semanticDimensionRefs(entry.semantics).length,
    `${entry.slug} semantic dimensions repeat`,
  );
  assert.doesNotMatch(entry.content, vulgarPattern, `${entry.slug} contains vulgar language`);
  assert.match(entry.observedAt, /^\d{4}-\d{2}-\d{2}$/, `${entry.slug} observed date is invalid`);
  assert.match(entry.expiresAt, /^\d{4}-\d{2}-\d{2}$/, `${entry.slug} expiry date is invalid`);
  assert.ok(
    Date.parse(`${entry.expiresAt}T00:00:00Z`) - Date.parse(`${entry.observedAt}T00:00:00Z`) >= 60 * 86_400_000,
    `${entry.slug} freshness window is too short`,
  );
  assertForumUrl(entry);
  const notes = `区域=现代论坛;时代=当代;语言=zh-Hans;权利=原创;论坛=${entry.forum};语气=${entry.tone};话题=${entry.topic};观察=${entry.observedAt};有效至=${entry.expiresAt};来源=${entry.sourceUrl}`;
  assert.ok(notes.length <= 255, `${entry.slug} metadata exceeds the database notes limit`);
}

assert.ok(distinctSemanticValues("scenes").size >= 9, "scene taxonomy is not being used broadly enough");
assert.ok(distinctSemanticValues("emotionalCores").size >= 10, "emotional taxonomy is not being used broadly enough");
assert.ok(distinctSemanticValues("psychologicalNeed").size >= 8, "psychological needs are too uniform");
assert.ok(distinctSemanticValues("literaryGesture").size >= 7, "literary gestures are too uniform");
assert.ok(distinctSemanticValues("energy").size >= 6, "energy labels are too uniform");
for (const region of ["east_asia", "west", "south_asia_middle_east", "latin_america"]) {
  const regional = corpus.entries.filter((entry) => entry.region === region);
  assert.ok(flatValues(regional, "scenes").size >= 5, `${region} scene tags are too narrow`);
  assert.ok(flatValues(regional, "emotionalCores").size >= 6, `${region} emotional tags are too narrow`);
}

console.log("gap quote library: 1200 unique entries; public-domain corpus and original forum layer are semantic, balanced, sourced, clean, fresh, and politically screened");

function countBy(entries, key) {
  return Object.fromEntries(
    [...Map.groupBy(entries, (entry) => entry[key])]
      .map(([value, items]) => [value, items.length])
      .sort(([left], [right]) => String(left).localeCompare(String(right))),
  );
}

function authorsIn(region) {
  return new Set(corpus.entries.filter((entry) => entry.region === region).map((entry) => entry.author));
}

function regionLabel(region) {
  return {
    east_asia: "东亚",
    west: "西方",
    south_asia_middle_east: "南亚/中东",
    latin_america: "拉美",
  }[region];
}

function normalize(value) {
  return value.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

function assertTagList(entry, key, allowed, min, max) {
  const values = entry.semantics?.[key];
  assert.ok(Array.isArray(values) && values.length >= min && values.length <= max, `${entry.slug} ${key} count is invalid`);
  assert.equal(new Set(values).size, values.length, `${entry.slug} ${key} contains duplicates`);
  assert.ok(values.every((value) => allowed.includes(value)), `${entry.slug} ${key} contains unknown values`);
}

function distinctSemanticValues(key) {
  if (["scenes", "emotionalCores"].includes(key)) return flatValues(corpus.entries, key);
  return new Set(corpus.entries.map((entry) => entry.semantics[key]));
}

function flatValues(entries, key) {
  return new Set(entries.flatMap((entry) => entry.semantics[key]));
}

function assertSemantic(contentFragment, expected) {
  const entry = corpus.entries.find((candidate) => candidate.content.includes(contentFragment));
  assert.ok(entry, `semantic audit sample is missing: ${contentFragment}`);
  for (const [key, value] of Object.entries(expected)) {
    const actual = entry.semantics[key];
    assert.ok(Array.isArray(actual) ? actual.includes(value) : actual === value, `${contentFragment} should tag ${key}:${value}`);
  }
}

function assertForumUrl(entry) {
  const patterns = {
    "Hacker News": /^https:\/\/news\.ycombinator\.com\/item\?id=\d+$/,
    V2EX: /^https:\/\/(?:www\.)?v2ex\.com\/t\/\d+$/,
    Reddit: /^https:\/\/www\.reddit\.com\/r\/(?:simpleliving|CasualConversation)\/comments\/[a-z0-9]+\/[a-z0-9_]+\/$/,
  };
  assert.match(entry.sourceUrl, patterns[entry.forum], `${entry.slug} source URL is outside the reviewed forum set`);
}
