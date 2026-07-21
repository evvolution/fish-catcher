import { onMounted, watch, type ComputedRef, type Ref } from "vue";

import { createEmptyGuestStore, sanitizeGuestStore } from "~~/src/lib/moyu-engine";
import type { CopywritingRecord, FishSpeciesRecord, GuestForestStore } from "~~/src/lib/moyu-types";
import {
  CUSTOM_OCCUPATION_VALUE,
  LEGACY_STORAGE_KEY,
  MOYU_STORAGE_KEY,
  createDefaultLocationDraft,
  locationDraftFromProfile,
  type LocationDraft,
  type SheetState,
  type TimerState,
  type ViewState,
} from "~/utils/moyu-forest";

type LifecycleOptions = {
  welcomeVisible: Ref<boolean>;
  welcomeFishIndex: Ref<number>;
  welcomeFishOrder: Ref<FishSpeciesRecord[]>;
  store: Ref<GuestForestStore>;
  hasHydrated: Ref<boolean>;
  view: Ref<ViewState>;
  sheet: Ref<SheetState>;
  timer: Ref<TimerState | null>;
  elapsedMs: Ref<number>;
  onboardingOpen: ComputedRef<boolean>;
  homeQuoteCandidates: ComputedRef<CopywritingRecord[]>;
  industryOptions: ComputedRef<Array<{ value: string; label: string }>>;
  industryDraft: Ref<string>;
  customIndustryDraft: Ref<string>;
  locationDraft: Ref<LocationDraft>;
  advanceWelcomeFish: () => void;
  advanceHomeQuote: () => void;
  applyHomeAtmosphere: () => void;
};

export function useMoyuForestLifecycle(options: LifecycleOptions) {
  const assetUrl = useAssetUrl();

  watch(
    [options.welcomeVisible, () => options.welcomeFishOrder.value.length],
    ([visible, fishCount], _previous, onCleanup) => {
      if (!visible || fishCount < 2 || !import.meta.client) return;
      const interval = window.setInterval(options.advanceWelcomeFish, 5_000);
      onCleanup(() => window.clearInterval(interval));
    },
    { immediate: true },
  );

  watch([options.welcomeFishIndex, options.welcomeVisible], () => {
    if (!import.meta.client || !options.welcomeVisible.value || options.welcomeFishOrder.value.length < 2) return;
    const nextFish = options.welcomeFishOrder.value[
      (options.welcomeFishIndex.value + 1) % options.welcomeFishOrder.value.length
    ];
    if (nextFish) new window.Image().src = assetUrl(nextFish.imagePath);
  });

  watch(options.welcomeVisible, (visible, _previous, onCleanup) => {
    if (!visible || !import.meta.client) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    onCleanup(() => { document.body.style.overflow = previousOverflow; });
  }, { immediate: true });

  watch(options.store, (nextStore) => {
    if (options.hasHydrated.value && import.meta.client) {
      localStorage.setItem(MOYU_STORAGE_KEY, JSON.stringify(nextStore));
    }
  }, { deep: true });

  watch(() => options.store.value.profile, () => {
    if (options.hasHydrated.value) options.applyHomeAtmosphere();
  }, { deep: true });

  watch(options.timer, (currentTimer, _previous, onCleanup) => {
    if (!currentTimer) {
      options.elapsedMs.value = 0;
      return;
    }
    const refresh = () => {
      const runningMs = options.timer.value?.segmentStartedAt
        ? Date.now() - options.timer.value.segmentStartedAt : 0;
      options.elapsedMs.value = (options.timer.value?.accumulatedMs ?? 0) + runningMs;
    };
    refresh();
    if (!currentTimer.segmentStartedAt || !import.meta.client) return;
    const interval = window.setInterval(refresh, 250);
    onCleanup(() => window.clearInterval(interval));
  }, { deep: true });

  watch(
    [options.view, options.welcomeVisible, options.sheet, options.onboardingOpen, () => options.homeQuoteCandidates.value.length],
    ([currentView, fishOpen, currentSheet, onboarding, quoteCount], _previous, onCleanup) => {
      if (currentView !== "forest" || fishOpen || currentSheet || onboarding || quoteCount < 2 || !import.meta.client) return;
      const interval = window.setInterval(options.advanceHomeQuote, 5_000);
      onCleanup(() => window.clearInterval(interval));
    },
    { immediate: true },
  );

  onMounted(() => {
    try {
      const saved = localStorage.getItem(MOYU_STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
      options.store.value = saved ? sanitizeGuestStore(JSON.parse(saved)) : createEmptyGuestStore();
      if (!localStorage.getItem(MOYU_STORAGE_KEY) && saved) {
        localStorage.setItem(MOYU_STORAGE_KEY, saved);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
      options.locationDraft.value = locationDraftFromProfile(options.store.value.profile);
      const knownIndustry = options.industryOptions.value.find(
        (option) => option.value === options.store.value.profile.industrySlug,
      );
      options.industryDraft.value = knownIndustry ? knownIndustry.value
        : options.store.value.profile.industryName ? CUSTOM_OCCUPATION_VALUE : "";
      options.customIndustryDraft.value = knownIndustry ? "" : options.store.value.profile.industryName ?? "";
    } catch {
      options.store.value = createEmptyGuestStore();
      options.locationDraft.value = createDefaultLocationDraft();
      options.industryDraft.value = "";
      options.customIndustryDraft.value = "";
    } finally {
      options.hasHydrated.value = true;
      options.applyHomeAtmosphere();
    }
  });
}
