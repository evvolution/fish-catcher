import { computed, inject, nextTick, provide, ref, type InjectionKey } from "vue";

import {
  appendFishViewingToStore,
  appendResultToStore,
  buildFoodBackpack,
  buildSnackSummary,
  COLLECTED_CARD_LIMIT,
  createEmptyGuestStore,
  maybeDropCard,
  pickBackground,
  pickResultCopy,
} from "~~/src/lib/moyu-engine";
import { rankRelatedCopyEntries } from "~~/src/lib/copy-explorer";
import type {
  ActivityRecord,
  CopywritingRecord,
  ForestCatalog,
  ForestResult,
  GuestForestStore,
} from "~~/src/lib/moyu-types";
import { regionalCatalog } from "~~/src/lib/regional-catalog";
import { shuffleFishOrder } from "~~/src/lib/fish-order";
import { useAmbientNoise } from "~/composables/useAmbientNoise";
import { useMoyuForestLifecycle } from "~/composables/useMoyuForestLifecycle";
import {
  CUSTOM_OCCUPATION_VALUE,
  LIBRARY_PAGE_SIZE,
  createDefaultLocationDraft,
  getFishProtectionNotice,
  isLocationDraftValid,
  isOccupationDraftValid,
  protectionLabels,
  resolveHomeAtmosphere,
  type LibraryTab,
  type LocationDraft,
  type SheetState,
  type TimerState,
  type ViewState,
} from "~/utils/moyu-forest";

