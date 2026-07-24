import type {
  ActivityRecord,
  BackgroundRecord,
  CollectedCard,
  CopywritingRecord,
  FishSpeciesRecord,
  ForestCatalog,
  GuestForestStore,
  GuestProfile,
  MomentRecord,
} from "./moyu-types";
import { moyuSemanticPreferencesByActivity } from "./moyu-semantics";
import { packFoodBudget, type FoodBackpackItem } from "./food-backpack";
import { regionalCatalog } from "./regional-catalog";

const MOMENT_VALUE_CENTS_PER_SECOND = 6;
const RECENT_COPY_LIMIT = 8;
const RECORD_LIMIT = 40;
export const COLLECTED_CARD_LIMIT = 240;

export function createEmptyGuestStore(): GuestForestStore {
  return {
    profile: {
      provinceCode: null,
      provinceName: null,
      cityCode: null,
      citySlug: null,
      cityName: null,
      districtCode: null,
      districtName: null,
      industrySlug: null,
      industryName: null,
      hasSeenOnboarding: false,
    },
    totalAttentionCents: 0,
    recentCopyIds: [],
    records: [],
    cards: [],
  };
}

export function sanitizeGuestStore(value: unknown): GuestForestStore {
  const empty = createEmptyGuestStore();

  if (!value || typeof value !== "object") {
    return empty;
  }

  const candidate = value as Partial<GuestForestStore>;
  const profile = candidate.profile ?? empty.profile;
  const records = Array.isArray(candidate.records)
    ? candidate.records
      .filter(isMomentRecord)
      .slice(0, RECORD_LIMIT)
      .map((record) => ({
        ...record,
        copyTitle: stripTerminalPeriod(record.copyTitle),
        copyContent: stripTerminalPeriod(record.copyContent),
        snackSummary: record.snackSummary ? stripTerminalPeriod(record.snackSummary) : null,
      }))
    : [];
  const totalAttentionCents =
    typeof candidate.totalAttentionCents === "number" && Number.isFinite(candidate.totalAttentionCents)
      ? Math.max(0, Math.round(candidate.totalAttentionCents))
      : records.reduce((total, record) => total + getMomentAttentionCents(record.durationSec), 0);

  return {
    profile: {
      provinceCode: safeProfileString(profile.provinceCode, 12),
      provinceName: safeProfileString(profile.provinceName, 32),
      cityCode: safeProfileString(profile.cityCode, 12),
      citySlug: typeof profile.citySlug === "string" ? profile.citySlug : null,
      cityName: typeof profile.cityName === "string" ? profile.cityName.slice(0, 32) : null,
      districtCode: safeProfileString(profile.districtCode, 12),
      districtName: safeProfileString(profile.districtName, 32),
      industrySlug: typeof profile.industrySlug === "string" ? profile.industrySlug : null,
      industryName: typeof profile.industryName === "string" ? profile.industryName.slice(0, 32) : null,
      hasSeenOnboarding: Boolean(profile.hasSeenOnboarding),
    },
    totalAttentionCents,
    recentCopyIds: Array.isArray(candidate.recentCopyIds)
      ? candidate.recentCopyIds.filter((item): item is string => typeof item === "string").slice(0, RECENT_COPY_LIMIT)
      : [],
    records,
    cards: Array.isArray(candidate.cards)
      ? candidate.cards
        .filter(isCollectedCard)
        .slice(0, COLLECTED_CARD_LIMIT)
        .map((card) => ({
          ...card,
          title: stripTerminalPeriod(card.title),
          content: stripTerminalPeriod(card.content),
        }))
      : [],
  };
}

function stripTerminalPeriod(value: string) {
  return value.replace(/。+$/u, "");
}

export function getTimeOfDaySlug(date = new Date()) {
  const hour = date.getHours();

  if (hour >= 5 && hour <= 10) {
    return "dawn";
  }

  if (hour >= 11 && hour <= 15) {
    return "day";
  }

  if (hour >= 16 && hour <= 19) {
    return "dusk";
  }

  return "night";
}

