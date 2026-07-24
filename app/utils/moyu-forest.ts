import { pickBackground } from "~~/src/lib/moyu-engine";
import type { FishSpeciesRecord, ForestCatalog, GuestForestStore } from "~~/src/lib/moyu-types";
import { regionalCatalog } from "~~/src/lib/regional-catalog";

export const MOYU_STORAGE_KEY = "moyu.guest-store.v1";
export const LEGACY_STORAGE_KEY = "gap-moment.guest-store.v1";
export const CUSTOM_OCCUPATION_VALUE = "__custom_occupation__";
export const LIBRARY_PAGE_SIZE = 6;

export const activityIconPaths: Record<string, string> & { cloud: string } = {
  cloud: "/assets/icons/cloud.svg",
  cup: "/assets/icons/coffee.svg",
  leaf: "/assets/icons/wind.svg",
  trail: "/assets/icons/walk.svg",
};

export const protectionLabels: Record<FishSpeciesRecord["chinaProtectionStatus"], string> = {
  NONE: "未列入",
  NATIONAL_II: "国家二级",
  WILD_ONLY_NATIONAL_II: "野生二级",
  CITES_APPROVED_I: "核准一级",
  CITES_APPROVED_II: "核准二级",
  WILD_ONLY_CITES_APPROVED_II: "野生二级",
};

export type ViewState = "forest" | "timer" | "result";
export type SheetState = null | "album" | "settings";
export type LibraryTab = "cards" | "logs" | "backpack";
export type LocationDraft = {
  mode: "standard" | "custom";
  provinceCode: string;
  cityCode: string;
  districtCode: string;
  customName: string;
};
export type TimerState = {
  activitySlug: string;
  startedAt: number;
  accumulatedMs: number;
  segmentStartedAt: number | null;
  ambientOn: boolean;
  backgroundSlug: string | null;
};

export function createDefaultLocationDraft(): LocationDraft {
  return {
    mode: "standard",
    provinceCode: "",
    cityCode: "",
    districtCode: "",
    customName: "",
  };
}

export function locationDraftFromProfile(profile: GuestForestStore["profile"]): LocationDraft {
  const city = regionalCatalog.cities.find((item) => item.code === profile.cityCode
    || item.slug === profile.citySlug
    || item.name === profile.cityName
    || item.officialName === profile.cityName);
  if (!city) {
    return profile.cityName
      ? { mode: "custom", provinceCode: "", cityCode: "", districtCode: "", customName: profile.cityName }
      : createDefaultLocationDraft();
  }
  const district = city.districts.find((item) => item.code === profile.districtCode) ?? city.districts[0];
  return {
    mode: "standard",
    provinceCode: city.provinceCode,
    cityCode: city.code,
    districtCode: district?.code ?? city.code,
    customName: "",
  };
}

export function isLocationDraftValid(value: LocationDraft) {
  if (value.mode === "custom") return value.customName.trim().length > 0;
  const city = regionalCatalog.cities.find((item) => item.code === value.cityCode);
  return Boolean(city && city.provinceCode === value.provinceCode
    && city.districts.some((district) => district.code === value.districtCode));
}

export function isOccupationDraftValid(
  occupation: string,
  customOccupation: string,
  options: Array<{ value: string; label: string }>,
) {
  if (!occupation) return true;
  return occupation === CUSTOM_OCCUPATION_VALUE
    ? customOccupation.trim().length > 0
    : options.some((option) => option.value === occupation);
}

export function formatLogDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatBackpackAmount(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2).replace(/0$/, "");
}

export function resolveHomeAtmosphere(catalog: ForestCatalog, profile: GuestForestStore["profile"]) {
  const now = new Date();
  return {
    backgroundSlug: pickBackground(catalog, null, profile, now)?.slug ?? null,
  };
}

export function getFishProtectionNotice(fish: FishSpeciesRecord, label: string) {
  const protectedSpecies = fish.chinaProtectionStatus !== "NONE" || fish.citesAppendix !== "NONE";
  const threeHaveSpecies = fish.threeHaveStatus === "LISTED";
  if (!protectedSpecies && !threeHaveSpecies) return null;
  if (protectedSpecies && threeHaveSpecies) return `${label}，并列入“三有”名录；野生个体请勿随意捕捉或交易`;
  if (threeHaveSpecies) return "已列入“三有”名录；野生个体请勿随意捕捉或交易";
  return `${label}；野生个体请以现行名录及当地规定为准`;
}
