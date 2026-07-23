import { prisma } from "~~/src/lib/prisma";
import {
  activitySeeds,
  backgroundSeeds,
  citySeeds,
  copySeeds,
  corpusCopyPrefix,
  dimensionGroupSeeds,
  expectedDimensionOptionCount,
  expectedGeneratedDimensionLinkCount,
  fishSpeciesSeeds,
  forumCopyPrefix,
  generatedCopySeeds,
  legacyGeneratedCopySlugs,
} from "~~/src/lib/moyu-content-seeds";
import {
  assertMoyuModelDelegates,
  buildActivityIdMap,
  buildDimensionOptionIdMap,
  syncBackgroundDimensions,
  syncCopyDimensions,
} from "~~/src/lib/moyu-content-seeder-utils";

export async function ensureMoyuSeedData() {
  assertMoyuModelDelegates();

  const [
    activityCount,
    copyCount,
    backgroundCount,
    cityCount,
    groupCount,
    dimensionOptionCount,
    managedCopyCount,
    generatedCopyCount,
    generatedDimensionLinkCount,
    staleGeneratedCopyCount,
    legacyActiveCount,
    fishSpeciesCount,
    reviewedFishSpeciesCount,
  ] = await Promise.all([
    prisma.momentActivity.count(),
    prisma.copywritingEntry.count(),
    prisma.backgroundAsset.count(),
    prisma.cityGuide.count(),
    prisma.dimensionGroup.count(),
    prisma.dimensionOption.count({
      where: {
        isActive: true,
        group: { key: { in: dimensionGroupSeeds.map((group) => group.key) } },
      },
    }),
    prisma.copywritingEntry.count({ where: { slug: { in: copySeeds.map((entry) => entry.slug) } } }),
    prisma.copywritingEntry.count({
      where: {
        OR: [{ slug: { startsWith: corpusCopyPrefix } }, { slug: { startsWith: forumCopyPrefix } }],
        isActive: true,
      },
    }),
    prisma.copywritingEntryDimension.count({
      where: {
        copywritingEntry: {
          OR: [{ slug: { startsWith: corpusCopyPrefix } }, { slug: { startsWith: forumCopyPrefix } }],
        },
      },
    }),
    prisma.copywritingEntry.count({
      where: {
        OR: [{ slug: { startsWith: "corpus-" } }, { slug: { startsWith: "forum-" } }],
        NOT: {
          OR: [{ slug: { startsWith: corpusCopyPrefix } }, { slug: { startsWith: forumCopyPrefix } }],
        },
      },
    }),
    prisma.copywritingEntry.count({ where: { slug: { in: legacyGeneratedCopySlugs }, isActive: true } }),
    prisma.fishSpecies.count({ where: { isActive: true } }),
    prisma.fishSpecies.count({ where: { isActive: true, legalReviewedAt: "2026-07-21" } }),
  ]);

  if (
    activityCount > 0 &&
    copyCount > 0 &&
    backgroundCount >= backgroundSeeds.length &&
    cityCount > 0 &&
    groupCount >= dimensionGroupSeeds.length &&
    dimensionOptionCount === expectedDimensionOptionCount &&
    managedCopyCount === copySeeds.length &&
    generatedCopyCount === generatedCopySeeds.length &&
    generatedDimensionLinkCount === expectedGeneratedDimensionLinkCount &&
    staleGeneratedCopyCount === 0 &&
    legacyActiveCount === 0 &&
    fishSpeciesCount === fishSpeciesSeeds.length &&
    reviewedFishSpeciesCount === fishSpeciesSeeds.length
  ) {
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.copywritingEntry.updateMany({
        where: { slug: { in: legacyGeneratedCopySlugs } },
        data: { isActive: false },
      });

      for (const activity of activitySeeds) {
      await tx.momentActivity.upsert({
        where: {
          slug: activity.slug,
        },
        update: {
          name: activity.name,
          iconKey: activity.iconKey,
          description: activity.description,
          prompt: activity.prompt,
          colorStart: activity.colorStart,
          colorEnd: activity.colorEnd,
          sortOrder: activity.sortOrder,
          isActive: true,
        },
        create: {
          slug: activity.slug,
          name: activity.name,
          iconKey: activity.iconKey,
          description: activity.description,
          prompt: activity.prompt,
          colorStart: activity.colorStart,
          colorEnd: activity.colorEnd,
          sortOrder: activity.sortOrder,
          isActive: true,
        },
      });
      }

      for (const group of dimensionGroupSeeds) {
      const createdGroup = await tx.dimensionGroup.upsert({
        where: {
          key: group.key,
        },
        update: {
          label: group.label,
          description: group.description,
          kind: group.kind,
          sortOrder: dimensionGroupSeeds.findIndex((item) => item.key === group.key) + 1,
        },
        create: {
          key: group.key,
          label: group.label,
          description: group.description,
          kind: group.kind,
          sortOrder: dimensionGroupSeeds.findIndex((item) => item.key === group.key) + 1,
        },
      });

      for (let index = 0; index < group.options.length; index += 1) {
        const option = group.options[index]!;
        await tx.dimensionOption.upsert({
          where: {
            groupId_slug: {
              groupId: createdGroup.id,
              slug: option.slug,
            },
          },
          update: {
            label: option.label,
            description: option.description ?? null,
            sortOrder: index + 1,
            isActive: true,
          },
          create: {
            groupId: createdGroup.id,
            slug: option.slug,
            label: option.label,
            description: option.description ?? null,
            sortOrder: index + 1,
            isActive: true,
          },
        });
      }
      }

      for (const city of citySeeds) {
      const createdCity = await tx.cityGuide.upsert({
        where: {
          slug: city.slug,
        },
        update: {
          name: city.name,
          description: city.description,
          sortOrder: citySeeds.findIndex((item) => item.slug === city.slug) + 1,
          isActive: true,
        },
        create: {
          slug: city.slug,
          name: city.name,
          description: city.description,
          sortOrder: citySeeds.findIndex((item) => item.slug === city.slug) + 1,
          isActive: true,
        },
      });

      for (const snack of city.snacks) {
        await tx.citySnack.upsert({
          where: {
            cityId_slug: {
              cityId: createdCity.id,
              slug: snack.slug,
            },
          },
          update: {
            name: snack.name,
            unitLabel: snack.unitLabel,
            priceCents: snack.priceCents,
            description: snack.description ?? null,
            sortOrder: snack.sortOrder,
            isActive: true,
          },
          create: {
            cityId: createdCity.id,
            slug: snack.slug,
            name: snack.name,
            unitLabel: snack.unitLabel,
            priceCents: snack.priceCents,
            description: snack.description ?? null,
            sortOrder: snack.sortOrder,
            isActive: true,
          },
        });
      }
      }

      if (fishSpeciesCount === 0) {
        await tx.fishSpecies.createMany({
          data: fishSpeciesSeeds.map((fish) => ({
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
            chinaProtectionNote: fish.chinaProtectionNote,
            chinaProtectionBasis: fish.chinaProtectionBasis,
            chinaProtectionSourceUrl: fish.chinaProtectionSourceUrl,
            citesAppendix: fish.citesAppendix,
            citesNote: fish.citesNote,
            citesSourceUrl: fish.citesSourceUrl,
            threeHaveStatus: fish.threeHaveStatus,
            threeHaveNote: fish.threeHaveNote,
            toxicityStatus: fish.toxicityStatus,
            toxicityNote: fish.toxicityNote,
            edibilityStatus: fish.edibilityStatus,
            edibilityNote: fish.edibilityNote,
            legalReviewedAt: fish.legalReviewedAt,
            sourceName: fish.sourceName,
            sourcePageUrl: fish.sourcePageUrl,
            imageSourceName: fish.imageSourceName,
            imageSourcePageUrl: fish.imageSourcePageUrl,
            imageAuthor: fish.imageAuthor,
            licenseLabel: fish.licenseLabel,
            sortOrder: fish.sortOrder,
            isActive: true,
          })),
        });
      } else {
        for (const fish of fishSpeciesSeeds) {
          const data = {
            commonNameZh: fish.commonNameZh,
            commonNameEn: fish.commonNameEn,
            scientificName: fish.scientificName,
            habitatLabel: fish.habitatLabel,
            summary: fish.summary,
            habits: fish.habits,
            distribution: fish.distribution,
            imagePath: fish.imagePath,
            chinaProtectionStatus: fish.chinaProtectionStatus,
            chinaProtectionNote: fish.chinaProtectionNote,
            chinaProtectionBasis: fish.chinaProtectionBasis,
            chinaProtectionSourceUrl: fish.chinaProtectionSourceUrl,
            citesAppendix: fish.citesAppendix,
            citesNote: fish.citesNote,
            citesSourceUrl: fish.citesSourceUrl,
            threeHaveStatus: fish.threeHaveStatus,
            threeHaveNote: fish.threeHaveNote,
            toxicityStatus: fish.toxicityStatus,
            toxicityNote: fish.toxicityNote,
            edibilityStatus: fish.edibilityStatus,
            edibilityNote: fish.edibilityNote,
            legalReviewedAt: fish.legalReviewedAt,
            sourceName: fish.sourceName,
            sourcePageUrl: fish.sourcePageUrl,
            imageSourceName: fish.imageSourceName,
            imageSourcePageUrl: fish.imageSourcePageUrl,
            imageAuthor: fish.imageAuthor,
            licenseLabel: fish.licenseLabel,
            sortOrder: fish.sortOrder,
            isActive: true,
          };
          await tx.fishSpecies.upsert({
            where: { slug: fish.slug },
            update: data,
            create: { slug: fish.slug, ...data },
          });
        }
      }

      const activityMap = await buildActivityIdMap(tx);
      const optionMap = await buildDimensionOptionIdMap(tx);

      if (
        generatedCopyCount !== generatedCopySeeds.length ||
        generatedDimensionLinkCount !== expectedGeneratedDimensionLinkCount ||
        staleGeneratedCopyCount > 0
      ) {
        await tx.copywritingEntry.deleteMany({
          where: { OR: [{ slug: { startsWith: "corpus-" } }, { slug: { startsWith: "forum-" } }] },
        });
        await tx.copywritingEntry.createMany({
          data: generatedCopySeeds.map((copy) => ({
            slug: copy.slug,
            kind: copy.kind,
            title: copy.title,
            content: copy.content,
            notes: copy.notes ?? null,
            activityId: copy.activitySlug ? (activityMap.get(copy.activitySlug) ?? null) : null,
            weight: copy.weight ?? 100,
            dropRate: copy.dropRate ?? 0,
            isActive: true,
          })),
        });
        const savedGeneratedEntries = await tx.copywritingEntry.findMany({
          where: {
            OR: [{ slug: { startsWith: corpusCopyPrefix } }, { slug: { startsWith: forumCopyPrefix } }],
          },
          select: { id: true, slug: true },
        });
        const copySeedBySlug = new Map(generatedCopySeeds.map((entry) => [entry.slug, entry]));
        const dimensionLinks = savedGeneratedEntries.flatMap((entry) => {
          const refs = copySeedBySlug.get(entry.slug)?.dimensions ?? [];
          return refs.map((ref) => {
            const optionId = optionMap.get(ref);
            if (!optionId) throw new Error(`Unknown generated copy dimension: ${ref}`);
            return { copywritingEntryId: entry.id, optionId };
          });
        });
        await tx.copywritingEntryDimension.createMany({ data: dimensionLinks });
      }

      for (const background of backgroundSeeds) {
      const savedBackground = await tx.backgroundAsset.upsert({
        where: {
          slug: background.slug,
        },
        update: {
          title: background.title,
          imagePath: background.imagePath,
          sourceName: background.sourceName,
          sourcePageUrl: background.sourcePageUrl,
          photographerName: background.photographerName ?? null,
          licenseLabel: background.licenseLabel ?? null,
          blurColor: background.blurColor ?? null,
          description: background.description ?? null,
          activityId: background.activitySlug ? (activityMap.get(background.activitySlug) ?? null) : null,
          sortOrder: background.sortOrder ?? 0,
          isActive: true,
        },
        create: {
          slug: background.slug,
          title: background.title,
          imagePath: background.imagePath,
          sourceName: background.sourceName,
          sourcePageUrl: background.sourcePageUrl,
          photographerName: background.photographerName ?? null,
          licenseLabel: background.licenseLabel ?? null,
          blurColor: background.blurColor ?? null,
          description: background.description ?? null,
          activityId: background.activitySlug ? (activityMap.get(background.activitySlug) ?? null) : null,
          sortOrder: background.sortOrder ?? 0,
          isActive: true,
        },
      });

      await syncBackgroundDimensions(tx, savedBackground.id, background.dimensions ?? [], optionMap);
      }

      for (const copy of copySeeds) {
      const savedCopy = await tx.copywritingEntry.upsert({
        where: {
          slug: copy.slug,
        },
        update: {
          kind: copy.kind,
          title: copy.title,
          content: copy.content,
          notes: copy.notes ?? null,
          activityId: copy.activitySlug ? (activityMap.get(copy.activitySlug) ?? null) : null,
          minDurationSec: copy.minDurationSec ?? null,
          maxDurationSec: copy.maxDurationSec ?? null,
          weight: copy.weight ?? 100,
          dropRate: copy.dropRate ?? 0,
          isActive: true,
        },
        create: {
          slug: copy.slug,
          kind: copy.kind,
          title: copy.title,
          content: copy.content,
          notes: copy.notes ?? null,
          activityId: copy.activitySlug ? (activityMap.get(copy.activitySlug) ?? null) : null,
          minDurationSec: copy.minDurationSec ?? null,
          maxDurationSec: copy.maxDurationSec ?? null,
          weight: copy.weight ?? 100,
          dropRate: copy.dropRate ?? 0,
          isActive: true,
        },
      });

      await syncCopyDimensions(tx, savedCopy.id, copy.dimensions ?? [], optionMap);
      }
    },
    {
      maxWait: 10_000,
      timeout: 30_000,
    },
  );
}