export function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  if (!minutes) {
    return `${seconds} 秒`;
  }

  return `${minutes} 分 ${String(seconds).padStart(2, "0")} 秒`;
}

export function getPlaceInvitation(date = new Date()) {
  const hour = date.getHours();
  if (hour < 5 || hour >= 22) {
    return {
      title: "今晚的风很轻，刚好够你松开一点",
      detail: "这里不问后来，也不催你回去",
    };
  }
  if (hour < 11) {
    return {
      title: "雾还没散，先把自己放在这里",
      detail: "这一小段时间，不用去往哪里",
    };
  }
  if (hour < 17) {
    return {
      title: "把脚边的浪声借给你一会儿",
      detail: "潮水来了又走，什么也不催",
    };
  }
  return {
    title: "火光替你守着这一小段空白",
    detail: "坐下来，手里的事会晚一点",
  };
}

export function pickBackground(
  catalog: ForestCatalog,
  activitySlug: string | null,
  profile: GuestProfile,
  date = new Date(),
) {
  const timeOfDaySlug = getTimeOfDaySlug(date);
  const candidates = catalog.backgrounds
    .map((background) => ({
      background,
      score: scoreBackground(background, activitySlug, timeOfDaySlug, profile.industrySlug),
    }))
    .filter((item) => item.score > 0);

  return pickWeighted(
    candidates.map((item) => ({
      item: item.background,
      weight: item.score,
    })),
  );
}

export function pickResultCopy(
  catalog: ForestCatalog,
  activitySlug: string,
  durationSec: number,
  profile: GuestProfile,
  recentCopyIds: string[],
  date = new Date(),
) {
  const selected = (
    pickCopyByContext(catalog.copyEntries, {
      kind: "RESULT",
      activitySlug,
      durationSec,
      industrySlug: profile.industrySlug,
      timeOfDaySlug: getTimeOfDaySlug(date),
      recentCopyIds,
    }) ??
    catalog.copyEntries.find(
      (entry) => entry.kind === "RESULT" && (entry.activitySlug === activitySlug || entry.activitySlug === null),
    ) ??
    null
  );
  return selected
    ? {
        ...selected,
        title: stripTerminalPeriod(selected.title),
        content: stripTerminalPeriod(selected.content),
      }
    : null;
}

export function maybeDropCard(
  catalog: ForestCatalog,
  activity: ActivityRecord,
  profile: GuestProfile,
  date = new Date(),
  backgroundSlug: string | null = null,
) {
  const selected = pickCopyByContext(catalog.copyEntries, {
    kind: "CARD",
    activitySlug: activity.slug,
    durationSec: null,
    industrySlug: profile.industrySlug,
    timeOfDaySlug: getTimeOfDaySlug(date),
    recentCopyIds: [],
  });

  if (!selected) {
    return null;
  }

  const chance = Math.max(0, Math.min(100, selected.dropRate || 20));

  if (Math.random() * 100 >= chance) {
    return null;
  }

  return {
    id: `card_${selected.id}_${date.getTime()}`,
    copyId: selected.id,
    title: stripTerminalPeriod(selected.title),
    content: stripTerminalPeriod(selected.content),
    collectedAt: date.toISOString(),
    backgroundSlug,
  } satisfies CollectedCard;
}

export function getMomentAttentionCents(durationSec: number) {
  return Math.max(0, Math.round(Math.max(0, durationSec) * MOMENT_VALUE_CENTS_PER_SECOND));
}

export function buildSnackSummary(profile: GuestProfile, durationSec: number) {
  const attentionCents = Math.max(200, getMomentAttentionCents(durationSec));
  const localFoods = regionalCatalog.foods.find((entry) => entry.citySlug === profile.citySlug)?.items;
  const foods = localFoods?.length ? localFoods : regionalCatalog.genericFoods;
  const parts = buildFoodEquivalent(foods, attentionCents, Boolean(localFoods?.length));
  const place = profile.cityName ? `${profile.cityName}这一带` : "通用城市";

  return `${place}的这段摸鱼时光，约合 ${parts.join("、")}`;
}

