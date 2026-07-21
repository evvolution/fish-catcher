"use client";

import type { MutableRefObject, ReactNode, UIEvent } from "react";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";

import {
  appendFishViewingToStore,
  appendResultToStore,
  buildFoodBackpack,
  buildSnackSummary,
  createEmptyGuestStore,
  formatDuration,
  maybeDropCard,
  pickBackground,
  pickGreetingEntry,
  pickResultCopy,
  sanitizeGuestStore,
} from "@/lib/gap-engine";
import type {
  ActivityRecord,
  CopywritingRecord,
  FishSpeciesRecord,
  ForestCatalog,
  ForestResult,
  GuestForestStore,
} from "@/lib/gap-types";
import { regionalCatalog, type RegionalCity } from "@/lib/regional-catalog";
import { shuffleFishOrder } from "@/lib/fish-order";
import styles from "./forest.module.css";

const STORAGE_KEY = "gap-moment.guest-store.v1";
const CUSTOM_OCCUPATION_VALUE = "__custom_occupation__";
const PRIMARY_OCCUPATION_VALUES = ["programmer", "medical", "teacher", "accounting"];
const LIBRARY_PAGE_SIZE = 6;

type SelectOption = {
  value: string;
  label: string;
};

type OccupationOption = SelectOption;

type LocationDraft = {
  mode: "standard" | "custom";
  provinceCode: string;
  cityCode: string;
  districtCode: string;
  customName: string;
};

const OCCUPATION_SHORT_LABELS: Record<string, string> = {
  programmer: "程序设计",
  medical: "全科医师",
  teacher: "中小学教师",
  accounting: "会计",
};

const PROTECTION_LABELS: Record<FishSpeciesRecord["chinaProtectionStatus"], string> = {
  NONE: "未列入",
  NATIONAL_II: "国家二级",
  WILD_ONLY_NATIONAL_II: "野生二级",
  CITES_APPROVED_I: "核准一级",
  CITES_APPROVED_II: "核准二级",
  WILD_ONLY_CITES_APPROVED_II: "野生二级",
};

const activityIconPaths: Record<string, string> = {
  cloud: "/assets/icons/cloud.svg",
  cup: "/assets/icons/coffee.svg",
  leaf: "/assets/icons/wind.svg",
  trail: "/assets/icons/walk.svg",
};

type ViewState = "forest" | "timer" | "result";
type SheetState = null | "album" | "settings";
type LibraryTab = "cards" | "logs" | "backpack";

type TimerState = {
  activitySlug: string;
  startedAt: number;
  accumulatedMs: number;
  segmentStartedAt: number | null;
  ambientOn: boolean;
  backgroundSlug: string | null;
};

type AmbientAudioHandle = {
  context: AudioContext;
  source: AudioBufferSourceNode;
  gain: GainNode;
  filter: BiquadFilterNode;
};

