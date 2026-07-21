<script setup lang="ts">
import { formatDuration } from "~~/src/lib/moyu-engine";

const forest = useMoyuForest();
</script>

<template>
  <section v-if="forest.timer.value" class="timerStage">
    <div class="timerTopBar">
      <p class="timerActivity">{{ forest.timerActivityName.value }}</p>
      <button
        type="button"
        class="noiseButton"
        :class="{ noiseButtonActive: forest.timer.value.ambientOn }"
        :aria-label="forest.timer.value.ambientOn ? '关闭静噪' : '打开静噪'"
        :aria-pressed="forest.timer.value.ambientOn"
        @click="forest.handleToggleAmbient"
      >
        <MoyuAssetImage src="/assets/icons/volume.svg" alt="" class="icon" aria-hidden="true" />
      </button>
    </div>
    <div class="timerCenter">
      <p class="timerValue">{{ formatDuration(Math.floor(forest.elapsedMs.value / 1000)) }}</p>
    </div>
    <div class="timerControls">
      <button type="button" class="endButton" @click="forest.handleFinishTimer">
        <MoyuAssetImage src="/assets/icons/stop.svg" alt="" class="icon" aria-hidden="true" />结束
      </button>
      <button type="button" class="pauseButton" @click="forest.handlePauseOrResume">
        <MoyuAssetImage
          :src="forest.timer.value.segmentStartedAt ? '/assets/icons/pause.svg' : '/assets/icons/play.svg'"
          alt=""
          class="icon"
          aria-hidden="true"
        />
        {{ forest.timer.value.segmentStartedAt ? "暂停" : "继续" }}
      </button>
    </div>
  </section>
</template>
