<script setup lang="ts">
import type { ForestCatalog } from "~~/src/lib/moyu-types";
import MoyuBottomNav from "~/components/forest/MoyuBottomNav.vue";
import MoyuHomeView from "~/components/forest/MoyuHomeView.vue";
import MoyuLibrarySheet from "~/components/forest/MoyuLibrarySheet.vue";
import MoyuProfileOverlays from "~/components/forest/MoyuProfileOverlays.vue";
import MoyuQuoteExplorerSheet from "~/components/forest/MoyuQuoteExplorerSheet.vue";
import MoyuResultView from "~/components/forest/MoyuResultView.vue";
import MoyuTimerView from "~/components/forest/MoyuTimerView.vue";
import MoyuWelcomeOverlay from "~/components/forest/MoyuWelcomeOverlay.vue";
import "~/assets/css/forest.css";

const props = defineProps<{ catalog: ForestCatalog }>();
const forest = provideMoyuForest(props.catalog);
</script>

<template>
  <main class="page">
    <MoyuWelcomeOverlay />

    <div class="backgroundViewport" aria-hidden="true">
      <MoyuAssetImage
        v-if="!forest.welcomeVisible.value && forest.currentBackgroundRecord.value"
        :src="forest.currentBackgroundRecord.value.imagePath"
        alt=""
        class="backgroundImage"
        loading="eager"
        fetch-priority="high"
      />
      <div class="backgroundBloom" />
      <div class="backgroundScrim" />
    </div>

    <div class="contentShell">
      <Transition name="stage" mode="out-in">
        <MoyuHomeView v-if="forest.view.value === 'forest'" key="forest" />
        <MoyuTimerView v-else-if="forest.view.value === 'timer'" key="timer" />
        <MoyuResultView v-else key="result" />
      </Transition>
      <MoyuBottomNav />
      <MoyuLibrarySheet />
      <MoyuQuoteExplorerSheet />
      <MoyuProfileOverlays />
    </div>
  </main>
</template>