function createMoyuForestController(catalog: ForestCatalog) {
  const welcomeVisible = ref(true);
  const fishOverlayMode = ref<"entry" | "detail">("entry");
  const welcomeFishIndex = ref(0);
  const welcomeFishOrder = ref(shuffleFishOrder(catalog.fishes));
  const store = ref<GuestForestStore>(createEmptyGuestStore());
  const hasHydrated = ref(false);
  const view = ref<ViewState>("forest");
  const sheet = ref<SheetState>(null);
  const libraryTab = ref<LibraryTab>("cards");
  const visibleCardCount = ref(LIBRARY_PAGE_SIZE);
  const visibleLogCount = ref(LIBRARY_PAGE_SIZE);
  const timer = ref<TimerState | null>(null);
  const elapsedMs = ref(0);
  const result = ref<ForestResult | null>(null);
  const homeGreetingId = ref<string | null>(null);
  const homeBackgroundSlug = ref<string | null>(null);
  const locationDraft = ref<LocationDraft>(createDefaultLocationDraft());
  const industryDraft = ref("");
  const customIndustryDraft = ref("");
  const fishViewingStartedAt = ref(0);
  const quoteExplorerEntryId = ref<string | null>(null);
  const quoteExplorerTrailIds = ref<string[]>([]);
  const ambientNoise = useAmbientNoise();

  const activities = computed(() => catalog.activities);
  const welcomeFish = computed(() => welcomeFishOrder.value.length
    ? welcomeFishOrder.value[welcomeFishIndex.value % welcomeFishOrder.value.length] ?? null
    : null);
  const industryOptions = computed(() => catalog.dimensionGroups.find((group) => group.key === "industry")?.options
    .map((option) => ({ value: option.slug, label: option.label })) ?? []);
  const backpackItems = computed(() => buildFoodBackpack(store.value.profile, store.value.totalAttentionCents));
  const homeQuoteCandidates = computed(() => catalog.copyEntries.filter(
    (entry) => entry.kind === "GREETING" || (entry.kind === "RESULT" && entry.content.length <= 42),
  ));
  const quoteExplorerEntries = computed(() => catalog.copyEntries.filter(
    (entry) => entry.kind === "RESULT" || entry.kind === "CARD",
  ));
  const backgroundMap = new Map(catalog.backgrounds.map((background) => [background.slug, background]));
  const activityMap = new Map(catalog.activities.map((activity) => [activity.slug, activity]));
  const copyMap = new Map(catalog.copyEntries.map((entry) => [entry.id, entry]));
  const dimensionLabelMap = new Map(catalog.dimensionGroups.flatMap((group) =>
    group.options.map((option) => [`${group.key}:${option.slug}`, option.label] as const)));
  const greeting = computed(() => homeGreetingId.value && copyMap.has(homeGreetingId.value)
    ? copyMap.get(homeGreetingId.value) ?? null
    : catalog.copyEntries.find((entry) => entry.kind === "GREETING") ?? null);
  const quoteExplorerEntry = computed(() => quoteExplorerEntryId.value
    ? copyMap.get(quoteExplorerEntryId.value) ?? null : null);
  const quoteExplorerTags = computed(() => {
    const entry = quoteExplorerEntry.value;
    if (!entry) return [];
    return [...new Set(Object.entries(entry.dimensionKeys).flatMap(([groupKey, slugs]) =>
      slugs.map((slug) => dimensionLabelMap.get(`${groupKey}:${slug}`)).filter((label): label is string => Boolean(label)),
    ))].slice(0, 5);
  });
  const quoteExplorerSaved = computed(() => Boolean(
    quoteExplorerEntry.value
    && store.value.cards.some((card) => card.copyId === quoteExplorerEntry.value?.id),
  ));
  const currentBackground = computed(() => (view.value === "result" ? result.value?.background?.slug : timer.value?.backgroundSlug)
    ?? homeBackgroundSlug.value ?? catalog.backgrounds[0]?.slug ?? null);
  const currentBackgroundRecord = computed(() => currentBackground.value
    ? backgroundMap.get(currentBackground.value) ?? null : null);
  const activeProfileCity = computed(() => regionalCatalog.cities.find(
    (city) => city.code === store.value.profile.cityCode || city.slug === store.value.profile.citySlug,
  ));
  const activeRegionLabel = computed(() => [
    store.value.profile.provinceName,
    activeProfileCity.value?.officialName ?? store.value.profile.cityName,
    store.value.profile.districtName,
  ].filter((name): name is string => Boolean(name))
    .filter((name, index, parts) => index === 0 || name.replace(/市$/, "") !== parts[index - 1]?.replace(/市$/, ""))
    .join(""));
  const activeIndustryLabel = computed(() => store.value.profile.industrySlug
    ? industryOptions.value.find((option) => option.value === store.value.profile.industrySlug)?.label ?? null
    : store.value.profile.industryName);
  const timerActivityName = computed(() => timer.value
    ? activityMap.get(timer.value.activitySlug)?.name ?? "驻足" : "驻足");
  const protectionLabel = computed(() => welcomeFish.value
    ? welcomeFish.value.chinaProtectionStatus === "NONE" && welcomeFish.value.citesAppendix !== "NONE"
      ? `CITES ${welcomeFish.value.citesAppendix}`
      : protectionLabels[welcomeFish.value.chinaProtectionStatus]
    : "");
  const protectionNotice = computed(() => welcomeFish.value
    ? getFishProtectionNotice(welcomeFish.value, protectionLabel.value) : null);
  const profileValid = computed(() => isLocationDraftValid(locationDraft.value)
    && isOccupationDraftValid(industryDraft.value, customIndustryDraft.value, industryOptions.value));

  function advanceWelcomeFish() {
    if (welcomeFishIndex.value + 1 < welcomeFishOrder.value.length) {
      welcomeFishIndex.value += 1;
      return;
    }
    welcomeFishOrder.value = shuffleFishOrder(catalog.fishes, welcomeFishOrder.value.at(-1)?.slug);
    welcomeFishIndex.value = 0;
  }

  function advanceHomeQuote() {
    const candidates = homeQuoteCandidates.value.filter((entry) => entry.id !== homeGreetingId.value);
    homeGreetingId.value = candidates[Math.floor(Math.random() * candidates.length)]?.id ?? homeGreetingId.value;
  }

  function openQuoteExplorer(seed: CopywritingRecord | null = greeting.value) {
    const entry = seed ?? quoteExplorerEntries.value[Math.floor(Math.random() * quoteExplorerEntries.value.length)] ?? null;
    if (!entry) return;
    quoteExplorerEntryId.value = entry.id;
    quoteExplorerTrailIds.value = [entry.id];
    sheet.value = "quotes";
  }

  function advanceQuoteExplorer(mode: "related" | "wander") {
    const current = quoteExplorerEntry.value;
    if (!current) return openQuoteExplorer();
    const unseen = quoteExplorerEntries.value.filter(
      (entry) => entry.id !== current.id && !quoteExplorerTrailIds.value.includes(entry.id),
    );
    const ranked = mode === "related"
      ? rankRelatedCopyEntries(quoteExplorerEntries.value, current, quoteExplorerTrailIds.value)
      : unseen;
    const pool = ranked.length ? (mode === "related" ? ranked.slice(0, 12) : ranked)
      : quoteExplorerEntries.value.filter((entry) => entry.id !== current.id);
    const next = pool[Math.floor(Math.random() * pool.length)] ?? null;
    if (!next) return;
    quoteExplorerEntryId.value = next.id;
    quoteExplorerTrailIds.value = [...quoteExplorerTrailIds.value, next.id].slice(-40);
  }

  function handleCollectQuote() {
    const entry = quoteExplorerEntry.value;
    if (!entry || quoteExplorerSaved.value) return;
    store.value = {
      ...store.value,
      cards: [{
        id: `card_saved_${entry.id}_${Date.now()}`,
        copyId: entry.id,
        title: entry.title,
        content: entry.content,
        collectedAt: new Date().toISOString(),
        backgroundSlug: currentBackground.value,
      }, ...store.value.cards].slice(0, COLLECTED_CARD_LIMIT),
    };
  }

  function handleStartActivity(activity: ActivityRecord) {
    const background = pickBackground(catalog, activity.slug, store.value.profile, new Date());
    ambientNoise.stop();
    result.value = null;
    sheet.value = null;
    timer.value = {
      activitySlug: activity.slug,
      startedAt: Date.now(),
      accumulatedMs: 0,
      segmentStartedAt: Date.now(),
      ambientOn: false,
      backgroundSlug: background?.slug ?? null,
    };
    view.value = "timer";
  }

  function handlePauseOrResume() {
    if (!timer.value) return;
    if (timer.value.segmentStartedAt) {
      ambientNoise.stop();
      timer.value = {
        ...timer.value,
        accumulatedMs: timer.value.accumulatedMs + (Date.now() - timer.value.segmentStartedAt),
        segmentStartedAt: null,
        ambientOn: false,
      };
      return;
    }
    timer.value = { ...timer.value, segmentStartedAt: Date.now() };
  }

  async function handleToggleAmbient() {
    if (!timer.value) return;
    if (timer.value.ambientOn) {
      ambientNoise.stop();
      timer.value = { ...timer.value, ambientOn: false };
    } else if (await ambientNoise.start()) {
      timer.value = { ...timer.value, ambientOn: true };
    }
  }

  function handleFinishTimer() {
    if (!timer.value) return;
    const currentTimer = timer.value;
    const activity = activityMap.get(currentTimer.activitySlug);
    if (!activity) return resetTimerToForest();
    const endedAt = new Date();
    const totalMs = currentTimer.accumulatedMs
      + (currentTimer.segmentStartedAt ? endedAt.getTime() - currentTimer.segmentStartedAt : 0);
    const durationSec = Math.max(1, Math.floor(totalMs / 1000));
    const copy = pickResultCopy(catalog, activity.slug, durationSec, store.value.profile, store.value.recentCopyIds, endedAt)
      ?? catalog.copyEntries.find((entry) => entry.kind === "RESULT") ?? null;
    if (!copy) return resetTimerToForest();
    const background = (currentTimer.backgroundSlug ? backgroundMap.get(currentTimer.backgroundSlug) ?? null : null)
      ?? pickBackground(catalog, activity.slug, store.value.profile, endedAt);
    const snackSummary = buildSnackSummary(store.value.profile, durationSec);
    const droppedCard = maybeDropCard(catalog, activity, store.value.profile, endedAt, background?.slug ?? null);
    ambientNoise.stop();
    result.value = { activity, durationSec, copy, background, snackSummary, droppedCard };
    store.value = appendResultToStore(store.value, {
      activity,
      durationSec,
      copy,
      snackSummary,
      backgroundSlug: background?.slug ?? null,
      droppedCard,
      endedAt,
      startedAt: new Date(currentTimer.startedAt),
    });
    timer.value = null;
    view.value = "result";
  }

  function resetTimerToForest() {
    timer.value = null;
    view.value = "forest";
  }

  function handleBackToForest() {
    result.value = null;
    view.value = "forest";
    applyHomeAtmosphere();
  }

  function handleDeleteCard(cardId: string) {
    if (!window.confirm("删除这张卡片？")) return;
    store.value = { ...store.value, cards: store.value.cards.filter((card) => card.id !== cardId) };
  }

  function handleOpenFish() {
    fishOverlayMode.value = "detail";
    fishViewingStartedAt.value = Date.now();
    welcomeVisible.value = true;
  }

  function handleDismissFish() {
    if (fishOverlayMode.value === "entry") {
      welcomeVisible.value = false;
      return;
    }
    if (!fishViewingStartedAt.value) {
      welcomeVisible.value = false;
      return;
    }
    const endedAt = new Date();
    const startedAt = new Date(Math.min(fishViewingStartedAt.value, endedAt.getTime()));
    const durationSec = Math.max(1, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));
    fishViewingStartedAt.value = 0;
    if (welcomeFish.value) {
      store.value = appendFishViewingToStore(store.value, {
        fish: welcomeFish.value,
        durationSec,
        snackSummary: buildSnackSummary(store.value.profile, durationSec),
        endedAt,
        startedAt,
      });
    }
    welcomeVisible.value = false;
  }

  function handleNextFish() {
    advanceWelcomeFish();
    fishViewingStartedAt.value = Date.now();
  }

  function openLibrary(tab: LibraryTab) {
    libraryTab.value = tab;
    visibleCardCount.value = LIBRARY_PAGE_SIZE;
    visibleLogCount.value = LIBRARY_PAGE_SIZE;
    sheet.value = "album";
  }

  function changeLibraryTab(tab: LibraryTab) {
    libraryTab.value = tab;
    void nextTick(() => document.querySelector<HTMLElement>(".sheetBody")?.scrollTo({ top: 0 }));
  }

  function handleLibraryScroll(event: Event) {
    if (libraryTab.value === "backpack") return;
    const viewport = event.currentTarget as HTMLDivElement;
    if (viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight > 96) return;
    if (libraryTab.value === "cards") {
      visibleCardCount.value = Math.min(visibleCardCount.value + LIBRARY_PAGE_SIZE, store.value.cards.length);
    } else {
      visibleLogCount.value = Math.min(visibleLogCount.value + LIBRARY_PAGE_SIZE, store.value.records.length);
    }
  }

  function handleSaveProfile() {
    const selectedCity = locationDraft.value.mode === "standard"
      ? regionalCatalog.cities.find((city) => city.code === locationDraft.value.cityCode) : undefined;
    const selectedDistrict = selectedCity?.districts.find((district) => district.code === locationDraft.value.districtCode);
    const cityName = locationDraft.value.mode === "custom" ? locationDraft.value.customName.trim() : selectedCity?.name ?? "";
    const selectedIndustry = industryOptions.value.find((option) => option.value === industryDraft.value);
    const industryName = selectedIndustry?.label
      ?? (industryDraft.value === CUSTOM_OCCUPATION_VALUE ? customIndustryDraft.value.trim() : "");
    if (!cityName || (locationDraft.value.mode === "standard" && !selectedDistrict)
      || (industryDraft.value === CUSTOM_OCCUPATION_VALUE && !industryName)) return;
    store.value = {
      ...store.value,
      profile: {
        provinceCode: selectedCity?.provinceCode ?? null,
        provinceName: selectedCity?.provinceName ?? null,
        cityCode: selectedCity?.code ?? null,
        citySlug: selectedCity?.slug ?? null,
        cityName: cityName.slice(0, 32),
        districtCode: selectedDistrict?.code ?? null,
        districtName: selectedDistrict?.name ?? null,
        industrySlug: selectedIndustry?.value ?? null,
        industryName: industryName ? industryName.slice(0, 32) : null,
        hasSeenOnboarding: true,
      },
    };
    sheet.value = null;
  }

  function applyHomeAtmosphere() {
    const next = resolveHomeAtmosphere(catalog, store.value.profile);
    homeGreetingId.value = next.greetingId;
    homeBackgroundSlug.value = next.backgroundSlug;
  }

  useMoyuForestLifecycle({
    welcomeVisible,
    welcomeFishIndex,
    welcomeFishOrder,
    store,
    hasHydrated,
    view,
    sheet,
    timer,
    elapsedMs,
    industryOptions,
    industryDraft,
    customIndustryDraft,
    locationDraft,
    applyHomeAtmosphere,
  });

  return {
    activities, activeIndustryLabel, activeRegionLabel, backpackItems, currentBackgroundRecord,
    customIndustryDraft, elapsedMs, fishOverlayMode, greeting, handleBackToForest, handleCollectQuote,
    handleDeleteCard, handleDismissFish, handleFinishTimer, handleLibraryScroll, handleNextFish,
    handleOpenFish, handlePauseOrResume, handleSaveProfile, handleStartActivity, handleToggleAmbient,
    industryDraft, industryOptions, libraryTab, locationDraft, openLibrary, openQuoteExplorer,
    advanceHomeQuote, advanceQuoteExplorer, changeLibraryTab, profileValid, protectionNotice,
    quoteExplorerEntry, quoteExplorerSaved, quoteExplorerTags, result, sheet, store, timer,
    timerActivityName, view, visibleCardCount, visibleLogCount, welcomeFish, welcomeVisible,
  };
}

export type MoyuForestController = ReturnType<typeof createMoyuForestController>;
const moyuForestKey: InjectionKey<MoyuForestController> = Symbol("moyu-forest");

export function provideMoyuForest(catalog: ForestCatalog) {
  const controller = createMoyuForestController(catalog);
  provide(moyuForestKey, controller);
  return controller;
}

export function useMoyuForest() {
  const controller = inject(moyuForestKey);
  if (!controller) throw new Error("Moyu forest controller is not available.");
  return controller;
}
