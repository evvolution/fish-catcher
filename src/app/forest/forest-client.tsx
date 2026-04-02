"use client";

import type { CSSProperties, MutableRefObject, ReactNode } from "react";
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

type ViewState = "forest" | "timer" | "result";
type SheetState = null | "settings";

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
  const ambientAudioRef = useRef<AmbientAudioHandle | null>(null);

  const activities = catalog.activities;

  const backgroundMap = useMemo(
    () => new Map(catalog.backgrounds.map((background) => [background.slug, background])),
    [catalog.backgrounds],
  );
  const activityMap = useMemo(
    () => new Map(catalog.activities.map((activity) => [activity.slug, activity])),
    [catalog.activities],
  );
  const copyMap = useMemo(() => new Map(catalog.copyEntries.map((entry) => [entry.id, entry])), [catalog.copyEntries]);
  const quickActivities = useMemo(() => {
    const preferredSlugs = store.quickActivitySlugs.length ? store.quickActivitySlugs : activities.slice(0, 4).map((item) => item.slug);

    return preferredSlugs
      .map((slug) => activityMap.get(slug))
      .filter((activity): activity is ActivityRecord => Boolean(activity))
      .slice(0, 4);
  }, [activityMap, activities, store.quickActivitySlugs]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const nextStore = saved ? sanitizeGuestStore(JSON.parse(saved)) : createEmptyGuestStore();
      setStore({
        ...nextStore,
        quickActivitySlugs: nextStore.quickActivitySlugs.length
          ? nextStore.quickActivitySlugs
          : activities.slice(0, 4).map((activity) => activity.slug),
      });
    } catch {
      const empty = createEmptyGuestStore();
      setStore({
        ...empty,
        quickActivitySlugs: activities.slice(0, 4).map((activity) => activity.slug),
      });
    } finally {
      setHasHydrated(true);
    }
  }, [activities]);

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

  function handleToggleQuickActivity(activitySlug: string) {
    setStore((current) => {
      const exists = current.quickActivitySlugs.includes(activitySlug);

      if (exists) {
        if (current.quickActivitySlugs.length <= 1) {
          return current;
        }

        return {
          ...current,
          quickActivitySlugs: current.quickActivitySlugs.filter((slug) => slug !== activitySlug),
        };
      }

      return {
        ...current,
        quickActivitySlugs: [...current.quickActivitySlugs, activitySlug].slice(0, 4),
      };
    });
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
              <header className={styles.topGlassCard}>
                <span className={styles.topGlassIndicator} aria-hidden="true" />
                <h1 className={styles.topGlassTitle}>{greeting?.content ?? "先停一下，把自己还给自己。"}</h1>
              </header>

              <div className={styles.stageContent}>
                <section className={styles.nativeSection}>
                  <div className={styles.sectionHeader}>
                    <p className={styles.sectionLabel}>常用入口</p>
                    <button type="button" className={styles.sectionAction} onClick={() => setSheet("settings")}>
                      编辑
                    </button>
                  </div>

                  <div className={styles.shortcutField}>
                    {quickActivities.map((activity) => (
                      <button
                        key={activity.slug}
                        type="button"
                        className={styles.shortcutCard}
                        aria-label={activity.name}
                        onClick={() => handleStartActivity(activity)}
                        style={
                          {
                            "--card-start": activity.colorStart ?? "#dfe6e0",
                            "--card-end": activity.colorEnd ?? "#a6bbae",
                          } as CSSProperties
                        }
                      >
                        <span className={styles.shortcutIconWrap}>
                          <ActivityIcon iconKey={activity.iconKey} />
                        </span>
                        <span className={styles.shortcutTitle}>{activity.name}</span>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
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
              <button type="button" className={styles.noiseButton} onClick={() => void handleToggleAmbient()}>
                <NoiseIcon />
                <span>{timer.ambientOn ? "静噪已开" : "静噪"}</span>
              </button>
            </div>

            <div className={styles.timerCenter}>
              <p className={styles.timerLabel}>这段时间正在慢慢属于你</p>
              <p className={styles.timerValue}>{formatDuration(Math.floor(elapsedMs / 1000))}</p>
            </div>

            <div className={styles.timerControls}>
              <button type="button" className={styles.endButton} onClick={handleFinishTimer}>
                结束
              </button>
              <button type="button" className={styles.pauseButton} onClick={handlePauseOrResume}>
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
            <p className={styles.resultLead}>你刚刚完成了 {result.activity.name}</p>
            <h2 className={styles.resultDuration}>{formatDuration(result.durationSec)}</h2>
            <p className={styles.resultCopy}>{result.copy.content}</p>
            {result.snackSummary ? <p className={styles.resultSnack}>{result.snackSummary}</p> : null}

            {result.droppedCard ? (
              <article className={styles.cardDrop}>
                <p className={styles.cardDropLead}>掉落句子卡片</p>
                <h3 className={styles.cardDropTitle}>{result.droppedCard.title}</h3>
                <p className={styles.cardDropContent}>{result.droppedCard.content}</p>
              </article>
            ) : null}

            <div className={styles.resultActions}>
              <button type="button" className={styles.primaryButton} onClick={handleBackToForest}>
                回到森林
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleBackToForest}
              >
                再停一下
              </button>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

        <AnimatePresence>
          {sheet === "settings" && view === "forest" ? (
            <OverlaySheet title="常用入口" onClose={() => setSheet(null)}>
              <div className={styles.settingsPanel}>
                <section className={styles.sheetSection}>
                  <p className={styles.sheetSectionLabel}>选择显示在首页的入口</p>
                  <p className={styles.sheetNote}>最多四个，至少保留一个。</p>
                  <div className={styles.sheetGroup}>
                    <div className={styles.shortcutPicker}>
                      {activities.map((activity) => {
                        const active = store.quickActivitySlugs.includes(activity.slug);

                        return (
                          <button
                            key={activity.slug}
                            type="button"
                            className={active ? `${styles.shortcutPickerItem} ${styles.shortcutPickerItemActive}` : styles.shortcutPickerItem}
                            onClick={() => handleToggleQuickActivity(activity.slug)}
                          >
                            <span className={styles.shortcutPickerIcon}>
                              <ActivityIcon iconKey={activity.iconKey} />
                            </span>
                            <span>{activity.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>
              </div>
            </OverlaySheet>
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
        initial={{ y: "100%", opacity: 0.9 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0.9 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className={styles.sheetHandle} />
        <header className={styles.sheetHeader}>
          <h2 className={styles.sheetTitle}>{title}</h2>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </header>
        {children}
      </motion.section>
    </>
  );
}

function ActivityIcon({ iconKey }: { iconKey: string }) {
  if (iconKey === "cup") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
        <path
          fill="currentColor"
          d="M2 21h18v-2H2v2zm18-13h-2V6H4v8c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-2 5h-2V8h2v5z"
        />
      </svg>
    );
  }

  if (iconKey === "leaf") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
        <path
          fill="currentColor"
          d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66l6.66-5.81c.88-.2 1.74-.53 2.54-1.02.7-.44 1.34-.96 1.9-1.57.81-.88 1.45-1.92 1.83-3.05.35-1.06.54-2.19.54-3.34V4L17 8z"
        />
      </svg>
    );
  }

  if (iconKey === "trail") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
        <path
          fill="currentColor"
          d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7z"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      <path
        fill="currentColor"
        d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
      />
    </svg>
  );
}

function NoiseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      <path
        fill="currentColor"
        d="M5 14.5h2.2l2.1-6 3.2 10 2.1-7H19a1 1 0 1 1 0 2h-3.6l-2.1 7-3.2-10-1.9 5.5H5a1 1 0 1 1 0-2Z"
      />
    </svg>
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
