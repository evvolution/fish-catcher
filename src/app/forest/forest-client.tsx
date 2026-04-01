"use client";

import type { MutableRefObject, ReactNode } from "react";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
      {currentBackgroundRecord ? (
        <Image
          src={currentBackgroundRecord.imagePath}
          alt=""
          fill
          priority
          sizes="100vw"
          className={styles.backgroundImage}
        />
      ) : null}
      <div className={styles.backgroundScrim} aria-hidden="true" />

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
              <div>
                <p className={styles.eyebrow}>Gap Moment</p>
                <h1 className={styles.brand}>间隙时光</h1>
              </div>
              <span className={styles.guestBadge}>游客森林</span>
            </header>

            <section className={styles.heroCard}>
              <p className={styles.heroLead}>林间漫步</p>
              <h2 className={styles.heroTitle}>{greeting?.content ?? "先停一下，不急着把自己交回给待办。"} </h2>
              <p className={styles.heroMeta}>
                {activeCity ? `${activeCity.name} · ` : ""}
                {store.profile.industrySlug
                  ? industryOptions.find((option) => option.value === store.profile.industrySlug)?.label ?? "游客"
                  : "未限定行业"}
              </p>
            </section>

            <section className={styles.actionSection}>
              <div className={styles.sectionHeading}>
                <p className={styles.sectionEyebrow}>驻足时刻</p>
                <p className={styles.sectionHint}>点一个图标就开始，不需要确认。</p>
              </div>

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
                      <ActivityIcon iconKey={activity.iconKey} />
                    </span>
                  </button>
                ))}
              </div>

              <p className={styles.promptText}>
                {activities[0]?.prompt ?? "今天不必强撑，先给自己一个小空白。"}
              </p>
            </section>

            <section className={styles.recordSection}>
              <div className={styles.sectionHeading}>
                <p className={styles.sectionEyebrow}>回音</p>
                <p className={styles.sectionHint}>最近留下来的几段间隙时光。</p>
              </div>

              <div className={styles.recordList}>
                {store.records.length ? (
                  store.records.slice(0, 3).map((record) => (
                    <article key={record.id} className={styles.recordCard}>
                      <div>
                        <p className={styles.recordActivity}>{record.activityName}</p>
                        <p className={styles.recordCopy}>{record.copyContent}</p>
                      </div>
                      <span className={styles.recordDuration}>{formatDuration(record.durationSec)}</span>
                    </article>
                  ))
                ) : (
                  <article className={styles.emptyCard}>
                    第一次驻足还没发生。等你点亮一个图标，这片森林就会开始记住你。
                  </article>
                )}
              </div>
            </section>

            <footer className={styles.bottomDock}>
              <button type="button" className={styles.dockButton} onClick={() => setSheet("album")}>
                <BookIcon />
                <span>{store.cards.length} 张卡</span>
              </button>
              <button type="button" className={styles.dockButton} onClick={() => setSheet("settings")}>
                <GearIcon />
                <span>设置</span>
              </button>
              <Link href="/operator" className={styles.operatorLink}>
                运营内容台
              </Link>
            </footer>
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
                onClick={() => {
                  setSheet("album");
                  handleBackToForest();
                }}
              >
                查看卡册
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
                    <button type="button" className={styles.deleteButton} onClick={() => handleDeleteCard(card.id)}>
                      删除
                    </button>
                  </article>
                ))
              ) : (
                <article className={styles.emptyCard}>
                  还没有掉落卡片。等某个时刻刚好被你认真对待，森林会把一句话交给你。
                </article>
              )}
            </div>
          </OverlaySheet>
        ) : null}

        {sheet === "settings" && view === "forest" ? (
          <OverlaySheet title="设置" onClose={() => setSheet(null)}>
            <div className={styles.settingsPanel}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>所在城市</span>
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
                <span className={styles.fieldLabel}>行业标签（可选）</span>
                <div className={styles.choiceWrap}>
                  <button
                    type="button"
                    className={industryDraft ? styles.choiceChip : `${styles.choiceChip} ${styles.choiceChipActive}`}
                    onClick={() => setIndustryDraft("")}
                  >
                    暂不限定
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

              <p className={styles.settingsHint}>
                游客模式下，记录和卡片默认只保存在当前浏览器。运营内容管理页暂时不加权限，方便你先做内容迭代。
              </p>

              <div className={styles.sheetActions}>
                <button type="button" className={styles.primaryButton} onClick={handleSaveProfile}>
                  保存设置
                </button>
                <Link href="/operator" className={styles.inlineLink}>
                  打开运营内容台
                </Link>
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
              <p className={styles.onboardingLead}>第一次进森林</p>
              <h2 className={styles.onboardingTitle}>先帮你把趣味换算和文案语气调顺一点。</h2>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>你所在的城市</span>
                <select className={styles.select} value={cityDraft} onChange={(event) => setCityDraft(event.target.value)}>
                  {cityOptions.map((city) => (
                    <option key={city.value} value={city.value}>
                      {city.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>行业标签（可选）</span>
                <div className={styles.choiceWrap}>
                  <button
                    type="button"
                    className={industryDraft ? styles.choiceChip : `${styles.choiceChip} ${styles.choiceChipActive}`}
                    onClick={() => setIndustryDraft("")}
                  >
                    先空着
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
          d="M6 4h9a1 1 0 0 1 1 1v1h1.5A2.5 2.5 0 0 1 20 8.5 2.5 2.5 0 0 1 17.5 11H17a6 6 0 0 1-6 5 6 6 0 0 1-6-6V5a1 1 0 0 1 1-1Zm10 4v1a4 4 0 0 0 .42 1.78h1.08a1.5 1.5 0 1 0 0-3H16Zm-8 10h10a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2Z"
        />
      </svg>
    );
  }

  if (iconKey === "leaf") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
        <path
          fill="currentColor"
          d="M18.3 4.5C10.88 4.5 6 9.67 6 15.3c0 2.53 1.4 4.2 3.94 4.2 3.35 0 6.8-3.02 7.1-8.44-.95 2.8-3.2 5.33-6.47 6.7a.8.8 0 0 1-.62-1.48c4.1-1.72 6.58-5.11 7-8.82.05-.51.49-.9 1-.9Z"
        />
      </svg>
    );
  }

  if (iconKey === "trail") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
        <path
          fill="currentColor"
          d="M8.5 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm.7 5.5a2 2 0 0 1 1.66.88l2.46 3.62 2.45 1.02a1 1 0 1 1-.76 1.84l-2.74-1.14a2 2 0 0 1-.91-.74l-.92-1.36-1.06 4.7a1 1 0 0 1-.98.78H6.5a1 1 0 1 1 0-2h1.11l1.05-4.63-1.13 1.3A1 1 0 0 1 6 13.88l2-2.3A2 2 0 0 1 9.2 9Z"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      <path
        fill="currentColor"
        d="M12.2 5.5c3.96 0 6.8 2.47 6.8 5.78 0 1.43-.55 2.73-1.5 3.74l.58 2.48-2.5-1.22a8.65 8.65 0 0 1-3.38.67c-3.95 0-6.79-2.46-6.79-5.67 0-3.3 2.84-5.78 6.79-5.78Z"
      />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      <path
        fill="currentColor"
        d="M6 4.5h9.4A2.6 2.6 0 0 1 18 7.1v10.4a.5.5 0 0 1-.8.4c-.6-.45-1.24-.68-1.9-.68H6.9A2.9 2.9 0 0 1 4 14.32V7.4A2.9 2.9 0 0 1 6.9 4.5H6Zm1 2a.9.9 0 0 0-.9.9v6.92c0 .5.4.9.9.9h8.66c.43 0 .84.08 1.24.24V7.1a.6.6 0 0 0-.6-.6H7Z"
      />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      <path
        fill="currentColor"
        d="M10.16 3.66a1 1 0 0 1 1.18-.79l1.17.24a1 1 0 0 1 .79 1.18l-.1.48a7.4 7.4 0 0 1 1.6.92l.4-.28a1 1 0 0 1 1.39.24l.7.97a1 1 0 0 1-.24 1.39l-.39.28a7.3 7.3 0 0 1 .3 1.84l.48.1a1 1 0 0 1 .79 1.18l-.24 1.17a1 1 0 0 1-1.18.79l-.48-.1a7.4 7.4 0 0 1-.92 1.6l.28.4a1 1 0 0 1-.24 1.39l-.97.7a1 1 0 0 1-1.39-.24l-.28-.39a7.3 7.3 0 0 1-1.84.3l-.1.48a1 1 0 0 1-1.18.79l-1.17-.24a1 1 0 0 1-.79-1.18l.1-.48a7.4 7.4 0 0 1-1.6-.92l-.4.28a1 1 0 0 1-1.39-.24l-.7-.97a1 1 0 0 1 .24-1.39l.39-.28a7.3 7.3 0 0 1-.3-1.84l-.48-.1a1 1 0 0 1-.79-1.18l.24-1.17a1 1 0 0 1 1.18-.79l.48.1a7.4 7.4 0 0 1 .92-1.6l-.28-.4a1 1 0 0 1 .24-1.39l.97-.7a1 1 0 0 1 1.39.24l.28.39a7.3 7.3 0 0 1 1.84-.3l.1-.48ZM12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
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
