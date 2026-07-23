<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

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
} from "@moyu-core/moyu-engine";
import { regionalCatalog } from "@moyu-core/regional-catalog";
import type {
  ActivityRecord,
  ForestCatalog,
  ForestResult,
  GuestForestStore,
} from "@moyu-core/moyu-types";

type Screen = "forest" | "timer" | "result";
type Sheet = null | "library" | "settings";
type LibraryTab = "cards" | "logs" | "backpack";
type TimerState = {
  activitySlug: string;
  startedAt: number;
  accumulatedMs: number;
  segmentStartedAt: number | null;
  backgroundSlug: string | null;
};
type BootstrapResponse = {
  ok: boolean;
  apiVersion: number;
  assetBaseUrl: string;
  catalog: ForestCatalog;
};
type PickerEvent = { detail: { value: string | number } };

const STORAGE_KEY = "moyu.guest-store.v1";
const LEGACY_STORAGE_KEY = "gap-moment.guest-store.v1";
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "https://fish.nefelibata.ink").replace(/\/$/, "");
const assetBaseUrl = ref((import.meta.env.VITE_ASSET_BASE_URL || "https://apex-res.nefelibata.ink/fish").replace(/\/$/, ""));

const loading = ref(true);
const loadError = ref("");
const catalog = ref<ForestCatalog | null>(null);
const store = ref<GuestForestStore>(createEmptyGuestStore());
const hydrated = ref(false);
const screen = ref<Screen>("forest");
const sheet = ref<Sheet>(null);
const libraryTab = ref<LibraryTab>("cards");
const timer = ref<TimerState | null>(null);
const elapsedMs = ref(0);
const result = ref<ForestResult | null>(null);
const homeGreetingId = ref<string | null>(null);
const homeBackgroundSlug = ref<string | null>(null);
const welcomeVisible = ref(true);
const welcomeFishIndex = ref(0);
const fishViewingStartedAt = ref(Date.now());
const provinceIndex = ref(0);
const cityIndex = ref(0);
const districtIndex = ref(0);
const industryIndex = ref(0);

const activities = computed(() => catalog.value?.activities ?? []);
const backgrounds = computed(() => new Map((catalog.value?.backgrounds ?? []).map((item) => [item.slug, item])));
const activityMap = computed(() => new Map(activities.value.map((item) => [item.slug, item])));
const copyMap = computed(() => new Map((catalog.value?.copyEntries ?? []).map((item) => [item.id, item])));
const welcomeFish = computed(() => catalog.value?.fishes[welcomeFishIndex.value % (catalog.value.fishes.length || 1)] ?? null);
const greeting = computed(() => homeGreetingId.value ? copyMap.value.get(homeGreetingId.value) ?? null : null);
const industryOptions = computed(() => catalog.value?.dimensionGroups.find((group) => group.key === "industry")?.options ?? []);
const industryLabels = computed(() => ["暂不设置", ...industryOptions.value.map((item) => item.label)]);
const provinces = computed(() => regionalCatalog.regions);
const provinceLabels = computed(() => provinces.value.map((item) => item.name));
const selectedProvince = computed(() => provinces.value[provinceIndex.value] ?? provinces.value[0]);
const cities = computed(() => regionalCatalog.cities.filter((item) => item.provinceCode === selectedProvince.value?.code));
const cityLabels = computed(() => cities.value.map((item) => item.officialName));
const selectedCity = computed(() => cities.value[cityIndex.value] ?? cities.value[0]);
const districts = computed(() => selectedCity.value?.districts ?? []);
const districtLabels = computed(() => districts.value.map((item) => item.name));
const selectedDistrict = computed(() => districts.value[districtIndex.value] ?? districts.value[0]);
const onboardingOpen = computed(() => hydrated.value && !store.value.profile.hasSeenOnboarding);
const activeIndustryLabel = computed(() => store.value.profile.industrySlug
  ? industryOptions.value.find((item) => item.slug === store.value.profile.industrySlug)?.label ?? "未设置职业"
  : store.value.profile.industryName ?? "未设置职业");
const activeRegionLabel = computed(() => [
  store.value.profile.provinceName,
  store.value.profile.cityName,
  store.value.profile.districtName,
].filter(Boolean).join(" ") || "未设置地区");
const currentBackground = computed(() => {
  const slug = screen.value === "result"
    ? result.value?.background?.slug
    : timer.value?.backgroundSlug ?? homeBackgroundSlug.value;
  return slug ? backgrounds.value.get(slug) ?? null : catalog.value?.backgrounds[0] ?? null;
});
const currentActivityName = computed(() => timer.value
  ? activityMap.value.get(timer.value.activitySlug)?.name ?? "驻足"
  : "驻足");
