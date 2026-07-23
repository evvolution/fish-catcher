<script setup lang="ts">
import { formatDuration } from "~~/src/lib/moyu-engine";

const forest = useMoyuForest();

function openLogs() {
  forest.openLibrary("logs");
  forest.handleBackToForest();
}
</script>

<template>
  <section v-if="forest.result.value" class="resultStage">
    <p class="resultLead">{{ forest.result.value.activity.name }}</p>
    <h2 class="resultDuration">{{ formatDuration(forest.result.value.durationSec) }}</h2>
    <p class="resultCopy" :class="{ resultCopyLong: forest.result.value.copy.content.length > 72 }">
      {{ forest.result.value.copy.content }}
    </p>
    <p class="resultSource">{{ forest.result.value.copy.title }}</p>
    <button
      type="button"
      class="resultExploreButton"
      @click="forest.openQuoteExplorer(forest.result.value.copy)"
    >
      沿着这句话走下去
      <span aria-hidden="true">→</span>
    </button>
    <p v-if="forest.result.value.snackSummary" class="resultSnack">{{ forest.result.value.snackSummary }}</p>
    <article v-if="forest.result.value.droppedCard" class="cardDrop">
      <h3 class="cardDropTitle">{{ forest.result.value.droppedCard.title }}</h3>
      <p class="cardDropContent">{{ forest.result.value.droppedCard.content }}</p>
    </article>
    <div class="resultActions">
      <button type="button" class="primaryButton" @click="forest.handleBackToForest">森林</button>
      <button type="button" class="secondaryButton" @click="openLogs">查看日志</button>
    </div>
  </section>
</template>
