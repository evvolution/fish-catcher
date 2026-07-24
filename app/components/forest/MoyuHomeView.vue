<script setup lang="ts">
const forest = useMoyuForest();
</script>

<template>
  <section class="stage">
    <header class="header">
      <button type="button" class="albumButton" aria-label="打开背包" @click="forest.openLibrary('cards')">
        <MoyuAssetImage src="/assets/icons/book.svg" alt="" class="icon" aria-hidden="true" />
      </button>
      <div class="profileTools">
        <button type="button" class="settingsButton" aria-label="设置（可跳过）" @click="forest.sheet.value = 'settings'">
          <MoyuAssetImage src="/assets/icons/settings.svg" alt="" class="icon" aria-hidden="true" />
        </button>
      </div>
    </header>
    <section class="heroCard">
      <div class="heroQuote">
        <h1 class="heroTitle">{{ forest.placeInvitation.title }}</h1>
        <p class="heroMeta">{{ forest.placeInvitation.detail }}</p>
      </div>
    </section>
  </section>
</template>