export function buildFoodBackpack(profile: GuestProfile, totalAttentionCents: number): FoodBackpackItem[] {
  const localFoods = regionalCatalog.foods.find((entry) => entry.citySlug === profile.citySlug)?.items;
  const cola = regionalCatalog.genericFoods.find((food) => food.name === "可乐");
  const foods = localFoods?.length ? [...localFoods, ...(cola ? [cola] : [])] : regionalCatalog.genericFoods;
  return packFoodBudget(foods, totalAttentionCents);
}

export function appendResultToStore(
  store: GuestForestStore,
  result: {
    activity: ActivityRecord;
    durationSec: number;
    copy: CopywritingRecord;
    snackSummary: string | null;
    backgroundSlug: string | null;
    droppedCard: CollectedCard | null;
    endedAt?: Date;
    startedAt?: Date;
  },
) {
  const endedAt = result.endedAt ?? new Date();
  const startedAt = result.startedAt ?? new Date(endedAt.getTime() - result.durationSec * 1000);
  const record: MomentRecord = {
    id: `record_${result.copy.id}_${endedAt.getTime()}`,
    activitySlug: result.activity.slug,
    activityName: result.activity.name,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationSec: result.durationSec,
    copyId: result.copy.id,
    copyTitle: result.copy.title,
    copyContent: result.copy.content,
    backgroundSlug: result.backgroundSlug,
    snackSummary: result.snackSummary,
    droppedCardId: result.droppedCard?.id ?? null,
  };

  return {
    ...store,
    totalAttentionCents: store.totalAttentionCents + getMomentAttentionCents(result.durationSec),
    recentCopyIds: [result.copy.id, ...store.recentCopyIds.filter((item) => item !== result.copy.id)].slice(
      0,
      RECENT_COPY_LIMIT,
    ),
    records: [record, ...store.records].slice(0, RECORD_LIMIT),
    cards: result.droppedCard ? [result.droppedCard, ...store.cards].slice(0, COLLECTED_CARD_LIMIT) : store.cards,
  } satisfies GuestForestStore;
}