const backpack = computed(() => buildFoodBackpack(store.value.profile, store.value.totalAttentionCents));

let tickInterval: ReturnType<typeof setInterval> | null = null;
let atmosphereInterval: ReturnType<typeof setInterval> | null = null;

function assetUrl(path: string | null | undefined) {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return `${assetBaseUrl.value}${path.startsWith("/") ? path : `/${path}`}`;
}

function iconUrl(key: string) {
  const icons: Record<string, string> = { cup: "coffee", leaf: "wind", trail: "walk", cloud: "cloud" };
  return assetUrl(`/assets/icons/${icons[key] ?? "cloud"}.svg`);
}

function requestBootstrap() {
  return new Promise<BootstrapResponse>((resolve, reject) => {
    uni.request({
      url: `${apiBaseUrl}/api/v1/bootstrap`,
      method: "GET",
      timeout: 20_000,
      success: (response) => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data as BootstrapResponse);
          return;
        }
        reject(new Error(`服务暂时不可用（${response.statusCode}）`));
      },
      fail: (error) => reject(new Error(error.errMsg || "无法连接服务")),
    });
  });
}

async function boot() {
  loading.value = true;
  loadError.value = "";
  try {
    const response = await requestBootstrap();
    if (!response.ok || response.apiVersion !== 1 || !response.catalog) throw new Error("服务版本不兼容");
    catalog.value = response.catalog;
    assetBaseUrl.value = (response.assetBaseUrl || assetBaseUrl.value).replace(/\/$/, "");
    hydrateStore();
    applyHomeAtmosphere();
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : "森林加载失败";
  } finally {
    loading.value = false;
  }
}

function hydrateStore() {
  try {
    const current = uni.getStorageSync(STORAGE_KEY) || uni.getStorageSync(LEGACY_STORAGE_KEY);
    const parsed = typeof current === "string" ? JSON.parse(current) : current;
    store.value = sanitizeGuestStore(parsed);
  } catch {
    store.value = createEmptyGuestStore();
  }
  syncPickersFromProfile();
  hydrated.value = true;
}

function syncPickersFromProfile() {
  const profile = store.value.profile;
  const province = provinces.value.findIndex((item) => item.code === profile.provinceCode);
  provinceIndex.value = province >= 0 ? province : 0;
  const city = cities.value.findIndex((item) => item.code === profile.cityCode || item.slug === profile.citySlug);
  cityIndex.value = city >= 0 ? city : 0;
  const district = districts.value.findIndex((item) => item.code === profile.districtCode);
  districtIndex.value = district >= 0 ? district : 0;
  const industry = industryOptions.value.findIndex((item) => item.slug === profile.industrySlug);
  industryIndex.value = industry >= 0 ? industry + 1 : 0;
}

function applyHomeAtmosphere() {
  if (!catalog.value) return;
  homeGreetingId.value = pickGreetingEntry(catalog.value, store.value.profile)?.id ?? null;
  homeBackgroundSlug.value = pickBackground(catalog.value, null, store.value.profile)?.slug ?? null;
}

function rotateAtmosphere() {
  if (!catalog.value) return;
  if (welcomeVisible.value && catalog.value.fishes.length > 1) {
    welcomeFishIndex.value = (welcomeFishIndex.value + 1) % catalog.value.fishes.length;
    return;
  }
  if (screen.value !== "forest" || sheet.value || onboardingOpen.value) return;
  const candidates = catalog.value.copyEntries.filter((entry) =>
    (entry.kind === "GREETING" || (entry.kind === "RESULT" && entry.content.length <= 42))
    && entry.id !== homeGreetingId.value);
  homeGreetingId.value = candidates[Math.floor(Math.random() * candidates.length)]?.id ?? homeGreetingId.value;
}

function dismissWelcome() {
  const fish = welcomeFish.value;
  if (fish) {
    const endedAt = new Date();
    const startedAt = new Date(Math.min(fishViewingStartedAt.value, endedAt.getTime()));
    const durationSec = Math.max(1, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));
    store.value = appendFishViewingToStore(store.value, {
      fish,
      durationSec,
      snackSummary: buildSnackSummary(store.value.profile, durationSec),
      startedAt,
      endedAt,
    });
  }
  welcomeVisible.value = false;
}

