<script setup lang="ts">
const forest = useMoyuForest();
</script>

<template>
  <section class="stage">
    <header class="header">
      <button type="button" class="albumButton" aria-label="打开卡册和摸鱼日志" @click="forest.openLibrary('cards')">
        <MoyuAssetImage src="/assets/icons/book.svg" alt="" class="icon" aria-hidden="true" />
      </button>
      <div class="profileTools">
        <span class="profileSummary">
          <span class="profileIndustry">{{ forest.activeIndustryLabel.value ?? "未设置职业" }}</span>
          <span class="profileRegion">{{ forest.activeRegionLabel.value || "未设置地区" }}</span>
        </span>
        <button type="button" class="settingsButton" aria-label="设置区域和职业" @click="forest.sheet.value = 'settings'">
          <MoyuAssetImage src="/assets/icons/settings.svg" alt="" class="icon" aria-hidden="true" />
        </button>
      </div>
    </header>
    <section class="heroCard">
      <Transition name="quote" mode="out-in">
        <div :key="forest.greeting.value?.id ?? 'home-quote-fallback'" class="heroQuote">
          <h1 class="heroTitle">{{ forest.greeting.value?.content ?? "先停一下，不急着把自己交回给待办。" }}</h1>
          <p class="heroMeta">{{ forest.greeting.value?.title }}</p>
        </div>
      </Transition>
      <div class="heroActions">
        <button type="button" class="heroQuietAction" @click="forest.advanceHomeQuote">换一句</button>
        <button type="button" class="heroExploreAction" @click="forest.openQuoteExplorer(forest.greeting.value)">
          走进句子森林
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  </section>
</template>
