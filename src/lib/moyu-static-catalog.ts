import type { DimensionGroupRecord, ForestCatalog } from "~~/src/lib/moyu-types";
import {
  activitySeeds,
  backgroundSeeds,
  citySeeds,
  copySeeds,
  dimensionGroupSeeds,
  fishSpeciesSeeds,
  generatedCopySeeds,
} from "~~/src/lib/moyu-content-seeds";
import { selectRuntimeCopyEntries } from "~~/src/lib/moyu-content-runtime";

export function buildStaticForestCatalog(): ForestCatalog {
  // ponytail: 仅供无数据库的本地视觉验收；生产环境始终走 Prisma 内容库。
  const dimensionGroups: DimensionGroupRecord[] = dimensionGroupSeeds.map((group) => ({
    id: `preview_dimension_group_${group.key}`,
    key: group.key,
    label: group.label,
    kind: group.kind,
    description: group.description,
    options: group.options.map((option) => ({
      id: `preview_dimension_${group.key}_${option.slug}`,
      groupKey: group.key,
      groupLabel: group.label,
      kind: group.kind,
      slug: option.slug,
      label: option.label,
      description: option.description ?? null,
    })),
  }));
  const dimensionIdByRef = new Map<string, string>(dimensionGroups.flatMap((group) =>
    group.options.map((option) => [`${group.key}:${option.slug}`, option.id] as const)));
  const dimensionKeysFromRefs = (refs: string[] = []) => refs.reduce<Record<string, string[]>>((keys, ref) => {
    const [groupKey, optionSlug] = ref.split(":");
    if (groupKey && optionSlug) {
      keys[groupKey] ??= [];
      keys[groupKey].push(optionSlug);
    }
    return keys;
  }, {});

  return {
    activities: activitySeeds.map((activity) => ({
      id: `preview_activity_${activity.slug}`,
      slug: activity.slug,
      name: activity.name,
      iconKey: activity.iconKey,
      description: activity.description,
      prompt: activity.prompt,
      colorStart: activity.colorStart,
      colorEnd: activity.colorEnd,
    })),
    dimensionGroups,
    backgrounds: backgroundSeeds.map((background) => ({
      id: `preview_background_${background.slug}`,
      slug: background.slug,
      title: background.title,
      imagePath: background.imagePath,
      sourceName: background.sourceName,
      sourcePageUrl: background.sourcePageUrl,
      photographerName: background.photographerName ?? null,
      licenseLabel: background.licenseLabel ?? null,
      blurColor: background.blurColor ?? null,
      description: background.description ?? null,
      activitySlug: background.activitySlug ?? null,
      dimensionOptionIds: (background.dimensions ?? []).flatMap((ref) => dimensionIdByRef.get(ref) ?? []),
      dimensionKeys: dimensionKeysFromRefs(background.dimensions),
    })),
    copyEntries: selectRuntimeCopyEntries([...copySeeds, ...generatedCopySeeds].map((entry) => ({
      id: `preview_copy_${entry.slug}`,
      slug: entry.slug,
      kind: entry.kind,
      title: entry.title,
      content: entry.content,
      notes: entry.notes ?? null,
      activitySlug: entry.activitySlug ?? null,
      minDurationSec: entry.minDurationSec ?? null,
      maxDurationSec: entry.maxDurationSec ?? null,
      weight: entry.weight ?? 100,
      dropRate: entry.dropRate ?? 0,
      dimensionOptionIds: (entry.dimensions ?? []).flatMap((ref) => dimensionIdByRef.get(ref) ?? []),
      dimensionKeys: dimensionKeysFromRefs(entry.dimensions),
    }))),
    cities: citySeeds.map((city) => ({
      id: `preview_city_${city.slug}`,
      slug: city.slug,
      name: city.name,
      description: city.description,
      snacks: city.snacks.map((snack) => ({
        id: `preview_snack_${city.slug}_${snack.slug}`,
        slug: snack.slug,
        name: snack.name,
        unitLabel: snack.unitLabel,
        priceCents: snack.priceCents,
        description: snack.description ?? null,
      })),
    })),
    fishes: fishSpeciesSeeds.map((fish) => ({
      id: `preview_fish_${fish.slug}`,
      slug: fish.slug,
      commonNameZh: fish.commonNameZh,
      commonNameEn: fish.commonNameEn,
      scientificName: fish.scientificName,
      habitatLabel: fish.habitatLabel,
      summary: fish.summary,
      habits: fish.habits,
      distribution: fish.distribution,
      imagePath: fish.imagePath,
      chinaProtectionStatus: fish.chinaProtectionStatus,
      citesAppendix: fish.citesAppendix,
      threeHaveStatus: fish.threeHaveStatus,
      toxicityStatus: fish.toxicityStatus,
      edibilityStatus: fish.edibilityStatus,
      legalReviewedAt: fish.legalReviewedAt,
    })),
  };
}
