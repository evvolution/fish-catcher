import type { CopywritingRecord } from "~~/src/lib/moyu-types";
import { activitySeeds } from "~~/src/lib/moyu-content-seeds";

export function groupDimensionKeys(
  items: Array<{ option: { slug: string; group: { key: string } } }>,
) {
  return items.reduce<Record<string, string[]>>((accumulator, entry) => {
    const groupKey = entry.option.group.key;
    accumulator[groupKey] ??= [];
    accumulator[groupKey].push(entry.option.slug);
    return accumulator;
  }, {});
}

export function selectRuntimeCopyEntries(entries: CopywritingRecord[]) {
  const freshEntries = entries.filter(isRuntimeCopyFresh);
  const dayNumber = Math.floor(Date.now() / 86_400_000);
  const selected = freshEntries.filter(
    (entry) => (entry.kind !== "RESULT" && entry.kind !== "CARD") || !entry.activitySlug,
  );
  const cultureLimits = {
    RESULT: [["curated", 3], ["东亚", 6], ["西方", 4], ["南亚/中东", 3], ["拉美", 3], ["现代论坛", 5]],
    CARD: [["curated", 2], ["东亚", 3], ["西方", 2], ["南亚/中东", 1], ["拉美", 1], ["现代论坛", 3]],
  } as const;

  for (const activitySlug of activitySeeds.map((activity) => activity.slug)) {
    for (const [kind, limit] of [["RESULT", 24], ["CARD", 12]] as const) {
      const pool = freshEntries.filter((entry) => entry.kind === kind && entry.activitySlug === activitySlug);
      if (pool.length <= limit) {
        selected.push(...pool);
        continue;
      }
      const dailyEntries = cultureLimits[kind].flatMap(([culture, cultureLimit]) => takeRotatingEntries(
        pool.filter((entry) => runtimeCulture(entry) === culture),
        cultureLimit,
        `${dayNumber}:${activitySlug}:${kind}:${culture}`,
      ));
      if (dailyEntries.length < limit) {
        const selectedSlugs = new Set(dailyEntries.map((entry) => entry.slug));
        dailyEntries.push(...takeRotatingEntries(
          pool.filter((entry) => !selectedSlugs.has(entry.slug)),
          limit - dailyEntries.length,
          `${dayNumber}:${activitySlug}:${kind}:remainder`,
        ));
      }
      selected.push(...dailyEntries);
    }
  }
  return selected;
}

function runtimeCulture(entry: CopywritingRecord) {
  return entry.notes?.match(/(?:^|;)区域=([^;]+)/)?.[1] ?? "curated";
}

function isRuntimeCopyFresh(entry: CopywritingRecord) {
  const expiresAt = entry.notes?.match(/(?:^|;)有效至=(\d{4}-\d{2}-\d{2})(?:;|$)/)?.[1];
  return !expiresAt || expiresAt >= new Date().toISOString().slice(0, 10);
}

function takeRotatingEntries(entries: CopywritingRecord[], limit: number, seed: string) {
  const pool = entries.toSorted((left, right) => left.slug.localeCompare(right.slug));
  if (pool.length <= limit) return pool;
  const start = stableStringHash(seed) % pool.length;
  return Array.from({ length: limit }, (_, index) => pool[(start + index) % pool.length]!);
}

function stableStringHash(value: string) {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.codePointAt(0)!) >>> 0;
  return hash;
}