function openFish() {
  welcomeFishIndex.value = Math.floor(Math.random() * (catalog.value?.fishes.length || 1));
  fishViewingStartedAt.value = Date.now();
  welcomeVisible.value = true;
}

function startActivity(activity: ActivityRecord) {
  if (!catalog.value) return;
  const now = Date.now();
  result.value = null;
  sheet.value = null;
  timer.value = {
    activitySlug: activity.slug,
    startedAt: now,
    accumulatedMs: 0,
    segmentStartedAt: now,
    backgroundSlug: pickBackground(catalog.value, activity.slug, store.value.profile)?.slug ?? null,
  };
  screen.value = "timer";
}

function pauseOrResume() {
  if (!timer.value) return;
  if (timer.value.segmentStartedAt) {
    timer.value.accumulatedMs += Date.now() - timer.value.segmentStartedAt;
    timer.value.segmentStartedAt = null;
  } else {
    timer.value.segmentStartedAt = Date.now();
  }
}

function finishTimer() {
  if (!timer.value || !catalog.value) return;
  const endedAt = new Date();
  const activity = activityMap.value.get(timer.value.activitySlug);
  if (!activity) return backToForest();
  const durationSec = Math.max(1, Math.floor((timer.value.accumulatedMs
    + (timer.value.segmentStartedAt ? endedAt.getTime() - timer.value.segmentStartedAt : 0)) / 1000));
  const copy = pickResultCopy(
    catalog.value,
    activity.slug,
    durationSec,
    store.value.profile,
    store.value.recentCopyIds,
    endedAt,
  ) ?? catalog.value.copyEntries.find((entry) => entry.kind === "RESULT") ?? null;
  if (!copy) return backToForest();
  const background = (timer.value.backgroundSlug ? backgrounds.value.get(timer.value.backgroundSlug) ?? null : null)
    ?? pickBackground(catalog.value, activity.slug, store.value.profile, endedAt);
  const snackSummary = buildSnackSummary(store.value.profile, durationSec);
  const droppedCard = maybeDropCard(catalog.value, activity, store.value.profile, endedAt, background?.slug ?? null);
  result.value = { activity, durationSec, copy, background, snackSummary, droppedCard };
  store.value = appendResultToStore(store.value, {
    activity,
    durationSec,
    copy,
    snackSummary,
    backgroundSlug: background?.slug ?? null,
    droppedCard,
    startedAt: new Date(timer.value.startedAt),
    endedAt,
  });
  timer.value = null;
  screen.value = "result";
}

function backToForest() {
  timer.value = null;
  result.value = null;
  screen.value = "forest";
  applyHomeAtmosphere();
}

function openLibrary(tab: LibraryTab) {
  libraryTab.value = tab;
  sheet.value = "library";
}

function deleteCard(cardId: string) {
  uni.showModal({
    title: "删除卡片",
    content: "这张卡片删除后无法恢复。",
    success: ({ confirm }) => {
      if (confirm) store.value = { ...store.value, cards: store.value.cards.filter((card) => card.id !== cardId) };
    },
  });
}

function onProvinceChange(event: PickerEvent) {
  provinceIndex.value = Number(event.detail.value);
  cityIndex.value = 0;
  districtIndex.value = 0;
}

function onCityChange(event: PickerEvent) {
  cityIndex.value = Number(event.detail.value);
  districtIndex.value = 0;
}

function onDistrictChange(event: PickerEvent) {
  districtIndex.value = Number(event.detail.value);
}

function onIndustryChange(event: PickerEvent) {
  industryIndex.value = Number(event.detail.value);
}

function saveProfile() {
  const city = selectedCity.value;
  const district = selectedDistrict.value;
  if (!selectedProvince.value || !city || !district) {
    uni.showToast({ title: "请选择完整地区", icon: "none" });
    return;
  }
  const industry = industryIndex.value > 0 ? industryOptions.value[industryIndex.value - 1] : null;
  store.value = {
    ...store.value,
    profile: {
      provinceCode: selectedProvince.value.code,
      provinceName: selectedProvince.value.name,
      cityCode: city.code,
      citySlug: city.slug,
      cityName: city.name,
      districtCode: district.code,
      districtName: district.name,
      industrySlug: industry?.slug ?? null,
      industryName: industry?.label ?? null,
      hasSeenOnboarding: true,
    },
  };
  sheet.value = null;
  applyHomeAtmosphere();
}

function formatRecordTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatAmount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0$/, "");
}

watch(store, (value) => {
  if (hydrated.value) uni.setStorageSync(STORAGE_KEY, value);
}, { deep: true });

onMounted(() => {
  void boot();
  tickInterval = setInterval(() => {
    const current = timer.value;
    elapsedMs.value = current
      ? current.accumulatedMs + (current.segmentStartedAt ? Date.now() - current.segmentStartedAt : 0)
      : 0;
  }, 250);
  atmosphereInterval = setInterval(rotateAtmosphere, 5_000);
});

onBeforeUnmount(() => {
  if (tickInterval) clearInterval(tickInterval);
  if (atmosphereInterval) clearInterval(atmosphereInterval);
});
</script>

<template>
  <view class="page-shell">
    <view v-if="loading" class="state-card">
      <text class="state-title">正在走进森林…</text>
      <text class="state-copy">风会慢一点，内容也会。</text>
    </view>

    <view v-else-if="loadError" class="state-card">
      <text class="state-title">森林暂时没有回应</text>
      <text class="state-copy">{{ loadError }}</text>
      <button class="primary-button compact" @click="boot">再试一次</button>
    </view>

    <template v-else-if="catalog">
      <image v-if="currentBackground" class="background" :src="assetUrl(currentBackground.imagePath)" mode="aspectFill" />
      <view class="background-scrim" />

      <view class="content-shell">
        <view v-if="screen === 'forest'" class="forest-stage">
          <view class="top-bar">
            <button class="round-button" aria-label="打开卡册" @click="openLibrary('cards')">
              <image class="button-icon" :src="assetUrl('/assets/icons/book.svg')" mode="aspectFit" />
            </button>
            <button class="profile-button" @click="sheet = 'settings'; syncPickersFromProfile()">
              <view class="profile-copy">
                <text class="profile-main">{{ activeIndustryLabel }}</text>
                <text class="profile-sub">{{ activeRegionLabel }}</text>
              </view>
              <image class="button-icon" :src="assetUrl('/assets/icons/settings.svg')" mode="aspectFit" />
            </button>
          </view>
          <view class="hero-card">
            <text class="hero-title">{{ greeting?.content ?? '先停一下，不急着把自己交回给待办。' }}</text>
            <text class="hero-meta">{{ greeting?.title ?? '摸鱼森林' }}</text>
          </view>
        </view>

        <view v-else-if="screen === 'timer' && timer" class="timer-stage">
          <text class="eyebrow">{{ currentActivityName }}</text>
          <text class="timer-value">{{ formatDuration(Math.floor(elapsedMs / 1000)) }}</text>
          <text class="timer-hint">这段时间不需要交代用途。</text>
          <view class="action-row">
            <button class="secondary-button" @click="finishTimer">
              <image class="inline-icon" :src="assetUrl('/assets/icons/stop.svg')" mode="aspectFit" />结束
            </button>
            <button class="primary-button" @click="pauseOrResume">
              <image class="inline-icon" :src="assetUrl(timer.segmentStartedAt ? '/assets/icons/pause.svg' : '/assets/icons/play.svg')" mode="aspectFit" />
              {{ timer.segmentStartedAt ? '暂停' : '继续' }}
            </button>
          </view>
        </view>

        <scroll-view v-else-if="result" class="result-stage" scroll-y>
          <text class="eyebrow">{{ result.activity.name }}</text>
          <text class="result-duration">{{ formatDuration(result.durationSec) }}</text>
          <text class="result-copy">{{ result.copy.content }}</text>
          <text class="result-source">{{ result.copy.title }}</text>
          <text class="snack-copy">{{ result.snackSummary }}</text>
          <view v-if="result.droppedCard" class="drop-card">
            <text class="drop-label">捡到一张句子</text>
            <text class="drop-title">{{ result.droppedCard.title }}</text>
            <text class="drop-content">{{ result.droppedCard.content }}</text>
          </view>
          <view class="action-row result-actions">
            <button class="primary-button" @click="backToForest">回到森林</button>
            <button class="secondary-button" @click="backToForest(); openLibrary('logs')">查看日志</button>
          </view>
        </scroll-view>

        <view v-if="screen !== 'result' && !onboardingOpen" class="bottom-nav">
          <button
            v-for="activity in activities"
            :key="activity.slug"
            class="nav-item"
            :class="{ active: timer?.activitySlug === activity.slug }"
            :disabled="Boolean(timer && timer.activitySlug !== activity.slug)"
            @click="timer?.activitySlug === activity.slug ? screen = 'timer' : startActivity(activity)"
          >
            <view class="nav-icon-wrap" :style="{ background: `linear-gradient(135deg, ${activity.colorStart ?? '#dfe6e0'}, ${activity.colorEnd ?? '#a6bbae'})` }">
              <image class="nav-icon" :src="iconUrl(activity.iconKey)" mode="aspectFit" />
            </view>
            <text class="nav-label">{{ activity.name }}</text>
          </button>
          <button class="nav-item" @click="openFish">
            <view class="nav-icon-wrap fish-icon-wrap">
              <image class="nav-icon" :src="assetUrl('/assets/icons/fish.svg')" mode="aspectFit" />
            </view>
            <text class="nav-label">看鱼</text>
          </button>
        </view>
      </view>

      <view v-if="welcomeVisible" class="welcome-overlay">
        <image class="welcome-background" :src="assetUrl('/assets/backgrounds/mist-lake-dawn.webp')" mode="aspectFill" />
        <view class="welcome-scrim" />
        <view class="welcome-content" @click="dismissWelcome">
          <text class="welcome-title">你一定要记得摸鱼</text>
          <view v-if="welcomeFish" class="fish-card" @click.stop>
            <view class="fish-image-wrap">
              <image class="fish-image" :src="assetUrl(welcomeFish.imagePath)" mode="aspectFit" />
              <text class="fish-habitat">{{ welcomeFish.habitatLabel }}</text>
            </view>
            <text class="fish-name">{{ welcomeFish.commonNameZh }}</text>
            <text class="fish-latin">{{ welcomeFish.scientificName }}</text>
            <text class="fish-summary">{{ welcomeFish.summary }}</text>
            <text class="fish-fact">习性 · {{ welcomeFish.habits }}</text>
            <text class="fish-fact">分布 · {{ welcomeFish.distribution }}</text>
          </view>
          <text class="welcome-hint">轻触空白处，回到森林</text>
        </view>
      </view>

      <view v-if="onboardingOpen || sheet === 'settings'" class="modal-backdrop">
        <scroll-view class="settings-card" scroll-y>
          <view class="sheet-header">
            <text class="sheet-title">{{ onboardingOpen ? '你在哪里？' : '区域 / 职业' }}</text>
            <button v-if="!onboardingOpen" class="close-button" @click="sheet = null">×</button>
          </view>
          <text class="field-label">省份</text>
          <picker :range="provinceLabels" :value="provinceIndex" @change="onProvinceChange">
            <view class="picker-field">{{ selectedProvince?.name ?? '请选择' }}</view>
          </picker>
          <text class="field-label">城市</text>
          <picker :range="cityLabels" :value="cityIndex" @change="onCityChange">
            <view class="picker-field">{{ selectedCity?.officialName ?? '请选择' }}</view>
          </picker>
          <text class="field-label">区县</text>
          <picker :range="districtLabels" :value="districtIndex" @change="onDistrictChange">
            <view class="picker-field">{{ selectedDistrict?.name ?? '请选择' }}</view>
          </picker>
          <text class="field-label">职业（可跳过）</text>
          <picker :range="industryLabels" :value="industryIndex" @change="onIndustryChange">
            <view class="picker-field">{{ industryLabels[industryIndex] }}</view>
          </picker>
          <button class="primary-button save-button" @click="saveProfile">{{ onboardingOpen ? '进入森林' : '保存' }}</button>
        </scroll-view>
      </view>

      <view v-if="sheet === 'library'" class="modal-backdrop" @click="sheet = null">
        <view class="library-sheet" @click.stop>
          <view class="sheet-header">
            <text class="sheet-title">我的森林</text>
            <button class="close-button" @click="sheet = null">×</button>
          </view>
          <view class="tab-row">
            <button class="tab-button" :class="{ active: libraryTab === 'cards' }" @click="libraryTab = 'cards'">卡册</button>
            <button class="tab-button" :class="{ active: libraryTab === 'logs' }" @click="libraryTab = 'logs'">日志</button>
            <button class="tab-button" :class="{ active: libraryTab === 'backpack' }" @click="libraryTab = 'backpack'">背包</button>
          </view>
          <scroll-view class="library-list" scroll-y>
            <template v-if="libraryTab === 'cards'">
              <text v-if="!store.cards.length" class="empty-copy">还没有捡到句子。先去林子里待一会儿。</text>
              <view v-for="card in store.cards" :key="card.id" class="library-card">
                <view class="card-heading">
                  <text class="library-card-title">{{ card.title }}</text>
                  <button class="delete-button" @click="deleteCard(card.id)">删除</button>
                </view>
                <text class="library-card-copy">{{ card.content }}</text>
                <text class="library-meta">{{ formatRecordTime(card.collectedAt) }}</text>
              </view>
            </template>
            <template v-else-if="libraryTab === 'logs'">
              <text v-if="!store.records.length" class="empty-copy">还没有摸鱼日志。</text>
              <view v-for="record in store.records" :key="record.id" class="library-card">
                <view class="card-heading">
                  <text class="library-card-title">{{ record.activityName }} · {{ formatDuration(record.durationSec) }}</text>
                  <text class="library-meta">{{ formatRecordTime(record.endedAt) }}</text>
                </view>
                <text class="library-card-copy">{{ record.copyContent }}</text>
                <text v-if="record.snackSummary" class="library-meta">{{ record.snackSummary }}</text>
              </view>
            </template>
            <template v-else>
              <text class="backpack-total">累计收好 ¥{{ (store.totalAttentionCents / 100).toFixed(2) }} 的碎片时光</text>
              <text v-if="!backpack.length" class="empty-copy">再待一会儿，背包里会慢慢多起来。</text>
              <view v-for="item in backpack" :key="item.name" class="backpack-row">
                <text class="library-card-title">{{ item.name }}</text>
                <text class="backpack-amount">{{ formatAmount(item.amount) }}{{ item.unit }}</text>
              </view>
            </template>
          </scroll-view>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped>
