import type {
  ActivityRecord,
  BackgroundRecord,
  CollectedCard,
  CopywritingRecord,
  ForestCatalog,
  GuestForestStore,
  GuestProfile,
  MomentRecord,
} from "@/lib/gap-types";

const MOMENT_VALUE_CENTS_PER_SECOND = 6;
const RECENT_COPY_LIMIT = 8;
const RECORD_LIMIT = 40;
const CARD_LIMIT = 40;

export function createEmptyGuestStore(): GuestForestStore {
  return {
    profile: {
      citySlug: null,
      industrySlug: null,
      hasSeenOnboarding: false,
    },
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

  return {
    profile: {
      citySlug: typeof profile.citySlug === "string" ? profile.citySlug : null,
      industrySlug: typeof profile.industrySlug === "string" ? profile.industrySlug : null,
      hasSeenOnboarding: Boolean(profile.hasSeenOnboarding),
    },
    recentCopyIds: Array.isArray(candidate.recentCopyIds)
      ? candidate.recentCopyIds.filter((item): item is string => typeof item === "string").slice(0, RECENT_COPY_LIMIT)
      : [],
    records: Array.isArray(candidate.records)
      ? candidate.records.filter(isMomentRecord).slice(0, RECORD_LIMIT)
      : [],
    cards: Array.isArray(candidate.cards)
      ? candidate.cards.filter(isCollectedCard).slice(0, CARD_LIMIT)
      : [],
  };
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

export function pickGreetingEntry(catalog: ForestCatalog, profile: GuestProfile, date = new Date()) {
  return (
    pickCopyByContext(catalog.copyEntries, {
      kind: "GREETING",
      activitySlug: null,
      durationSec: null,
      industrySlug: profile.industrySlug,
      timeOfDaySlug: getTimeOfDaySlug(date),
      recentCopyIds: [],
    }) ?? null
  );
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
  return (
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
    title: selected.title,
    content: selected.content,
    collectedAt: date.toISOString(),
    backgroundSlug,
  } satisfies CollectedCard;
}

export function buildSnackSummary(catalog: ForestCatalog, citySlug: string | null, durationSec: number) {
  if (!citySlug) {
    return null;
  }

  const city = catalog.cities.find((item) => item.slug === citySlug);

  if (!city || city.snacks.length === 0) {
    return null;
  }

  const attentionCents = Math.max(200, Math.round(durationSec * MOMENT_VALUE_CENTS_PER_SECOND));
  const snack = city.snacks[attentionCents % city.snacks.length];
  const ratio = attentionCents / snack.priceCents;

  return `大约相当于 ${formatSnackRatio(ratio)} ${snack.unitLabel}${city.name}的${snack.name}`;
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
    recentCopyIds: [result.copy.id, ...store.recentCopyIds.filter((item) => item !== result.copy.id)].slice(
      0,
      RECENT_COPY_LIMIT,
    ),
    records: [record, ...store.records].slice(0, RECORD_LIMIT),
    cards: result.droppedCard ? [result.droppedCard, ...store.cards].slice(0, CARD_LIMIT) : store.cards,
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

  if (context.recentCopyIds.includes(entry.id)) {
    score = Math.floor(score * 0.2);
  }

  return score;
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
  if (value >= 10) {
    return `${Math.round(value)}`;
  }

  if (value >= 1) {
    return value.toFixed(1);
  }

  return value.toFixed(2);
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
    typeof candidate.copyContent === "string"
  );
}
