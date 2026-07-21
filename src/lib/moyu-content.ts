import type {
  ActivityRecord,
  BackgroundRecord,
  CityRecord,
  CopywritingRecord,
  DimensionGroupRecord,
  DimensionOptionRecord,
  FishSpeciesRecord,
  ForestCatalog,
} from "~~/src/lib/moyu-types";
import { prisma } from "~~/src/lib/prisma";
import { groupDimensionKeys, selectRuntimeCopyEntries } from "~~/src/lib/moyu-content-runtime";
import { buildStaticForestCatalog } from "~~/src/lib/moyu-static-catalog";

import { ensureMoyuSeedData } from "~~/src/lib/moyu-content-seeder";
export { ensureMoyuSeedData };

async function loadForestCatalog(): Promise<ForestCatalog> {
  await ensureMoyuSeedData();

  const [activities, dimensionGroups, backgrounds, copyEntries, cities, fishes] = await Promise.all([
    prisma.momentActivity.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
    }),
    prisma.dimensionGroup.findMany({
      orderBy: {
        sortOrder: "asc",
      },
      include: {
        options: {
          where: {
            isActive: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    }),
    prisma.backgroundAsset.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        activity: true,
        dimensions: {
          include: {
            option: {
              include: {
                group: true,
              },
            },
          },
        },
      },
    }),
    prisma.copywritingEntry.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
      include: {
        activity: true,
        dimensions: {
          include: {
            option: {
              include: {
                group: true,
              },
            },
          },
        },
      },
    }),
    prisma.cityGuide.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
      include: {
        snacks: {
          where: {
            isActive: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    }),
    prisma.fishSpecies.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
      select: {
        id: true,
        slug: true,
        commonNameZh: true,
        commonNameEn: true,
        scientificName: true,
        habitatLabel: true,
        summary: true,
        habits: true,
        distribution: true,
        imagePath: true,
        chinaProtectionStatus: true,
        citesAppendix: true,
        threeHaveStatus: true,
        toxicityStatus: true,
        edibilityStatus: true,
        legalReviewedAt: true,
      },
    }),
  ]);

  const runtimeCopyEntries = selectRuntimeCopyEntries(
    copyEntries.map((entry): CopywritingRecord => ({
      id: entry.id,
      slug: entry.slug,
      kind: entry.kind,
      title: entry.title,
      content: entry.content,
      notes: entry.notes,
      activitySlug: entry.activity?.slug ?? null,
      minDurationSec: entry.minDurationSec,
      maxDurationSec: entry.maxDurationSec,
      weight: entry.weight,
      dropRate: entry.dropRate,
      dimensionOptionIds: entry.dimensions.map((item) => item.optionId),
      dimensionKeys: groupDimensionKeys(entry.dimensions),
    })),
  );

  return {
    activities: activities.map((activity): ActivityRecord => ({
      id: activity.id,
      slug: activity.slug,
      name: activity.name,
      iconKey: activity.iconKey,
      description: activity.description,
      prompt: activity.prompt,
      colorStart: activity.colorStart,
      colorEnd: activity.colorEnd,
    })),
    dimensionGroups: dimensionGroups.map((group): DimensionGroupRecord => ({
      id: group.id,
      key: group.key,
      label: group.label,
      kind: group.kind,
      description: group.description,
      options: group.options.map((option): DimensionOptionRecord => ({
        id: option.id,
        groupKey: group.key,
        groupLabel: group.label,
        kind: group.kind,
        slug: option.slug,
        label: option.label,
        description: option.description,
      })),
    })),
    backgrounds: backgrounds.map((background): BackgroundRecord => ({
      id: background.id,
      slug: background.slug,
      title: background.title,
      imagePath: background.imagePath,
      sourceName: background.sourceName,
      sourcePageUrl: background.sourcePageUrl,
      photographerName: background.photographerName,
      licenseLabel: background.licenseLabel,
      blurColor: background.blurColor,
      description: background.description,
      activitySlug: background.activity?.slug ?? null,
      dimensionOptionIds: background.dimensions.map((entry) => entry.optionId),
      dimensionKeys: groupDimensionKeys(background.dimensions),
    })),
    copyEntries: runtimeCopyEntries,
    cities: cities.map((city): CityRecord => ({
      id: city.id,
      slug: city.slug,
      name: city.name,
      description: city.description,
      snacks: city.snacks.map((snack) => ({
        id: snack.id,
        slug: snack.slug,
        name: snack.name,
        unitLabel: snack.unitLabel,
        priceCents: snack.priceCents,
        description: snack.description,
      })),
    })),
    fishes: fishes.map((fish): FishSpeciesRecord => ({
      id: fish.id,
      slug: fish.slug,
      commonNameZh: fish.commonNameZh,
      commonNameEn: fish.commonNameEn,
      scientificName: fish.scientificName,
      habitatLabel: fish.habitatLabel,
      summary: fish.summary,
      habits: fish.habits,
      distribution: fish.distribution,
      imagePath: fish.imagePath,
      chinaProtectionStatus: fish.chinaProtectionStatus as FishSpeciesRecord["chinaProtectionStatus"],
      citesAppendix: fish.citesAppendix as FishSpeciesRecord["citesAppendix"],
      threeHaveStatus: fish.threeHaveStatus as FishSpeciesRecord["threeHaveStatus"],
      toxicityStatus: fish.toxicityStatus as FishSpeciesRecord["toxicityStatus"],
      edibilityStatus: fish.edibilityStatus as FishSpeciesRecord["edibilityStatus"],
      legalReviewedAt: fish.legalReviewedAt,
    })),
  };
}

let cachedForestCatalog: { expiresAt: number; value: ForestCatalog } | null = null;
let pendingForestCatalog: Promise<ForestCatalog> | null = null;

export async function getForestCatalog(): Promise<ForestCatalog> {
  if (process.env.FOREST_STATIC_PREVIEW === "1" && process.env.NODE_ENV !== "production") {
    return buildStaticForestCatalog();
  }

  if (cachedForestCatalog && cachedForestCatalog.expiresAt > Date.now()) {
    return cachedForestCatalog.value;
  }

  // ponytail: one process-local five-minute cache is enough; move this to shared storage only when multi-node freshness matters.
  pendingForestCatalog ??= loadForestCatalog().then((value) => {
    cachedForestCatalog = { expiresAt: Date.now() + 300_000, value };
    return value;
  }).finally(() => {
    pendingForestCatalog = null;
  });

  return pendingForestCatalog;
}

export async function getOperatorConsoleData() {
  await ensureMoyuSeedData();

  const catalog = await getForestCatalog();
  const [allActivities, allBackgrounds, allCopyEntries, allCities, allFishes] = await Promise.all([
    prisma.momentActivity.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.backgroundAsset.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        activity: true,
        dimensions: true,
      },
    }),
    prisma.copywritingEntry.findMany({
      orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
      include: {
        activity: true,
        dimensions: true,
      },
    }),
    prisma.cityGuide.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        snacks: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    }),
    prisma.fishSpecies.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  return {
    catalog,
    activities: allActivities,
    backgrounds: allBackgrounds,
    copyEntries: allCopyEntries,
    cities: allCities,
    fishes: allFishes,
  };
}
