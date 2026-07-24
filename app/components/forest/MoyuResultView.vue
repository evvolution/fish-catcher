<script setup lang="ts">
import { formatDuration } from "~~/src/lib/moyu-engine";

const forest = useMoyuForest();
</script>

<template>
  <section v-if="forest.result.value" class="resultStage">
    <p class="resultLead">{{ forest.result.value.activity.name }}</p>
    <h2 class="resultDuration">{{ formatDuration(forest.result.value.durationSec) }}</h2>
    <p class="resultCopy" :class="{ resultCopyLong: forest.result.value.copy.content.length > 72 }">
      {{ forest.result.value.copy.content }}
    </p>
    <p class="resultSource">{{ forest.result.value.copy.title }}</p>
    <p v-if="forest.result.value.snackSummary" class="resultSnack">{{ forest.result.value.snackSummary }}</p>
    <article v-if="forest.result.value.droppedCard" class="cardDrop">
      <p class="cardDropEyebrow">替你收好了一张纸条</p>
      <h3 class="cardDropTitle">{{ forest.result.value.droppedCard.title }}</h3>
      <p class="cardDropContent">{{ forest.result.value.droppedCard.content }}</p>
    </article>
    <div class="resultActions">
      <button type="button" class="primaryButton" @click="forest.handleBackToForest">不看了</button>
    </div>
  </section>
</template>