.page-shell { position: relative; width: 100%; height: 100vh; overflow: hidden; background: #10252a; }
.background, .background-scrim { position: absolute; inset: 0; width: 100%; height: 100%; }
.background-scrim { background: linear-gradient(180deg, rgba(5, 19, 23, .28), rgba(8, 22, 25, .56) 62%, rgba(8, 20, 23, .84)); }
.content-shell { position: relative; z-index: 2; width: 100%; max-width: 1120rpx; height: 100%; margin: 0 auto; }
.forest-stage { box-sizing: border-box; height: 100%; padding: calc(env(safe-area-inset-top) + 30rpx) 34rpx 230rpx; }
.top-bar, .profile-button, .action-row, .sheet-header, .tab-row, .card-heading, .backpack-row { display: flex; align-items: center; }
.top-bar { justify-content: space-between; }
.round-button, .profile-button, .close-button, .delete-button, .tab-button, .nav-item { margin: 0; padding: 0; color: inherit; line-height: 1; background: transparent; }
.round-button { display: flex; align-items: center; justify-content: center; width: 82rpx; height: 82rpx; border-radius: 50%; background: rgba(242, 239, 225, .14); backdrop-filter: blur(18px); }
.button-icon { width: 38rpx; height: 38rpx; filter: brightness(0) invert(1); }
.profile-button { gap: 20rpx; justify-content: flex-end; min-height: 82rpx; padding: 0 24rpx; border-radius: 42rpx; background: rgba(242, 239, 225, .14); backdrop-filter: blur(18px); }
.profile-copy { display: flex; flex-direction: column; align-items: flex-end; max-width: 390rpx; }
.profile-main { font-size: 26rpx; font-weight: 600; }
.profile-sub { margin-top: 8rpx; overflow: hidden; color: rgba(255,255,255,.7); font-size: 20rpx; text-overflow: ellipsis; white-space: nowrap; }
.hero-card { display: flex; flex-direction: column; justify-content: flex-end; width: 82%; min-height: 440rpx; padding: 90rpx 8rpx; }
.hero-title { color: #fffdf5; font-family: "Songti SC", serif; font-size: 58rpx; font-weight: 600; line-height: 1.5; text-shadow: 0 4rpx 28rpx rgba(0,0,0,.32); }
.hero-meta, .result-source { margin-top: 26rpx; color: rgba(255,255,255,.65); font-size: 24rpx; }
.bottom-nav { position: absolute; right: 24rpx; bottom: calc(env(safe-area-inset-bottom) + 24rpx); left: 24rpx; display: flex; justify-content: space-around; padding: 20rpx 8rpx 18rpx; border: 1rpx solid rgba(255,255,255,.12); border-radius: 42rpx; background: rgba(12, 31, 35, .78); box-shadow: 0 20rpx 60rpx rgba(0,0,0,.28); backdrop-filter: blur(24px); }
.nav-item { display: flex; flex: 1; flex-direction: column; align-items: center; gap: 10rpx; opacity: .74; }
.nav-item.active { opacity: 1; }
.nav-item[disabled] { opacity: .28; }
.nav-icon-wrap { display: flex; align-items: center; justify-content: center; width: 72rpx; height: 72rpx; border-radius: 25rpx; }
.fish-icon-wrap { background: linear-gradient(135deg, #d9e9e5, #77aab2); }
.nav-icon { width: 36rpx; height: 36rpx; }
.nav-label { color: #f7f3e8; font-size: 20rpx; }
.timer-stage, .result-stage { box-sizing: border-box; height: 100%; padding: calc(env(safe-area-inset-top) + 150rpx) 48rpx calc(env(safe-area-inset-bottom) + 60rpx); text-align: center; }
.timer-stage { display: flex; flex-direction: column; align-items: center; justify-content: center; }
.eyebrow { color: rgba(255,255,255,.7); font-size: 25rpx; letter-spacing: 8rpx; }
.timer-value, .result-duration { display: block; margin: 44rpx 0 26rpx; color: #fffdf5; font-family: "Songti SC", serif; font-size: 88rpx; font-weight: 600; }
.timer-hint { color: rgba(255,255,255,.6); font-size: 24rpx; }
.action-row { justify-content: center; gap: 24rpx; width: 100%; margin-top: 100rpx; }
.primary-button, .secondary-button { display: flex; align-items: center; justify-content: center; gap: 14rpx; min-width: 240rpx; height: 92rpx; margin: 0; padding: 0 34rpx; border-radius: 46rpx; font-size: 28rpx; font-weight: 600; }
.primary-button { color: #173238; background: #f4eedc; }
.secondary-button { color: #f4eedc; border: 1rpx solid rgba(255,255,255,.35); background: rgba(15,36,40,.42); }
.primary-button.compact { min-width: 200rpx; margin-top: 42rpx; }
.inline-icon { width: 32rpx; height: 32rpx; }
.result-stage { text-align: left; }
.result-duration { font-size: 62rpx; }
.result-copy { display: block; margin-top: 52rpx; color: #fffdf5; font-family: "Songti SC", serif; font-size: 43rpx; font-weight: 600; line-height: 1.68; }
.snack-copy { display: block; margin-top: 46rpx; padding: 28rpx; border-radius: 28rpx; color: rgba(255,255,255,.72); font-size: 24rpx; line-height: 1.7; background: rgba(240,234,216,.11); }
.drop-card { display: flex; flex-direction: column; gap: 20rpx; margin-top: 34rpx; padding: 38rpx; border: 1rpx solid rgba(255,255,255,.2); border-radius: 34rpx; background: rgba(248,242,224,.12); }
.drop-label { color: #d8c99d; font-size: 20rpx; letter-spacing: 4rpx; }
.drop-title { font-size: 28rpx; font-weight: 600; }
.drop-content { font-family: "Songti SC", serif; font-size: 32rpx; line-height: 1.7; }
.result-actions { margin-bottom: 80rpx; }
.welcome-overlay, .welcome-background, .welcome-scrim, .modal-backdrop { position: fixed; inset: 0; width: 100%; height: 100%; }
.welcome-overlay { z-index: 20; background: #d9e5de; }
.welcome-scrim { background: linear-gradient(180deg, rgba(222,235,226,.28), rgba(18,45,49,.7)); }
.welcome-content { position: relative; z-index: 2; display: flex; box-sizing: border-box; flex-direction: column; align-items: center; height: 100%; padding: calc(env(safe-area-inset-top) + 42rpx) 34rpx calc(env(safe-area-inset-bottom) + 36rpx); }
.welcome-title { color: #14363a; font-family: "Songti SC", serif; font-size: 48rpx; font-weight: 700; letter-spacing: 8rpx; }
.fish-card { display: flex; flex-direction: column; box-sizing: border-box; width: 100%; max-width: 680rpx; margin: auto 0; padding: 34rpx; border: 1rpx solid rgba(255,255,255,.55); border-radius: 42rpx; color: #17373c; background: rgba(247,247,235,.78); box-shadow: 0 30rpx 90rpx rgba(14,45,49,.18); backdrop-filter: blur(24px); }
.fish-image-wrap { position: relative; height: 320rpx; }
.fish-image { width: 100%; height: 100%; }
.fish-habitat { position: absolute; right: 0; bottom: 0; padding: 10rpx 18rpx; border-radius: 22rpx; color: #f8f5e9; font-size: 20rpx; background: #557b7f; }
.fish-name { margin-top: 24rpx; font-size: 40rpx; font-weight: 700; }
.fish-latin { margin-top: 8rpx; color: #698083; font-family: serif; font-size: 21rpx; font-style: italic; }
.fish-summary { margin-top: 22rpx; font-size: 27rpx; line-height: 1.65; }
.fish-fact { margin-top: 15rpx; color: #4e696c; font-size: 22rpx; line-height: 1.55; }
.welcome-hint { color: rgba(255,255,255,.78); font-size: 22rpx; letter-spacing: 4rpx; }
.modal-backdrop { z-index: 30; display: flex; align-items: flex-end; justify-content: center; background: rgba(4,15,18,.62); }
.settings-card, .library-sheet { box-sizing: border-box; width: 100%; max-width: 1120rpx; max-height: 88vh; padding: 38rpx 34rpx calc(env(safe-area-inset-bottom) + 38rpx); border-radius: 44rpx 44rpx 0 0; color: #1b3538; background: #f4f0e4; }
.sheet-header { justify-content: space-between; margin-bottom: 30rpx; }
.sheet-title { font-family: "Songti SC", serif; font-size: 40rpx; font-weight: 700; }
.close-button { width: 60rpx; color: #66777a; font-size: 52rpx; }
.field-label { display: block; margin: 28rpx 0 12rpx; color: #637477; font-size: 22rpx; }
.picker-field { padding: 28rpx; border: 1rpx solid #d7d2c5; border-radius: 22rpx; font-size: 28rpx; background: rgba(255,255,255,.65); }
.save-button { width: 100%; margin-top: 40rpx; color: #f7f2e5; background: #244b50; }
.library-sheet { height: 82vh; }
.tab-row { gap: 12rpx; margin-bottom: 22rpx; padding: 8rpx; border-radius: 24rpx; background: #e4ded0; }
.tab-button { flex: 1; height: 68rpx; border-radius: 18rpx; color: #657477; font-size: 24rpx; }
.tab-button.active { color: #17383c; background: #fffdf6; box-shadow: 0 4rpx 16rpx rgba(23,56,60,.08); }
.library-list { height: calc(82vh - 200rpx); }
.library-card { margin-bottom: 22rpx; padding: 28rpx; border: 1rpx solid #ded8ca; border-radius: 26rpx; background: rgba(255,255,255,.56); }
.card-heading, .backpack-row { justify-content: space-between; gap: 18rpx; }
.library-card-title { color: #18383c; font-size: 27rpx; font-weight: 600; }
.library-card-copy { display: block; margin-top: 18rpx; color: #3b5558; font-family: "Songti SC", serif; font-size: 28rpx; line-height: 1.65; }
.library-meta { display: block; margin-top: 16rpx; color: #849093; font-size: 20rpx; line-height: 1.5; }
.delete-button { color: #98716b; font-size: 21rpx; }
.empty-copy { display: block; padding: 100rpx 30rpx; color: #829092; font-size: 25rpx; line-height: 1.7; text-align: center; }
.backpack-total { display: block; margin-bottom: 24rpx; padding: 30rpx; border-radius: 24rpx; color: #f6efdb; font-size: 27rpx; background: #345b5f; }
.backpack-row { margin-bottom: 16rpx; padding: 28rpx; border-bottom: 1rpx solid #ddd7c9; }
.backpack-amount { color: #667b7d; font-size: 25rpx; }
.state-card { display: flex; box-sizing: border-box; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; padding: 60rpx; text-align: center; }
.state-title { font-family: "Songti SC", serif; font-size: 42rpx; font-weight: 600; }
.state-copy { margin-top: 24rpx; color: rgba(255,255,255,.65); font-size: 24rpx; }

@media (min-width: 720px) {
  .page-shell { width: min(100%, 560px); margin: 0 auto; box-shadow: 0 0 90px rgba(0,0,0,.38); }
}
</style>
