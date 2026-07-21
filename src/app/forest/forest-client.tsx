"use client";

import type { MutableRefObject, ReactNode } from "react";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";

import {
  appendResultToStore,
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
import styles from "./forest.module.css";

const STORAGE_KEY = "gap-moment.guest-store.v1";
const CUSTOM_CITY_VALUE = "__custom_city__";
const CUSTOM_OCCUPATION_VALUE = "__custom_occupation__";
const PRIMARY_CITY_VALUES = ["beijing", "shanghai", "guangzhou", "shenzhen"];
const PRIMARY_OCCUPATION_VALUES = ["programmer", "medical", "teacher", "accounting"];

type CityOption = {
  value: string;
  label: string;
};

type OccupationOption = CityOption;

const OCCUPATION_SHORT_LABELS: Record<string, string> = {
  programmer: "程序设计",
  medical: "全科医师",
  teacher: "中小学教师",
  accounting: "会计",
};

// 2025 full-year GDP order. The first four shortcuts intentionally follow 北上广深, not this ranking.
const GDP_CITY_OPTIONS: CityOption[] = [
  { value: "shanghai", label: "上海" },
  { value: "beijing", label: "北京" },
  { value: "shenzhen", label: "深圳" },
  { value: "chongqing", label: "重庆" },
  { value: "guangzhou", label: "广州" },
  { value: "suzhou", label: "苏州" },
  { value: "chengdu", label: "成都" },
  { value: "hangzhou", label: "杭州" },
  { value: "wuhan", label: "武汉" },
  { value: "nanjing", label: "南京" },
  { value: "ningbo", label: "宁波" },
  { value: "tianjin", label: "天津" },
  { value: "qingdao", label: "青岛" },
  { value: "wuxi", label: "无锡" },
  { value: "changsha", label: "长沙" },
  { value: "zhengzhou", label: "郑州" },
  { value: "fuzhou", label: "福州" },
  { value: "jinan", label: "济南" },
  { value: "hefei", label: "合肥" },
  { value: "xian", label: "西安" },
  { value: "quanzhou", label: "泉州" },
  { value: "foshan", label: "佛山" },
  { value: "nantong", label: "南通" },
  { value: "dongguan", label: "东莞" },
  { value: "yantai", label: "烟台" },
  { value: "changzhou", label: "常州" },
  { value: "tangshan", label: "唐山" },
  { value: "wenzhou", label: "温州" },
  { value: "dalian", label: "大连" },
  { value: "xuzhou", label: "徐州" },
];

const activityIconPaths: Record<string, string> = {
  cloud: "/assets/icons/cloud.svg",
  cup: "/assets/icons/coffee.svg",
  leaf: "/assets/icons/wind.svg",
  trail: "/assets/icons/walk.svg",
};

type ViewState = "forest" | "timer" | "result";
type SheetState = null | "album" | "settings";

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
  const [store, setStore] = useState<GuestForestStore>(createEmptyGuestStore);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [view, setView] = useState<ViewState>("forest");
  const [sheet, setSheet] = useState<SheetState>(null);
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [result, setResult] = useState<ForestResult | null>(null);
  const [homeGreetingId, setHomeGreetingId] = useState<string | null>(null);
  const [homeBackgroundSlug, setHomeBackgroundSlug] = useState<string | null>(null);
  const [cityDraft, setCityDraft] = useState<string>("");
  const [customCityDraft, setCustomCityDraft] = useState<string>("");
  const [industryDraft, setIndustryDraft] = useState<string>("");
  const [customIndustryDraft, setCustomIndustryDraft] = useState<string>("");
  const ambientAudioRef = useRef<AmbientAudioHandle | null>(null);

  const activities = catalog.activities;
  const cities = catalog.cities;
  const fishes = catalog.fishes;
  const welcomeFish = fishes.length ? fishes[welcomeFishIndex % fishes.length] : null;
  const cityOptions = GDP_CITY_OPTIONS;
  const industryOptions = useMemo(
    () =>
      catalog.dimensionGroups.find((group) => group.key === "industry")?.options.map((option) => ({
        value: option.slug,
        label: option.label,
      })) ?? [],
    [catalog.dimensionGroups],
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

  useEffect(() => {
    if (!welcomeVisible || fishes.length < 2) {
      return;
    }

    const interval = window.setInterval(() => {
      setWelcomeFishIndex((current) => (current + 1) % fishes.length);
    }, 5_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [fishes.length, welcomeVisible]);

  useEffect(() => {
    if (!welcomeVisible || fishes.length < 2) {
      return;
    }

    const nextFish = fishes[(welcomeFishIndex + 1) % fishes.length];
    const image = new window.Image();
    image.src = nextFish.imagePath;
  }, [fishes, welcomeFishIndex, welcomeVisible]);

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
      const knownCity = cityOptions.find(
        (city) => city.value === nextStore.profile.citySlug || city.label === nextStore.profile.cityName,
      );
      setStore(nextStore);
      setCityDraft(knownCity ? knownCity.value : nextStore.profile.cityName ? CUSTOM_CITY_VALUE : "beijing");
      setCustomCityDraft(knownCity ? "" : nextStore.profile.cityName ?? "");
      const knownIndustry = industryOptions.find((option) => option.value === nextStore.profile.industrySlug);
      setIndustryDraft(
        knownIndustry ? knownIndustry.value : nextStore.profile.industryName ? CUSTOM_OCCUPATION_VALUE : "",
      );
      setCustomIndustryDraft(knownIndustry ? "" : nextStore.profile.industryName ?? "");
    } catch {
      const empty = createEmptyGuestStore();
      setStore(empty);
      setCityDraft("beijing");
      setCustomCityDraft("");
      setIndustryDraft("");
      setCustomIndustryDraft("");
    } finally {
      setHasHydrated(true);
    }
  }, [cities, cityOptions, industryOptions]);

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
  const activeCity = store.profile.citySlug ? cities.find((city) => city.slug === store.profile.citySlug) ?? null : null;
  const activeCityName = activeCity?.name ?? store.profile.cityName;
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
    const snackSummary = buildSnackSummary(catalog, store.profile.citySlug, durationSec);
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

  function handleSaveProfile() {
    const selectedCity = cityOptions.find((city) => city.value === cityDraft);
    const catalogCity = selectedCity ? cities.find((city) => city.slug === selectedCity.value) : null;
    const cityName = selectedCity?.label ?? (cityDraft === CUSTOM_CITY_VALUE ? customCityDraft.trim() : "");
    const selectedIndustry = industryOptions.find((option) => option.value === industryDraft);
    const industryName =
      selectedIndustry?.label ?? (industryDraft === CUSTOM_OCCUPATION_VALUE ? customIndustryDraft.trim() : "");

    if (!cityName || (industryDraft === CUSTOM_OCCUPATION_VALUE && !industryName)) {
      return;
    }

    setStore((current) => ({
      ...current,
      profile: {
        citySlug: catalogCity?.slug ?? null,
        cityName: cityName.slice(0, 32),
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
        {welcomeVisible ? <WelcomeOverlay fish={welcomeFish} onDismiss={() => setWelcomeVisible(false)} /> : null}
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
              <button type="button" className={styles.albumButton} onClick={() => setSheet("album")}>
                <AssetIcon src="/assets/icons/book.svg" />
                <span>卡册{store.cards.length ? ` ${store.cards.length}` : ""}</span>
              </button>
              <div className={styles.profileTools}>
                <span className={styles.profileSummary}>
                  {[activeCityName, activeIndustryLabel].filter(Boolean).join(" · ") || "区域 / 职业"}
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
              <h1 className={styles.heroTitle}>{greeting?.content ?? "先停一下，不急着把自己交回给待办。"}</h1>
              <p className={styles.heroMeta}>{greeting?.title}</p>
            </section>

            <section className={styles.actionSection}>
              <div className={styles.activityGrid}>
                {activities.map((activity) => (
                  <button
                    key={activity.slug}
                    type="button"
                    className={styles.activityButton}
                    aria-label={activity.name}
                    onClick={() => handleStartActivity(activity)}
                  >
                    <span
                      className={styles.activityOrb}
                      style={{
                        background: `linear-gradient(135deg, ${activity.colorStart ?? "#dfe6e0"} 0%, ${activity.colorEnd ?? "#a6bbae"} 100%)`,
                      }}
                    >
                      <AssetIcon src={activityIconPaths[activity.iconKey] ?? activityIconPaths.cloud} />
                    </span>
                    <span className={styles.activityName}>{activity.name}</span>
                  </button>
                ))}
              </div>
            </section>

            {store.records.length ? <section className={styles.recordSection}>
              <div className={styles.recordList}>
                {store.records.slice(0, 2).map((record) => (
                  <article key={record.id} className={styles.recordCard}>
                    <div>
                      <p className={styles.recordActivity}>{record.activityName}</p>
                      <p className={styles.recordCopy}>{record.copyContent}</p>
                    </div>
                    <span className={styles.recordDuration}>{formatDuration(record.durationSec)}</span>
                  </article>
                ))}
              </div>
            </section> : null}

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
                  setSheet("album");
                  handleBackToForest();
                }}
              >
                卡册
              </button>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

        <AnimatePresence>
        {sheet === "album" && view === "forest" ? (
          <OverlaySheet title="卡册" onClose={() => setSheet(null)}>
            <div className={styles.cardGrid}>
              {store.cards.length ? (
                store.cards.map((card) => (
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
            </div>
          </OverlaySheet>
        ) : null}

        {sheet === "settings" && view === "forest" ? (
          <OverlaySheet title="区域 / 职业" onClose={() => setSheet(null)}>
            <div className={styles.settingsPanel}>
              <CityPicker
                idPrefix="settings"
                cityOptions={cityOptions}
                cityDraft={cityDraft}
                customCityDraft={customCityDraft}
                onCityChange={setCityDraft}
                onCustomCityChange={setCustomCityDraft}
              />

              <OccupationPicker
                idPrefix="settings"
                occupationOptions={industryOptions}
                occupationDraft={industryDraft}
                customOccupationDraft={customIndustryDraft}
                onOccupationChange={setIndustryDraft}
                onCustomOccupationChange={setCustomIndustryDraft}
              />

              <div className={styles.sheetActions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleSaveProfile}
                  disabled={
                    !isCityDraftValid(cityDraft, customCityDraft, cityOptions) ||
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

              <CityPicker
                idPrefix="onboarding"
                cityOptions={cityOptions}
                cityDraft={cityDraft}
                customCityDraft={customCityDraft}
                onCityChange={setCityDraft}
                onCustomCityChange={setCustomCityDraft}
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
                  !isCityDraftValid(cityDraft, customCityDraft, cityOptions) ||
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

function WelcomeOverlay({ fish, onDismiss }: { fish: FishSpeciesRecord | null; onDismiss: () => void }) {
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
        src="/assets/backgrounds/mist-lake-dawn.jpg"
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
                      priority={fish.slug === "ocellaris-clownfish"}
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

function CityPicker({
  cityDraft,
  cityOptions,
  customCityDraft,
  idPrefix,
  onCityChange,
  onCustomCityChange,
}: {
  cityDraft: string;
  cityOptions: CityOption[];
  customCityDraft: string;
  idPrefix: string;
  onCityChange: (value: string) => void;
  onCustomCityChange: (value: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const labelId = `${idPrefix}-city-label`;
  const dialogTitleId = `${idPrefix}-city-dialog-title`;
  const primaryCityOptions = PRIMARY_CITY_VALUES.map((value) => cityOptions.find((city) => city.value === value)).filter(
    (city): city is CityOption => Boolean(city),
  );
  const expandedSelection = cityOptions.find(
    (city) => city.value === cityDraft && !PRIMARY_CITY_VALUES.includes(city.value),
  );

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsExpanded(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isExpanded]);

  return (
    <div className={styles.field}>
      <span id={labelId} className={styles.fieldLabel}>城市</span>
      <div className={`${styles.choiceWrap} ${styles.cityChoiceWrap}`} role="group" aria-labelledby={labelId}>
        {primaryCityOptions.map((city) => (
          <button
            key={city.value}
            type="button"
            className={
              cityDraft === city.value ? `${styles.choiceChip} ${styles.choiceChipActive}` : styles.choiceChip
            }
            onClick={() => onCityChange(city.value)}
          >
            {city.label}
          </button>
        ))}
        <button
          type="button"
          className={expandedSelection ? `${styles.choiceChip} ${styles.choiceChipActive}` : styles.choiceChip}
          aria-haspopup="dialog"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded(true)}
        >
          展开
        </button>
        <button
          type="button"
          className={
            cityDraft === CUSTOM_CITY_VALUE ? `${styles.choiceChip} ${styles.choiceChipActive}` : styles.choiceChip
          }
          onClick={() => onCityChange(CUSTOM_CITY_VALUE)}
          aria-expanded={cityDraft === CUSTOM_CITY_VALUE}
        >
          自定义
        </button>
      </div>
      {expandedSelection ? <span className={styles.citySelectionNote}>已选 · {expandedSelection.label}</span> : null}
      {cityDraft === CUSTOM_CITY_VALUE ? (
        <div className={styles.customCityField}>
          <input
            className={styles.textInput}
            value={customCityDraft}
            maxLength={32}
            autoComplete="address-level2"
            placeholder="输入城市或地区"
            aria-label="自定义城市或地区"
            onChange={(event) => onCustomCityChange(event.target.value)}
          />
          <span className={styles.fieldHint}>只用于问候展示；没有对应城市时不进行小吃换算。</span>
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
                    aria-label="关闭城市列表"
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
                      <h3 id={dialogTitleId} className={styles.cityPickerTitle}>选择城市</h3>
                      <button
                        type="button"
                        className={styles.closeButton}
                        aria-label="关闭"
                        onClick={() => setIsExpanded(false)}
                      >
                        <AssetIcon src="/assets/icons/close.svg" />
                      </button>
                    </header>

                    <div className={styles.cityRankGrid}>
                      {cityOptions.map((city) => (
                        <button
                          key={city.value}
                          type="button"
                          className={
                            cityDraft === city.value
                              ? `${styles.cityRankButton} ${styles.cityRankButtonActive}`
                              : styles.cityRankButton
                          }
                          aria-pressed={cityDraft === city.value}
                          onClick={() => {
                            onCityChange(city.value);
                            setIsExpanded(false);
                          }}
                        >
                          <span>{city.label}</span>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      className={styles.cityCustomAction}
                      onClick={() => {
                        onCityChange(CUSTOM_CITY_VALUE);
                        setIsExpanded(false);
                      }}
                    >
                      <span>自定义城市或地区</span>
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

function isCityDraftValid(
  cityDraft: string,
  customCityDraft: string,
  cityOptions: CityOption[],
) {
  return cityDraft === CUSTOM_CITY_VALUE
    ? customCityDraft.trim().length > 0
    : cityOptions.some((city) => city.value === cityDraft);
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
      <span id={labelId} className={styles.fieldLabel}>职业</span>
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
          className={expandedSelection ? `${styles.choiceChip} ${styles.choiceChipActive}` : styles.choiceChip}
          aria-haspopup="dialog"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded(true)}
        >
          展开
        </button>
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
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
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
        {children}
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

function resolveHomeAtmosphere(catalog: ForestCatalog, profile: GuestForestStore["profile"]) {
  const now = new Date();
  const greeting = pickGreetingEntry(catalog, profile, now);
  const background = pickBackground(catalog, null, profile, now);

  return {
    greetingId: greeting?.id ?? null,
    backgroundSlug: background?.slug ?? null,
  };
}
