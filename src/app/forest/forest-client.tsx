"use client";

import type { MutableRefObject, ReactNode } from "react";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";

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
  ForestCatalog,
  ForestResult,
  GuestForestStore,
} from "@/lib/gap-types";
import styles from "./forest.module.css";

const STORAGE_KEY = "gap-moment.guest-store.v1";

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
  const [industryDraft, setIndustryDraft] = useState<string>("");
  const ambientAudioRef = useRef<AmbientAudioHandle | null>(null);

  const activities = catalog.activities;
  const cities = catalog.cities;
  const cityOptions = cities.map((city) => ({ value: city.slug, label: city.name }));
  const industryOptions =
    catalog.dimensionGroups.find((group) => group.key === "industry")?.options.map((option) => ({
      value: option.slug,
      label: option.label,
    })) ?? [];

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
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const nextStore = saved ? sanitizeGuestStore(JSON.parse(saved)) : createEmptyGuestStore();
      setStore(nextStore);
      setCityDraft(nextStore.profile.citySlug ?? cities[0]?.slug ?? "");
      setIndustryDraft(nextStore.profile.industrySlug ?? "");
    } catch {
      const empty = createEmptyGuestStore();
      setStore(empty);
      setCityDraft(cities[0]?.slug ?? "");
      setIndustryDraft("");
    } finally {
      setHasHydrated(true);
    }
  }, [cities]);

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

  const onboardingOpen = hasHydrated && (!store.profile.hasSeenOnboarding || !store.profile.citySlug);
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
  const activeIndustryLabel = store.profile.industrySlug
    ? industryOptions.find((option) => option.value === store.profile.industrySlug)?.label ?? null
    : null;

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
    if (!cityDraft) {
      return;
    }

    setStore((current) => ({
      ...current,
      profile: {
        citySlug: cityDraft,
        industrySlug: industryDraft || null,
        hasSeenOnboarding: true,
      },
    }));
    setSheet(null);
  }

  return (
    <main className={styles.page}>
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
              <p className={styles.brand}>间隙时光</p>
            </header>

            <section className={styles.heroCard}>
              <h1 className={styles.heroTitle}>{greeting?.content ?? "先停一下，不急着把自己交回给待办。"}</h1>
              <p className={styles.heroMeta}>
                {[greeting?.title, activeCity?.name, activeIndustryLabel].filter(Boolean).join(" · ")}
              </p>
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

            <nav className={styles.bottomDock} aria-label="森林工具">
              <button type="button" className={styles.dockButton} onClick={() => setSheet("album")}>
                <AssetIcon src="/assets/icons/book.svg" />
                <span>卡册{store.cards.length ? ` ${store.cards.length}` : ""}</span>
              </button>
              <button type="button" className={styles.dockButton} onClick={() => setSheet("settings")}>
                <AssetIcon src="/assets/icons/settings.svg" />
                <span>设置</span>
              </button>
            </nav>
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
          <OverlaySheet title="设置" onClose={() => setSheet(null)}>
            <div className={styles.settingsPanel}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>城市</span>
                <select
                  className={styles.select}
                  value={cityDraft}
                  onChange={(event) => setCityDraft(event.target.value)}
                >
                  {cityOptions.map((city) => (
                    <option key={city.value} value={city.value}>
                      {city.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>行业</span>
                <div className={styles.choiceWrap}>
                  <button
                    type="button"
                    className={industryDraft ? styles.choiceChip : `${styles.choiceChip} ${styles.choiceChipActive}`}
                    onClick={() => setIndustryDraft("")}
                  >
                    不选
                  </button>
                  {industryOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={
                        industryDraft === option.value
                          ? `${styles.choiceChip} ${styles.choiceChipActive}`
                          : styles.choiceChip
                      }
                      onClick={() => setIndustryDraft(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.sheetActions}>
                <button type="button" className={styles.primaryButton} onClick={handleSaveProfile}>
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

              <label className={styles.field}>
                <span className={styles.fieldLabel}>城市</span>
                <select className={styles.select} value={cityDraft} onChange={(event) => setCityDraft(event.target.value)}>
                  {cityOptions.map((city) => (
                    <option key={city.value} value={city.value}>
                      {city.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>行业</span>
                <div className={styles.choiceWrap}>
                  <button
                    type="button"
                    className={industryDraft ? styles.choiceChip : `${styles.choiceChip} ${styles.choiceChipActive}`}
                    onClick={() => setIndustryDraft("")}
                  >
                    不选
                  </button>
                  {industryOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={
                        industryDraft === option.value
                          ? `${styles.choiceChip} ${styles.choiceChipActive}`
                          : styles.choiceChip
                      }
                      onClick={() => setIndustryDraft(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <button type="button" className={styles.primaryButton} onClick={handleSaveProfile} disabled={!cityDraft}>
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
