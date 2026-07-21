export type DimensionKind =
  | "TIME_OF_DAY"
  | "INDUSTRY"
  | "MOOD"
  | "STYLE"
  | "SOLAR_TERM"
  | "HOLIDAY"
  | "WEATHER"
  | "CARD_RARITY"
  | "GREETING_PHASE"
  | "SCENE"
  | "EMOTIONAL_CORE"
  | "PSYCHOLOGICAL_NEED"
  | "LITERARY_GESTURE"
  | "ENERGY"
  | "CONTENT_TONE"
  | "HOT_TOPIC";

export type CopywritingKind = "RESULT" | "CARD" | "GREETING" | "GUIDE";

export type DimensionOptionRecord = {
  id: string;
  groupKey: string;
  groupLabel: string;
  kind: DimensionKind;
  slug: string;
  label: string;
  description: string | null;
};

export type DimensionGroupRecord = {
  id: string;
  key: string;
  label: string;
  kind: DimensionKind;
  description: string | null;
  options: DimensionOptionRecord[];
};

export type ActivityRecord = {
  id: string;
  slug: string;
  name: string;
  iconKey: string;
  description: string | null;
  prompt: string | null;
  colorStart: string | null;
  colorEnd: string | null;
};

export type BackgroundRecord = {
  id: string;
  slug: string;
  title: string;
  imagePath: string;
  sourceName: string;
  sourcePageUrl: string;
  photographerName: string | null;
  licenseLabel: string | null;
  blurColor: string | null;
  description: string | null;
  activitySlug: string | null;
  dimensionOptionIds: string[];
  dimensionKeys: Record<string, string[]>;
};

export type CopywritingRecord = {
  id: string;
  slug: string;
  kind: CopywritingKind;
  title: string;
  content: string;
  notes: string | null;
  activitySlug: string | null;
  minDurationSec: number | null;
  maxDurationSec: number | null;
  weight: number;
  dropRate: number;
  dimensionOptionIds: string[];
  dimensionKeys: Record<string, string[]>;
};

export type SnackRecord = {
  id: string;
  slug: string;
  name: string;
  unitLabel: string;
  priceCents: number;
  description: string | null;
};

export type CityRecord = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  snacks: SnackRecord[];
};

export type ChinaProtectionStatus =
  | "NONE"
  | "NATIONAL_II"
  | "WILD_ONLY_NATIONAL_II"
  | "CITES_APPROVED_I"
  | "CITES_APPROVED_II"
  | "WILD_ONLY_CITES_APPROVED_II";

export type FishToxicityStatus =
  | "NONE_KNOWN"
  | "VENOMOUS"
  | "TOXIC_TISSUE"
  | "TOXIC_PART"
  | "ELECTRIC"
  | "CIGUATERA_RISK";

export type FishEdibilityStatus =
  | "EDIBLE"
  | "CONDITIONAL"
  | "NOT_RECOMMENDED"
  | "LEGAL_PROHIBITED"
  | "WILD_ONLY_PROHIBITED";

export type FishSpeciesRecord = {
  id: string;
  slug: string;
  commonNameZh: string;
  commonNameEn: string;
  scientificName: string;
  habitatLabel: string;
  summary: string;
  habits: string;
  distribution: string;
  imagePath: string;
  chinaProtectionStatus: ChinaProtectionStatus;
  citesAppendix: "I" | "II" | "NONE";
  threeHaveStatus: "NOT_APPLICABLE";
  toxicityStatus: FishToxicityStatus;
  edibilityStatus: FishEdibilityStatus;
  legalReviewedAt: string;
};

export type ForestCatalog = {
  activities: ActivityRecord[];
  dimensionGroups: DimensionGroupRecord[];
  backgrounds: BackgroundRecord[];
  copyEntries: CopywritingRecord[];
  cities: CityRecord[];
  fishes: FishSpeciesRecord[];
};

export type GuestProfile = {
  citySlug: string | null;
  cityName: string | null;
  industrySlug: string | null;
  industryName: string | null;
  hasSeenOnboarding: boolean;
};

export type CollectedCard = {
  id: string;
  copyId: string;
  title: string;
  content: string;
  collectedAt: string;
  backgroundSlug: string | null;
};

export type MomentRecord = {
  id: string;
  activitySlug: string;
  activityName: string;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  copyId: string;
  copyTitle: string;
  copyContent: string;
  backgroundSlug: string | null;
  snackSummary: string | null;
  droppedCardId: string | null;
};

export type GuestForestStore = {
  profile: GuestProfile;
  recentCopyIds: string[];
  records: MomentRecord[];
  cards: CollectedCard[];
};

export type ForestResult = {
  activity: ActivityRecord;
  durationSec: number;
  copy: CopywritingRecord;
  background: BackgroundRecord | null;
  snackSummary: string | null;
  droppedCard: CollectedCard | null;
};