export function appendFishViewingToStore(
  store: GuestForestStore,
  result: {
    fish: FishSpeciesRecord;
    durationSec: number;
    snackSummary: string;
    endedAt: Date;
    startedAt: Date;
  },
) {
  const record: MomentRecord = {
    id: `record_fish_${result.fish.slug}_${result.endedAt.getTime()}`,
    activitySlug: "fish-viewing",
    activityName: "看鱼",
    startedAt: result.startedAt.toISOString(),
    endedAt: result.endedAt.toISOString(),
    durationSec: result.durationSec,
    copyId: `fish:${result.fish.slug}`,
    copyTitle: result.fish.scientificName,
    copyContent: stripTerminalPeriod(result.fish.summary),
    backgroundSlug: null,
    snackSummary: result.snackSummary,
    droppedCardId: null,
    fishSlug: result.fish.slug,
    fishName: result.fish.commonNameZh,
    fishImagePath: result.fish.imagePath,
  };

  return {
    ...store,
    totalAttentionCents: store.totalAttentionCents + getMomentAttentionCents(result.durationSec),
    records: [record, ...store.records].slice(0, RECORD_LIMIT),
  } satisfies GuestForestStore;
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

type CopyMatchContext = {
  kind: CopywritingRecord["kind"];
  activitySlug: string | null;
  durationSec: number | null;
  industrySlug: string | null;
  timeOfDaySlug: string;
  recentCopyIds: string[];
};

function pickCopyByContext(entries: CopywritingRecord[], context: CopyMatchContext) {
  const weighted = entries
    .filter((entry) => entry.kind === context.kind)
    .map((entry) => ({
      item: entry,
      weight: scoreCopyEntry(entry, context),
    }))
    .filter((entry) => entry.weight > 0);

  return pickWeighted(weighted);
}

function scoreCopyEntry(entry: CopywritingRecord, context: CopyMatchContext) {
  if (
    context.durationSec != null &&
    ((entry.minDurationSec != null && context.durationSec < entry.minDurationSec) ||
      (entry.maxDurationSec != null && context.durationSec > entry.maxDurationSec))
  ) {
    return 0;
  }

  let score = Math.max(10, entry.weight);

  if (context.activitySlug) {
    if (entry.activitySlug === context.activitySlug) {
      score += 120;
    } else if (entry.activitySlug === null) {
      score += 40;
    } else {
      return 0;
    }
  }

  score += scoreDimension(entry.dimensionKeys.time_of_day, context.timeOfDaySlug, 60);
  score += scoreDimension(entry.dimensionKeys.industry, context.industrySlug, 45);
  score += scoreSemanticContext(entry, context);

  if (context.recentCopyIds.includes(entry.id)) {
    score = Math.floor(score * 0.2);
  }

  return score;
}

const semanticPreferencesByTime: Record<string, { scene: string[]; emotional_core: string[]; energy: string[] }> = {
  dawn: {
    scene: ["threshold", "nature"],
    emotional_core: ["joy", "wonder", "relief"],
    energy: ["bright", "open"],
  },
  day: {
    scene: ["human_world", "companionship"],
    emotional_core: ["resilience", "joy", "relief"],
    energy: ["grounded", "bright"],
  },
  dusk: {
    scene: ["memory", "threshold", "companionship"],
    emotional_core: ["longing", "belonging", "tenderness"],
    energy: ["soft", "flowing"],
  },
  night: {
    scene: ["solitude", "inner_world", "spiritual"],
    emotional_core: ["serenity", "melancholy", "wonder", "mortality"],
    energy: ["still", "soft"],
  },
};

function scoreSemanticContext(entry: CopywritingRecord, context: CopyMatchContext) {
  let score = 0;
  const activity = context.activitySlug
    ? moyuSemanticPreferencesByActivity[context.activitySlug as keyof typeof moyuSemanticPreferencesByActivity]
    : null;
  if (activity) {
    score += scoreTagOverlap(entry.dimensionKeys.scene, activity.scene, 8);
    score += scoreTagOverlap(entry.dimensionKeys.emotional_core, activity.emotional_core, 10);
    score += scoreTagOverlap(entry.dimensionKeys.psychological_need, activity.psychological_need, 9);
    score += scoreTagOverlap(entry.dimensionKeys.literary_gesture, activity.literary_gesture, 6);
    score += scoreTagOverlap(entry.dimensionKeys.energy, activity.energy, 7);
  }

  const time = semanticPreferencesByTime[context.timeOfDaySlug];
  if (time) {
    score += scoreTagOverlap(entry.dimensionKeys.scene, time.scene, 5);
    score += scoreTagOverlap(entry.dimensionKeys.emotional_core, time.emotional_core, 7);
    score += scoreTagOverlap(entry.dimensionKeys.energy, time.energy, 5);
  }

  if (context.durationSec != null && context.durationSec <= 60) {
    score += scoreTagOverlap(entry.dimensionKeys.psychological_need, ["permission", "rest", "release"], 5);
    score += scoreTagOverlap(entry.dimensionKeys.energy, ["still", "soft", "open"], 4);
  } else if (context.durationSec != null && context.durationSec >= 180) {
    score += scoreTagOverlap(entry.dimensionKeys.psychological_need, ["perspective", "meaning", "renewal", "courage"], 5);
    score += scoreTagOverlap(entry.dimensionKeys.energy, ["flowing", "bright", "grounded", "open"], 4);
  }

  return score;
}

function scoreTagOverlap(actual: string[] | undefined, desired: readonly string[], pointsPerMatch: number) {
  if (!actual?.length) return 0;
  return actual.filter((value) => desired.includes(value)).length * pointsPerMatch;
}

function scoreBackground(
  background: BackgroundRecord,
  activitySlug: string | null,
  timeOfDaySlug: string,
  industrySlug: string | null,
) {
  let score = 12;

  if (activitySlug) {
    if (background.activitySlug === activitySlug) {
      score += 60;
    } else if (background.activitySlug === null) {
      score += 18;
    } else {
      return 0;
    }
  }

  score += scoreDimension(background.dimensionKeys.time_of_day, timeOfDaySlug, 40);
  score += scoreDimension(background.dimensionKeys.industry, industrySlug, 20);

  return score;
}

function scoreDimension(optionSlugs: string[] | undefined, desiredSlug: string | null, matchedScore: number) {
  if (!optionSlugs || optionSlugs.length === 0) {
    return 6;
  }

  if (!desiredSlug) {
    return 0;
  }

  return optionSlugs.includes(desiredSlug) ? matchedScore : -12;
}

function pickWeighted<T>(items: Array<{ item: T; weight: number }>) {
  if (items.length === 0) {
    return null;
  }

  const total = items.reduce((sum, current) => sum + Math.max(1, current.weight), 0);
  let cursor = Math.random() * total;

  for (const entry of items) {
    cursor -= Math.max(1, entry.weight);

    if (cursor <= 0) {
      return entry.item;
    }
  }

  return items[items.length - 1]?.item ?? null;
}

function formatSnackRatio(value: number) {
  if (Number.isInteger(value)) {
    return `${value}`;
  }

  if (value >= 10) {
    return `${Math.round(value)}`;
  }

  if (value >= 1) {
    return value.toFixed(1);
  }

  return value.toFixed(2);
}

function buildFoodEquivalent(
  foods: Array<{ name: string; unit: string; priceCents: number }>,
  budgetCents: number,
  hasLocalFoods: boolean,
) {
  const primary = foods[0];
  const secondary = foods[1];

  if (!primary) return ["一份短暂的喘息"];
  if (budgetCents < primary.priceCents || !secondary) {
    return [`${formatFoodAmount(budgetCents / primary.priceCents, primary.unit)}${primary.name}`];
  }

  const secondaryReserve = secondary.priceCents / 2;
  const primaryCount = Math.max(1, Math.floor((budgetCents - secondaryReserve) / primary.priceCents));
  let remainder = budgetCents - primaryCount * primary.priceCents;
  const result = [`${formatFoodAmount(primaryCount, primary.unit)}${primary.name}`];
  const cola = hasLocalFoods ? regionalCatalog.genericFoods.find((food) => food.name === "可乐") : null;
  const colaReserve =
    cola && secondary.unit !== "瓶" && remainder >= secondary.priceCents / 2 + cola.priceCents
      ? cola.priceCents
      : 0;
  const secondaryCount = Math.floor(((remainder - colaReserve) / secondary.priceCents) * 2) / 2;

  if (secondaryCount >= 0.5) {
    result.push(`${formatFoodAmount(secondaryCount, secondary.unit)}${secondary.name}`);
    remainder -= secondaryCount * secondary.priceCents;
  }

  if (cola && remainder >= cola.priceCents) {
    result.push(`还能捎带${formatFoodAmount(1, cola.unit)}${cola.name}`);
  }

  return result;
}

function formatFoodAmount(value: number, unit: string) {
  const rounded = Math.max(0.1, Math.round(value * 10) / 10);
  if (rounded === 0.5) return `半${unit}`;
  if (rounded === 1) return `一${unit}`;
  if (rounded === 2) return `两${unit}`;
  return `${formatSnackRatio(rounded)}${unit}`;
}

function safeProfileString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.slice(0, maxLength) : null;
}

function isCollectedCard(value: unknown): value is CollectedCard {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as CollectedCard;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.copyId === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.content === "string" &&
    typeof candidate.collectedAt === "string"
  );
}

function isMomentRecord(value: unknown): value is MomentRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as MomentRecord;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.activitySlug === "string" &&
    typeof candidate.activityName === "string" &&
    typeof candidate.startedAt === "string" &&
    typeof candidate.endedAt === "string" &&
    typeof candidate.durationSec === "number" &&
    typeof candidate.copyId === "string" &&
    typeof candidate.copyTitle === "string" &&
    typeof candidate.copyContent === "string" &&
    (candidate.fishSlug == null || typeof candidate.fishSlug === "string") &&
    (candidate.fishName == null || typeof candidate.fishName === "string") &&
    (candidate.fishImagePath == null || (
      typeof candidate.fishImagePath === "string" && candidate.fishImagePath.startsWith("/assets/fishes/")
    ))
  );
}
