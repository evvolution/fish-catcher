<script setup lang="ts">
import { activityIconPaths } from "~/utils/moyu-forest";

const forest = useMoyuForest();
</script>

<template>
  <nav v-if="forest.view.value !== 'result'" class="bottomTabBar" aria-label="摸鱼方式">
    <button
      v-for="activity in forest.activities.value"
      :key="activity.slug"
      type="button"
      class="bottomTab"
      :class="{ bottomTabActive: forest.timer.value?.activitySlug === activity.slug }"
      :aria-current="forest.timer.value?.activitySlug === activity.slug ? 'page' : undefined"
      :disabled="Boolean(forest.timer.value && forest.timer.value.activitySlug !== activity.slug)"
      @click="forest.timer.value?.activitySlug === activity.slug
        ? forest.view.value = 'timer'
        : forest.handleStartActivity(activity)"
    >
      <span
        class="bottomTabIcon"
        :style="{ background: `linear-gradient(135deg, ${activity.colorStart ?? '#dfe6e0'}, ${activity.colorEnd ?? '#a6bbae'})` }"
      >
        <MoyuAssetImage :src="activityIconPaths[activity.iconKey] ?? activityIconPaths.cloud" alt="" class="icon" aria-hidden="true" />
      </span>
      <span>{{ activity.name }}</span>
    </button>
    <button type="button" class="bottomTab" @click="forest.handleOpenFish">
      <span class="bottomTabIcon fishTabIcon">
        <MoyuAssetImage src="/assets/icons/fish.svg" alt="" class="icon" aria-hidden="true" />
      </span>
      <span>看鱼</span>
    </button>
  </nav>
</template>