export default function ForestClient({ catalog }: { catalog: ForestCatalog }) {
  const [welcomeVisible, setWelcomeVisible] = useState(true);
  const [welcomeFishIndex, setWelcomeFishIndex] = useState(0);
  const [welcomeFishOrder, setWelcomeFishOrder] = useState(catalog.fishes);
  const [store, setStore] = useState<GuestForestStore>(createEmptyGuestStore);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [view, setView] = useState<ViewState>("forest");
  const [sheet, setSheet] = useState<SheetState>(null);
  const [libraryTab, setLibraryTab] = useState<LibraryTab>("cards");
  const [visibleCardCount, setVisibleCardCount] = useState(LIBRARY_PAGE_SIZE);
  const [visibleLogCount, setVisibleLogCount] = useState(LIBRARY_PAGE_SIZE);
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [result, setResult] = useState<ForestResult | null>(null);
  const [homeGreetingId, setHomeGreetingId] = useState<string | null>(null);
  const [homeBackgroundSlug, setHomeBackgroundSlug] = useState<string | null>(null);
  const [locationDraft, setLocationDraft] = useState<LocationDraft>(createDefaultLocationDraft);
  const [industryDraft, setIndustryDraft] = useState<string>("");
  const [customIndustryDraft, setCustomIndustryDraft] = useState<string>("");
  const ambientAudioRef = useRef<AmbientAudioHandle | null>(null);
  const libraryBodyRef = useRef<HTMLDivElement | null>(null);
  const fishViewingStartedAtRef = useRef(Date.now());

  const activities = catalog.activities;
  const fishes = catalog.fishes;
  const welcomeFish = welcomeFishOrder.length
    ? welcomeFishOrder[welcomeFishIndex % welcomeFishOrder.length]
    : null;
  const industryOptions = useMemo(
    () =>
      catalog.dimensionGroups.find((group) => group.key === "industry")?.options.map((option) => ({
        value: option.slug,
        label: option.label,
      })) ?? [],
    [catalog.dimensionGroups],
  );
  const backpackItems = useMemo(
    () => buildFoodBackpack(store.profile, store.totalAttentionCents),
    [store.profile, store.totalAttentionCents],
  );
  const homeQuoteCandidates = useMemo(
    () => catalog.copyEntries.filter(
      (entry) => entry.kind === "GREETING" || (entry.kind === "RESULT" && entry.content.length <= 42),
    ),
    [catalog.copyEntries],
  );

  const backgroundMap = useMemo(
    () => new Map(catalog.backgrounds.map((background) => [background.slug, background])),
    [catalog.backgrounds],
  );
  const activityMap = useMemo(
    () => new Map(catalog.activities.map((activity) => [activity.slug, activity])),
    [catalog.activities],
  );
  const copyMap = useMemo(() => new Map(catalog.copyEntries.map((entry) => [entry.id, entry])), [catalog.copyEntries]);

  const advanceHomeQuote = useEffectEvent(() => {
    setHomeGreetingId((current) => {
      const candidates = homeQuoteCandidates.filter((entry) => entry.id !== current);
      return candidates[Math.floor(Math.random() * candidates.length)]?.id ?? current;
    });
  });

  const advanceWelcomeFish = useEffectEvent(() => {
    setWelcomeFishIndex((current) => {
      if (current + 1 < welcomeFishOrder.length) return current + 1;

      setWelcomeFishOrder(shuffleFishOrder(fishes, welcomeFishOrder.at(-1)?.slug));
      return 0;
    });
  });

  useEffect(() => {
    if (!welcomeVisible || welcomeFishOrder.length < 2) {
      return;
    }

    const interval = window.setInterval(() => {
      advanceWelcomeFish();
    }, 5_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [welcomeFishOrder.length, welcomeVisible]);

  useEffect(() => {
    if (!welcomeVisible || welcomeFishOrder.length < 2) {
      return;
    }

    const nextFish = welcomeFishOrder[(welcomeFishIndex + 1) % welcomeFishOrder.length];
    const image = new window.Image();
    image.src = nextFish.imagePath;
  }, [welcomeFishIndex, welcomeFishOrder, welcomeVisible]);

  useEffect(() => {
    if (!welcomeVisible) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [welcomeVisible]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const nextStore = saved ? sanitizeGuestStore(JSON.parse(saved)) : createEmptyGuestStore();
      setStore(nextStore);
      setLocationDraft(locationDraftFromProfile(nextStore.profile));
      const knownIndustry = industryOptions.find((option) => option.value === nextStore.profile.industrySlug);
      setIndustryDraft(
        knownIndustry ? knownIndustry.value : nextStore.profile.industryName ? CUSTOM_OCCUPATION_VALUE : "",
      );
      setCustomIndustryDraft(knownIndustry ? "" : nextStore.profile.industryName ?? "");
    } catch {
      const empty = createEmptyGuestStore();
      setStore(empty);
      setLocationDraft(createDefaultLocationDraft());
      setIndustryDraft("");
      setCustomIndustryDraft("");
    } finally {
      setHasHydrated(true);
    }
  }, [industryOptions]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }, [store, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const nextAtmosphere = resolveHomeAtmosphere(catalog, store.profile);
    setHomeGreetingId(nextAtmosphere.greetingId);
    setHomeBackgroundSlug(nextAtmosphere.backgroundSlug);
  }, [hasHydrated, catalog, store.profile]);

  const refreshElapsed = useEffectEvent(() => {
    if (!timer) {
      return;
    }

    const runningMs = timer.segmentStartedAt ? Date.now() - timer.segmentStartedAt : 0;
    setElapsedMs(timer.accumulatedMs + runningMs);
  });

  useEffect(() => {
    if (!timer) {
      setElapsedMs(0);
      return;
    }

    refreshElapsed();

    if (!timer.segmentStartedAt) {
      return;
    }

    const handle = window.setInterval(() => {
      refreshElapsed();
    }, 250);

    return () => {
      window.clearInterval(handle);
    };
  }, [timer]);

  useEffect(() => {
    return () => {
      stopAmbientAudio(ambientAudioRef);
    };
  }, []);

  const onboardingOpen =
    hasHydrated && (!store.profile.hasSeenOnboarding || (!store.profile.citySlug && !store.profile.cityName));
  useEffect(() => {
    if (view !== "forest" || welcomeVisible || sheet || onboardingOpen || homeQuoteCandidates.length < 2) return;

    const interval = window.setInterval(() => {
      advanceHomeQuote();
    }, 5_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [homeQuoteCandidates.length, onboardingOpen, sheet, view, welcomeVisible]);

  const greeting =
    homeGreetingId && copyMap.has(homeGreetingId)
      ? (copyMap.get(homeGreetingId) as CopywritingRecord)
      : catalog.copyEntries.find((entry) => entry.kind === "GREETING") ?? null;

  const currentBackground =
    (view === "result" ? result?.background?.slug : timer?.backgroundSlug) ??
    homeBackgroundSlug ??
    catalog.backgrounds[0]?.slug ??
    null;
  const currentBackgroundRecord = currentBackground ? backgroundMap.get(currentBackground) ?? null : null;
  const activeProfileCity = regionalCatalog.cities.find(
    (city) => city.code === store.profile.cityCode || city.slug === store.profile.citySlug,
  );
  const activeRegionParts = [
    store.profile.provinceName,
    activeProfileCity?.officialName ?? store.profile.cityName,
    store.profile.districtName,
  ].filter(
    (name): name is string => Boolean(name),
  );
  const activeRegionLabel = activeRegionParts
    .filter((name, index, parts) => index === 0 || name.replace(/市$/, "") !== parts[index - 1].replace(/市$/, ""))
    .join("");
  const activeIndustryLabel = store.profile.industrySlug
    ? industryOptions.find((option) => option.value === store.profile.industrySlug)?.label ?? null
    : store.profile.industryName;

  function handleStartActivity(activity: ActivityRecord) {
    const background = pickBackground(catalog, activity.slug, store.profile, new Date());

    stopAmbientAudio(ambientAudioRef);
    setResult(null);
    setSheet(null);
    setTimer({
      activitySlug: activity.slug,
      startedAt: Date.now(),
      accumulatedMs: 0,
      segmentStartedAt: Date.now(),
      ambientOn: false,
      backgroundSlug: background?.slug ?? null,
    });
    setView("timer");
  }

  function handlePauseOrResume() {
    setTimer((current) => {
      if (!current) {
        return current;
      }

      if (current.segmentStartedAt) {
        stopAmbientAudio(ambientAudioRef);
        return {
          ...current,
          accumulatedMs: current.accumulatedMs + (Date.now() - current.segmentStartedAt),
          segmentStartedAt: null,
          ambientOn: false,
        };
      }

      return {
        ...current,
        segmentStartedAt: Date.now(),
      };
    });
  }

  async function handleToggleAmbient() {
    if (!timer) {
      return;
    }

    if (timer.ambientOn) {
      stopAmbientAudio(ambientAudioRef);
      setTimer((current) => (current ? { ...current, ambientOn: false } : current));
      return;
    }

    const started = await startAmbientAudio(ambientAudioRef);

    if (started) {
      setTimer((current) => (current ? { ...current, ambientOn: true } : current));
    }
  }

  function handleFinishTimer() {
    if (!timer) {
      return;
    }

    const activity = activityMap.get(timer.activitySlug);

    if (!activity) {
      setView("forest");
      setTimer(null);
      return;
    }

    const endedAt = new Date();
    const totalMs = timer.accumulatedMs + (timer.segmentStartedAt ? endedAt.getTime() - timer.segmentStartedAt : 0);
    const durationSec = Math.max(1, Math.floor(totalMs / 1000));
    const copy =
      pickResultCopy(catalog, activity.slug, durationSec, store.profile, store.recentCopyIds, endedAt) ??
      catalog.copyEntries.find((entry) => entry.kind === "RESULT") ??
      null;

    if (!copy) {
      setView("forest");
      setTimer(null);
      return;
    }

    const background =
      (timer.backgroundSlug ? backgroundMap.get(timer.backgroundSlug) ?? null : null) ??
      pickBackground(catalog, activity.slug, store.profile, endedAt);
    const snackSummary = buildSnackSummary(store.profile, durationSec);
    const droppedCard = maybeDropCard(catalog, activity, store.profile, endedAt, background?.slug ?? null);

    stopAmbientAudio(ambientAudioRef);

    const nextResult: ForestResult = {
      activity,
      durationSec,
      copy,
      background,
      snackSummary,
      droppedCard,
    };

    setStore((current) =>
      appendResultToStore(current, {
        activity,
        durationSec,
        copy,
        snackSummary,
        backgroundSlug: background?.slug ?? null,
        droppedCard,
        endedAt,
        startedAt: new Date(timer.startedAt),
      }),
    );
    setResult(nextResult);
    setTimer(null);
    setView("result");
  }

  function handleBackToForest() {
    setResult(null);
    setView("forest");
    const nextAtmosphere = resolveHomeAtmosphere(catalog, store.profile);
    setHomeGreetingId(nextAtmosphere.greetingId);
    setHomeBackgroundSlug(nextAtmosphere.backgroundSlug);
  }

  function handleDeleteCard(cardId: string) {
    if (!window.confirm("删除这张卡片？")) {
      return;
    }

    setStore((current) => ({
      ...current,
      cards: current.cards.filter((card) => card.id !== cardId),
    }));
  }

  function handleOpenFish() {
    fishViewingStartedAtRef.current = Date.now();
    setWelcomeVisible(true);
  }

  function handleDismissFish() {
    if (!fishViewingStartedAtRef.current) return;

    const endedAt = new Date();
    const startedAt = new Date(Math.min(fishViewingStartedAtRef.current, endedAt.getTime()));
    const durationSec = Math.max(1, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));
    fishViewingStartedAtRef.current = 0;

    if (welcomeFish) {
      setStore((current) => appendFishViewingToStore(current, {
        fish: welcomeFish,
        durationSec,
        snackSummary: buildSnackSummary(current.profile, durationSec),
        endedAt,
        startedAt,
      }));
    }
    setWelcomeVisible(false);
  }

  function openLibrary(tab: LibraryTab) {
    setLibraryTab(tab);
    setVisibleCardCount(LIBRARY_PAGE_SIZE);
    setVisibleLogCount(LIBRARY_PAGE_SIZE);
    setSheet("album");
  }

  function changeLibraryTab(tab: LibraryTab) {
    setLibraryTab(tab);
    libraryBodyRef.current?.scrollTo({ top: 0 });
  }

  function handleLibraryScroll(event: UIEvent<HTMLDivElement>) {
    if (libraryTab === "backpack") return;

    const viewport = event.currentTarget;
    if (viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight > 96) return;

    if (libraryTab === "cards") {
      setVisibleCardCount((count) => Math.min(count + LIBRARY_PAGE_SIZE, store.cards.length));
    } else {
      setVisibleLogCount((count) => Math.min(count + LIBRARY_PAGE_SIZE, store.records.length));
    }
  }

  function handleSaveProfile() {
    const selectedCity = locationDraft.mode === "standard"
      ? regionalCatalog.cities.find((city) => city.code === locationDraft.cityCode)
      : undefined;
    const selectedDistrict = selectedCity?.districts.find((district) => district.code === locationDraft.districtCode);
    const cityName = locationDraft.mode === "custom" ? locationDraft.customName.trim() : selectedCity?.name ?? "";
    const selectedIndustry = industryOptions.find((option) => option.value === industryDraft);
    const industryName =
      selectedIndustry?.label ?? (industryDraft === CUSTOM_OCCUPATION_VALUE ? customIndustryDraft.trim() : "");

    if (!cityName || (locationDraft.mode === "standard" && !selectedDistrict) || (industryDraft === CUSTOM_OCCUPATION_VALUE && !industryName)) {
      return;
    }

    setStore((current) => ({
      ...current,
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
    }));
    setSheet(null);
  }

  return (
    <main className={styles.page}>
      <AnimatePresence>
        {welcomeVisible ? (
          <WelcomeOverlay
            fish={welcomeFish}
            preload={welcomeFishIndex === 0}
            onDismiss={handleDismissFish}
          />
        ) : null}
      </AnimatePresence>

      <div className={styles.backgroundViewport} aria-hidden="true">
        {currentBackgroundRecord ? (
          <Image
            src={currentBackgroundRecord.imagePath}
            alt=""
            fill
            priority
            sizes="(min-width: 768px) 430px, 100vw"
            className={styles.backgroundImage}
          />
        ) : null}
        <div className={styles.backgroundBloom} />
        <div className={styles.backgroundScrim} />
      </div>

      <div className={styles.contentShell}>
        <AnimatePresence mode="wait">
        {view === "forest" ? (
          <motion.section
            key="forest"
            className={styles.stage}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className={styles.header}>
              <button
                type="button"
                className={styles.albumButton}
                aria-label="打开卡册和摸鱼日志"
                onClick={() => openLibrary("cards")}
              >
                <AssetIcon src="/assets/icons/book.svg" />
              </button>
              <div className={styles.profileTools}>
                <span className={styles.profileSummary}>
                  <span className={styles.profileIndustry}>{activeIndustryLabel ?? "未设置职业"}</span>
                  <span className={styles.profileRegion}>{activeRegionLabel || "未设置地区"}</span>
                </span>
                <button
                  type="button"
                  className={styles.settingsButton}
                  aria-label="设置区域和职业"
                  onClick={() => setSheet("settings")}
                >
                  <AssetIcon src="/assets/icons/settings.svg" />
                </button>
              </div>
            </header>

            <section className={styles.heroCard}>
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={greeting?.id ?? "home-quote-fallback"}
                  className={styles.heroQuote}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h1 className={styles.heroTitle}>{greeting?.content ?? "先停一下，不急着把自己交回给待办。"}</h1>
                  <p className={styles.heroMeta}>{greeting?.title}</p>
                </motion.div>
              </AnimatePresence>
            </section>

          </motion.section>
        ) : null}

        {view === "timer" && timer ? (
          <motion.section
            key="timer"
            className={styles.timerStage}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={styles.timerTopBar}>
              <p className={styles.timerActivity}>{activityMap.get(timer.activitySlug)?.name ?? "驻足"}</p>
              <button
                type="button"
                className={timer.ambientOn ? `${styles.noiseButton} ${styles.noiseButtonActive}` : styles.noiseButton}
                aria-label={timer.ambientOn ? "关闭静噪" : "打开静噪"}
                aria-pressed={timer.ambientOn}
                onClick={() => void handleToggleAmbient()}
              >
                <AssetIcon src="/assets/icons/volume.svg" />
              </button>
            </div>

            <div className={styles.timerCenter}>
              <p className={styles.timerValue}>{formatDuration(Math.floor(elapsedMs / 1000))}</p>
            </div>

            <div className={styles.timerControls}>
              <button type="button" className={styles.endButton} onClick={handleFinishTimer}>
                <AssetIcon src="/assets/icons/stop.svg" />
                结束
              </button>
              <button type="button" className={styles.pauseButton} onClick={handlePauseOrResume}>
                <AssetIcon src={timer.segmentStartedAt ? "/assets/icons/pause.svg" : "/assets/icons/play.svg"} />
                {timer.segmentStartedAt ? "暂停" : "继续"}
              </button>
            </div>
          </motion.section>
        ) : null}

        {view === "result" && result ? (
          <motion.section
            key="result"
            className={styles.resultStage}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className={styles.resultLead}>{result.activity.name}</p>
            <h2 className={styles.resultDuration}>{formatDuration(result.durationSec)}</h2>
            <p className={`${styles.resultCopy} ${result.copy.content.length > 72 ? styles.resultCopyLong : ""}`}>
              {result.copy.content}
            </p>
            <p className={styles.resultSource}>{result.copy.title}</p>
            {result.snackSummary ? <p className={styles.resultSnack}>{result.snackSummary}</p> : null}

            {result.droppedCard ? (
              <article className={styles.cardDrop}>
                <h3 className={styles.cardDropTitle}>{result.droppedCard.title}</h3>
                <p className={styles.cardDropContent}>{result.droppedCard.content}</p>
              </article>
            ) : null}

            <div className={styles.resultActions}>
              <button type="button" className={styles.primaryButton} onClick={handleBackToForest}>
                森林
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  openLibrary("logs");
                  handleBackToForest();
                }}
              >
                查看日志
              </button>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

        {view !== "result" && !onboardingOpen ? (
          <nav className={styles.bottomTabBar} aria-label="摸鱼方式">
            {activities.map((activity) => {
              const isActive = timer?.activitySlug === activity.slug;
              const isLocked = Boolean(timer && !isActive);
              return (
                <button
                  key={activity.slug}
                  type="button"
                  className={isActive ? `${styles.bottomTab} ${styles.bottomTabActive}` : styles.bottomTab}
                  aria-current={isActive ? "page" : undefined}
                  disabled={isLocked}
                  onClick={() => (isActive ? setView("timer") : handleStartActivity(activity))}
                >
                  <span
                    className={styles.bottomTabIcon}
                    style={{
                      background: `linear-gradient(135deg, ${activity.colorStart ?? "#dfe6e0"}, ${activity.colorEnd ?? "#a6bbae"})`,
                    }}
                  >
                    <AssetIcon src={activityIconPaths[activity.iconKey] ?? activityIconPaths.cloud} />
                  </span>
                  <span>{activity.name}</span>
                </button>
              );
            })}
            <button
              type="button"
              className={styles.bottomTab}
              onClick={handleOpenFish}
            >
              <span className={`${styles.bottomTabIcon} ${styles.fishTabIcon}`}>
                <AssetIcon src="/assets/icons/fish.svg" />
              </span>
              <span>看鱼</span>
            </button>
          </nav>
        ) : null}

        <AnimatePresence>
        {sheet === "album" && view === "forest" ? (
          <OverlaySheet
            title="我的摸鱼"
            onClose={() => setSheet(null)}
            bodyRef={libraryBodyRef}
            onBodyScroll={handleLibraryScroll}
            stickyContent={(
              <div className={styles.libraryTabs} role="tablist" aria-label="卡册、日志和背包">
                <button
                  type="button"
                  role="tab"
                  aria-selected={libraryTab === "cards"}
                  className={libraryTab === "cards" ? styles.libraryTabActive : undefined}
                  onClick={() => changeLibraryTab("cards")}
                >
                  卡册 <small>{store.cards.length} 张</small>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={libraryTab === "logs"}
                  className={libraryTab === "logs" ? styles.libraryTabActive : undefined}
                  onClick={() => changeLibraryTab("logs")}
                >
                  日志 <small>{store.records.length} 次</small>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={libraryTab === "backpack"}
                  className={libraryTab === "backpack" ? styles.libraryTabActive : undefined}
                  onClick={() => changeLibraryTab("backpack")}
                >
                  背包 <small>{backpackItems.length} 种</small>
                </button>
              </div>
            )}
          >
            {libraryTab === "cards" ? (
              <div className={styles.cardGrid}>
                {store.cards.length ? (
                  store.cards.slice(0, visibleCardCount).map((card) => (
                    <article key={card.id} className={styles.cardItem}>
                      <div>
                        <p className={styles.cardItemTitle}>{card.title}</p>
                        <p className={styles.cardItemContent}>{card.content}</p>
                      </div>
                      <button
                        type="button"
                        className={styles.deleteButton}
                        aria-label={`删除 ${card.title}`}
                        onClick={() => handleDeleteCard(card.id)}
                      >
                        <AssetIcon src="/assets/icons/trash.svg" />
                      </button>
                    </article>
                  ))
                ) : (
                  <article className={styles.emptyCard}>还没有卡片掉落。</article>
                )}
                {visibleCardCount < store.cards.length ? <p className={styles.loadMoreHint}>继续下滑，加载更多</p> : null}
              </div>
            ) : libraryTab === "logs" ? (
              <div className={styles.logList}>
                {store.records.length ? store.records.slice(0, visibleLogCount).map((record) => (
                  <article
                    key={record.id}
                    className={record.fishSlug ? `${styles.logItem} ${styles.fishLogItem}` : styles.logItem}
                  >
                    <header>
                      <span>{record.activityName} · {formatDuration(record.durationSec)}</span>
                      <time dateTime={record.endedAt}>{formatLogDate(record.endedAt)}</time>
                    </header>
                    {record.fishSlug && record.fishImagePath ? (
                      <div className={styles.fishLogPreview}>
                        <div className={styles.fishLogImageWrap}>
                          <Image
                            src={record.fishImagePath}
                            alt={record.fishName ?? "本次看到的鱼"}
                            fill
                            sizes="92px"
                            className={styles.fishLogImage}
                          />
                        </div>
                        <div className={styles.fishLogCopy}>
                          <div>
                            <strong>{record.fishName ?? "看鱼"}</strong>
                            <em>{record.copyTitle}</em>
                          </div>
                          <p>{record.copyContent}</p>
                        </div>
                      </div>
                    ) : <p className={styles.logCopy}>{record.copyContent}</p>}
                    {record.snackSummary ? <p className={styles.logFood}>{record.snackSummary}</p> : null}
                  </article>
                )) : <article className={styles.emptyCard}>第一条摸鱼日志，等你亲自写下。</article>}
                {visibleLogCount < store.records.length ? <p className={styles.loadMoreHint}>继续下滑，加载更多</p> : null}
              </div>
            ) : (
              <div className={styles.backpackPanel}>
                <header className={styles.backpackHeader}>
                  <div>
                    <p>累计收进背包</p>
                    <strong>{backpackItems.length} 种食物</strong>
                  </div>
                  <span>零散时光会优先凑成完整份数</span>
                </header>
                {backpackItems.length ? (
                  <div className={styles.backpackGrid}>
                    {backpackItems.map((item) => (
                      <article key={`${item.name}-${item.unit}`} className={styles.backpackItem}>
                        <span className={styles.backpackFoodMark} aria-hidden="true">{item.name.slice(0, 1)}</span>
                        <div className={styles.backpackFoodName}>
                          <strong>{item.name}</strong>
                          <small>{item.isPartial ? "零头继续积攒中" : "已凑成完整份数"}</small>
                        </div>
                        <p className={styles.backpackAmount}>
                          {formatBackpackAmount(item.amount)}<small>{item.unit}</small>
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <article className={styles.emptyCard}>背包还是空的，摸一会儿鱼就有了。</article>
                )}
              </div>
            )}
          </OverlaySheet>
        ) : null}

        {sheet === "settings" && view === "forest" ? (
          <OverlaySheet title="区域 / 职业" onClose={() => setSheet(null)}>
            <div className={styles.settingsPanel}>
              <OccupationPicker
                idPrefix="settings"
                occupationOptions={industryOptions}
                occupationDraft={industryDraft}
                customOccupationDraft={customIndustryDraft}
                onOccupationChange={setIndustryDraft}
                onCustomOccupationChange={setCustomIndustryDraft}
              />

              <LocationPicker
                idPrefix="settings"
                value={locationDraft}
                onChange={setLocationDraft}
              />

              <div className={styles.sheetActions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleSaveProfile}
                  disabled={
                    !isLocationDraftValid(locationDraft) ||
                    !isOccupationDraftValid(industryDraft, customIndustryDraft, industryOptions)
                  }
                >
                  保存
                </button>
              </div>
            </div>
          </OverlaySheet>
        ) : null}

        {onboardingOpen ? (
          <motion.div
            className={styles.onboardingBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.section
              className={styles.onboardingCard}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <h2 className={styles.onboardingTitle}>你在哪里？</h2>

              <LocationPicker
                idPrefix="onboarding"
                value={locationDraft}
                onChange={setLocationDraft}
              />

              <OccupationPicker
                idPrefix="onboarding"
                occupationOptions={industryOptions}
                occupationDraft={industryDraft}
                customOccupationDraft={customIndustryDraft}
                onOccupationChange={setIndustryDraft}
                onCustomOccupationChange={setCustomIndustryDraft}
              />

              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleSaveProfile}
                disabled={
                  !isLocationDraftValid(locationDraft) ||
                  !isOccupationDraftValid(industryDraft, customIndustryDraft, industryOptions)
                }
              >
                进入森林
              </button>
            </motion.section>
          </motion.div>
        ) : null}
        </AnimatePresence>
      </div>
    </main>
  );
}

function WelcomeOverlay({
  fish,
  onDismiss,
  preload,
}: {
  fish: FishSpeciesRecord | null;
  onDismiss: () => void;
  preload: boolean;
}) {
  const protectionLabel = fish
    ? fish.chinaProtectionStatus === "NONE" && fish.citesAppendix !== "NONE"
      ? `CITES ${fish.citesAppendix}`
      : PROTECTION_LABELS[fish.chinaProtectionStatus]
    : "";
  const protectionNotice = fish ? getFishProtectionNotice(fish, protectionLabel) : null;

  return (
    <motion.section
      className={styles.welcomeOverlay}
      role="dialog"
      aria-modal="true"
      aria-label="间隙时光"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
    >
      <Image
        src="/assets/backgrounds/mist-lake-dawn.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className={styles.welcomeBackground}
      />
      <div className={styles.welcomeScrim} aria-hidden="true" />
      <button type="button" className={styles.welcomeDismiss} aria-label="进入森林" onClick={onDismiss} />

      <div className={styles.welcomeContent}>
        <h1 className={styles.welcomeTitle}>你一定要记得摸鱼</h1>

        <div className={styles.welcomeFishStage}>
          <div className={styles.welcomeFishCard} aria-live="polite">
            <AnimatePresence initial={false} mode="sync">
              {fish ? (
                <motion.figure
                  key={fish.slug}
                  className={styles.welcomeFishContent}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className={styles.welcomeFishImageWrap}>
                    <Image
                      src={fish.imagePath}
                      alt={fish.commonNameZh}
                      fill
                      priority={preload}
                      sizes="(min-width: 768px) 430px, calc(100vw - 48px)"
                      className={styles.welcomeFishImage}
                    />
                    <span className={styles.welcomeHabitat}>{fish.habitatLabel}</span>
                  </div>
                  <figcaption className={styles.welcomeFishCopy}>
                    <div className={styles.welcomeFishHeading}>
                      <h2 className={styles.welcomeFishName}>{fish.commonNameZh}</h2>
                      <p className={styles.welcomeScientificName}>{fish.scientificName}</p>
                    </div>
                    <p className={styles.welcomeFishSummary}>{fish.summary}</p>
                    <p className={styles.welcomeFishFact}><span>习性</span>{fish.habits}</p>
                    <p className={styles.welcomeFishFact}><span>分布</span>{fish.distribution}</p>
                    {protectionNotice ? (
                      <p className={styles.welcomeProtectionNote} role="note">
                        <span>保护提示</span>{protectionNotice}
                      </p>
                    ) : null}
                  </figcaption>
                </motion.figure>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <p className={styles.welcomeHint}>轻触，回到森林</p>
      </div>
    </motion.section>
  );
}

function getFishProtectionNotice(fish: FishSpeciesRecord, protectionLabel: string) {
  const protectedSpecies = fish.chinaProtectionStatus !== "NONE" || fish.citesAppendix !== "NONE";
  const threeHaveSpecies = fish.threeHaveStatus === "LISTED";

  if (!protectedSpecies && !threeHaveSpecies) return null;
  if (protectedSpecies && threeHaveSpecies) {
    return `${protectionLabel}，并列入“三有”名录；野生个体请勿随意捕捉或交易。`;
  }
  if (threeHaveSpecies) return "已列入“三有”名录；野生个体请勿随意捕捉或交易。";
  return `${protectionLabel}；野生个体请以现行名录及当地规定为准。`;
}

function LocationPicker({
  idPrefix,
  onChange,
  value,
}: {
  idPrefix: string;
  onChange: (value: LocationDraft) => void;
  value: LocationDraft;
}) {
  const [activeLevel, setActiveLevel] = useState<"province" | "city" | "district" | null>(null);
  const dialogTitleId = `${idPrefix}-location-dialog-title`;
  const selectedCity = regionalCatalog.cities.find((city) => city.code === value.cityCode);
  const selectedProvince = regionalCatalog.regions.find((province) => province.code === value.provinceCode);
  const availableCities = selectedProvince
    ? regionalCatalog.cities.filter((city) => city.provinceCode === selectedProvince.code)
    : [];
  const availableDistricts = selectedCity?.districts ?? [];
  const activeOptions: SelectOption[] = activeLevel === "province"
    ? regionalCatalog.regions.map((province) => ({ value: province.code, label: province.name }))
    : activeLevel === "city"
      ? availableCities.map((city) => ({ value: city.code, label: city.officialName }))
      : activeLevel === "district"
        ? availableDistricts.map((district) => ({ value: district.code, label: district.name }))
        : [];
  const activeValue = activeLevel === "province"
    ? value.provinceCode
    : activeLevel === "city"
      ? value.cityCode
      : value.districtCode;
  const activeTitle = activeLevel === "province" ? "选择省级地区" : activeLevel === "city" ? "选择市 / 州" : "选择区 / 县";

  function chooseCity(city: RegionalCity) {
    onChange({
      mode: "standard",
      provinceCode: city.provinceCode,
      cityCode: city.code,
      districtCode: city.districts[0]?.code ?? city.code,
      customName: "",
    });
  }

  function chooseLocationOption(optionValue: string) {
    if (activeLevel === "province") {
      const city = regionalCatalog.cities.find((item) => item.provinceCode === optionValue);
      if (city) chooseCity(city);
    } else if (activeLevel === "city") {
      const city = regionalCatalog.cities.find((item) => item.code === optionValue);
      if (city) chooseCity(city);
    } else if (activeLevel === "district") {
      onChange({ ...value, mode: "standard", districtCode: optionValue, customName: "" });
    }
    setActiveLevel(null);
  }

  useEffect(() => {
    if (!activeLevel) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveLevel(null);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [activeLevel]);

  return (
    <div className={styles.field}>
      <div className={styles.locationCascade} role="group" aria-label="地区">
        <div className={styles.cascadeField}>
          <button
            type="button"
            className={styles.cascadeButton}
            aria-label="选择省级地区"
            aria-haspopup="dialog"
            aria-expanded={activeLevel === "province"}
            onClick={() => setActiveLevel("province")}
          >
            <span>{selectedProvince?.name ?? "请选择"}</span>
            <span className={styles.cascadeButtonIcon} aria-hidden="true">⌄</span>
          </button>
        </div>
        <div className={styles.cascadeField}>
          <button
            type="button"
            className={styles.cascadeButton}
            aria-label="选择市或州"
            aria-haspopup="dialog"
            aria-expanded={activeLevel === "city"}
            disabled={!selectedProvince}
            onClick={() => setActiveLevel("city")}
          >
            <span>{selectedCity?.officialName ?? "请选择"}</span>
            <span className={styles.cascadeButtonIcon} aria-hidden="true">⌄</span>
          </button>
        </div>
        <div className={styles.cascadeField}>
          <button
            type="button"
            className={styles.cascadeButton}
            aria-label="选择区或县"
            aria-haspopup="dialog"
            aria-expanded={activeLevel === "district"}
            disabled={!selectedCity}
            onClick={() => setActiveLevel("district")}
          >
            <span>{availableDistricts.find((district) => district.code === value.districtCode)?.name ?? "请选择"}</span>
            <span className={styles.cascadeButtonIcon} aria-hidden="true">⌄</span>
          </button>
        </div>
      </div>
      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {activeLevel ? (
                <>
                  <motion.button
                    type="button"
                    className={styles.cityPickerBackdrop}
                    aria-label="关闭地区列表"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setActiveLevel(null)}
                  />
                  <motion.section
                    className={styles.cityPickerDialog}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={dialogTitleId}
                    initial={{ opacity: 0, y: 28, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 22, scale: 0.98 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <header className={styles.cityPickerHeader}>
                      <h3 id={dialogTitleId} className={styles.cityPickerTitle}>{activeTitle}</h3>
                      <button
                        type="button"
                        className={styles.closeButton}
                        aria-label="关闭"
                        onClick={() => setActiveLevel(null)}
                      >
                        <AssetIcon src="/assets/icons/close.svg" />
                      </button>
                    </header>

                    <div className={`${styles.cityRankGrid} ${styles.locationOptionGrid}`} role="listbox">
                      {activeOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={
                            activeValue === option.value
                              ? `${styles.cityRankButton} ${styles.locationOptionButton} ${styles.cityRankButtonActive}`
                              : `${styles.cityRankButton} ${styles.locationOptionButton}`
                          }
                          role="option"
                          aria-selected={activeValue === option.value}
                          onClick={() => chooseLocationOption(option.value)}
                        >
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </motion.section>
                </>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
}

function isLocationDraftValid(value: LocationDraft) {
  if (value.mode === "custom") return value.customName.trim().length > 0;

  const city = regionalCatalog.cities.find((item) => item.code === value.cityCode);
  return Boolean(
    city &&
    city.provinceCode === value.provinceCode &&
    city.districts.some((district) => district.code === value.districtCode),
  );
}

function OccupationPicker({
  occupationDraft,
  occupationOptions,
  customOccupationDraft,
  idPrefix,
  onOccupationChange,
  onCustomOccupationChange,
}: {
  occupationDraft: string;
  occupationOptions: OccupationOption[];
  customOccupationDraft: string;
  idPrefix: string;
  onOccupationChange: (value: string) => void;
  onCustomOccupationChange: (value: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const labelId = `${idPrefix}-occupation-label`;
  const dialogTitleId = `${idPrefix}-occupation-dialog-title`;
  const primaryOptions = PRIMARY_OCCUPATION_VALUES.map((value) =>
    occupationOptions.find((occupation) => occupation.value === value),
  ).filter((occupation): occupation is OccupationOption => Boolean(occupation));
  const expandedSelection = occupationOptions.find(
    (occupation) =>
      occupation.value === occupationDraft && !PRIMARY_OCCUPATION_VALUES.includes(occupation.value),
  );

  useEffect(() => {
    if (!isExpanded) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsExpanded(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isExpanded]);

  return (
    <div className={styles.field}>
      <span id={labelId} className={styles.fieldLabel}>你的行业 / 职业</span>
      <div className={`${styles.choiceWrap} ${styles.cityChoiceWrap}`} role="group" aria-labelledby={labelId}>
        {primaryOptions.map((occupation) => (
          <button
            key={occupation.value}
            type="button"
            className={
              occupationDraft === occupation.value
                ? `${styles.choiceChip} ${styles.choiceChipActive}`
                : styles.choiceChip
            }
            aria-pressed={occupationDraft === occupation.value}
            onClick={() => onOccupationChange(occupationDraft === occupation.value ? "" : occupation.value)}
          >
            {OCCUPATION_SHORT_LABELS[occupation.value] ?? occupation.label}
          </button>
        ))}
        <button
          type="button"
          className={
            occupationDraft === CUSTOM_OCCUPATION_VALUE
              ? `${styles.choiceChip} ${styles.choiceChipActive}`
              : styles.choiceChip
          }
          aria-expanded={occupationDraft === CUSTOM_OCCUPATION_VALUE}
          onClick={() => onOccupationChange(CUSTOM_OCCUPATION_VALUE)}
        >
          自定义
        </button>
        <button
          type="button"
          className={
            expandedSelection
              ? `${styles.expandOccupationButton} ${styles.expandOccupationButtonActive}`
              : styles.expandOccupationButton
          }
          aria-haspopup="dialog"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded(true)}
        >
          展开
        </button>
      </div>
      {expandedSelection ? <span className={styles.citySelectionNote}>已选 · {expandedSelection.label}</span> : null}
      {occupationDraft === CUSTOM_OCCUPATION_VALUE ? (
        <div className={styles.customCityField}>
          <input
            className={styles.textInput}
            value={customOccupationDraft}
            maxLength={32}
            autoComplete="organization-title"
            placeholder="输入你的职业"
            aria-label="自定义职业"
            onChange={(event) => onCustomOccupationChange(event.target.value)}
          />
          <span className={styles.fieldHint}>只用于匹配语气，不会公开展示。</span>
        </div>
      ) : null}
      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {isExpanded ? (
                <>
                  <motion.button
                    type="button"
                    className={styles.cityPickerBackdrop}
                    aria-label="关闭职业列表"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsExpanded(false)}
                  />
                  <motion.section
                    className={styles.cityPickerDialog}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={dialogTitleId}
                    initial={{ opacity: 0, y: 28, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 22, scale: 0.98 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <header className={styles.cityPickerHeader}>
                      <h3 id={dialogTitleId} className={styles.cityPickerTitle}>选择职业</h3>
                      <button
                        type="button"
                        className={styles.closeButton}
                        aria-label="关闭"
                        onClick={() => setIsExpanded(false)}
                      >
                        <AssetIcon src="/assets/icons/close.svg" />
                      </button>
                    </header>

                    <div className={`${styles.cityRankGrid} ${styles.occupationGrid}`}>
                      {occupationOptions.map((occupation) => (
                        <button
                          key={occupation.value}
                          type="button"
                          className={
                            occupationDraft === occupation.value
                              ? `${styles.cityRankButton} ${styles.occupationButton} ${styles.cityRankButtonActive}`
                              : `${styles.cityRankButton} ${styles.occupationButton}`
                          }
                          aria-pressed={occupationDraft === occupation.value}
                          onClick={() => {
                            onOccupationChange(occupation.value);
                            setIsExpanded(false);
                          }}
                        >
                          <span>{occupation.label}</span>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      className={styles.cityCustomAction}
                      onClick={() => {
                        onOccupationChange(CUSTOM_OCCUPATION_VALUE);
                        setIsExpanded(false);
                      }}
                    >
                      <span>自定义职业</span>
                      <span aria-hidden="true">→</span>
                    </button>
                  </motion.section>
                </>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
}

function isOccupationDraftValid(
  occupationDraft: string,
  customOccupationDraft: string,
  occupationOptions: OccupationOption[],
) {
  if (!occupationDraft) return true;
  return occupationDraft === CUSTOM_OCCUPATION_VALUE
    ? customOccupationDraft.trim().length > 0
    : occupationOptions.some((occupation) => occupation.value === occupationDraft);
}

function OverlaySheet({
  bodyRef,
  children,
  onBodyScroll,
  onClose,
  stickyContent,
  title,
}: {
  bodyRef?: MutableRefObject<HTMLDivElement | null>;
  children: ReactNode;
  onBodyScroll?: (event: UIEvent<HTMLDivElement>) => void;
  onClose: () => void;
  stickyContent?: ReactNode;
  title: string;
}) {
  return (
    <>
      <motion.button
        type="button"
        className={styles.sheetBackdrop}
        aria-label="关闭面板"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.section
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ y: "100%", opacity: 0.9 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0.9 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className={styles.sheetHandle} />
        <header className={styles.sheetHeader}>
          <h2 className={styles.sheetTitle}>{title}</h2>
          <button type="button" className={styles.closeButton} aria-label="关闭" onClick={onClose}>
            <AssetIcon src="/assets/icons/close.svg" />
          </button>
        </header>
        {stickyContent ? <div className={styles.sheetPinned}>{stickyContent}</div> : null}
        <div ref={bodyRef} className={styles.sheetBody} onScroll={onBodyScroll}>
          {children}
        </div>
      </motion.section>
    </>
  );
}

function AssetIcon({ src }: { src: string }) {
  return (
    <Image src={src} alt="" width={24} height={24} className={styles.icon} aria-hidden="true" />
  );
}

async function startAmbientAudio(audioRef: MutableRefObject<AmbientAudioHandle | null>) {
  if (audioRef.current) {
    return true;
  }

  const AudioContextCtor = window.AudioContext;

  if (!AudioContextCtor) {
    return false;
  }

  const context = new AudioContextCtor();

  if (context.state === "suspended") {
    await context.resume();
  }

  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const channel = buffer.getChannelData(0);

  for (let index = 0; index < channel.length; index += 1) {
    channel[index] = (Math.random() * 2 - 1) * 0.18;
  }

  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 880;
  filter.Q.value = 0.3;

  const gain = context.createGain();
  gain.gain.value = 0.045;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start();

  audioRef.current = {
    context,
    source,
    gain,
    filter,
  };

  return true;
}

function stopAmbientAudio(audioRef: MutableRefObject<AmbientAudioHandle | null>) {
  const current = audioRef.current;

  if (!current) {
    return;
  }

  current.source.stop();
  void current.context.close();
  audioRef.current = null;
}

function createDefaultLocationDraft(): LocationDraft {
  const city = regionalCatalog.cities.find((item) => item.slug === "beijing") ?? regionalCatalog.cities[0];
  return {
    mode: "standard",
    provinceCode: city?.provinceCode ?? "",
    cityCode: city?.code ?? "",
    districtCode: city?.districts[0]?.code ?? "",
    customName: "",
  };
}

function locationDraftFromProfile(profile: GuestForestStore["profile"]): LocationDraft {
  const city = regionalCatalog.cities.find(
    (item) =>
      item.code === profile.cityCode ||
      item.slug === profile.citySlug ||
      item.name === profile.cityName ||
      item.officialName === profile.cityName,
  );

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

function formatLogDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatBackpackAmount(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2).replace(/0$/, "");
}

function resolveHomeAtmosphere(catalog: ForestCatalog, profile: GuestForestStore["profile"]) {
  const now = new Date();
  const greeting = pickGreetingEntry(catalog, profile, now);
  const background = pickBackground(catalog, null, profile, now);

  return {
    greetingId: greeting?.id ?? null,
    backgroundSlug: background?.slug ?? null,
  };
}
