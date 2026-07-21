<script setup lang="ts">
const forest = useMoyuForest();
</script>

<template>
  <Transition name="welcome-fade">
    <section
      v-if="forest.welcomeVisible.value"
      class="welcomeOverlay"
      role="dialog"
      aria-modal="true"
      aria-label="摸鱼"
    >
      <MoyuAssetImage src="/assets/backgrounds/mist-lake-dawn.webp" alt="" class="welcomeBackground" />
      <div class="welcomeScrim" aria-hidden="true" />
      <button type="button" class="welcomeDismiss" aria-label="进入森林" @click="forest.handleDismissFish" />
      <div class="welcomeContent">
        <h1 class="welcomeTitle">你一定要记得摸鱼</h1>
        <div class="welcomeFishStage">
          <div class="welcomeFishCard" aria-live="polite">
            <Transition name="fish-fade" mode="out-in">
              <figure
                v-if="forest.welcomeFish.value"
                :key="forest.welcomeFish.value.slug"
                class="welcomeFishContent"
              >
                <div class="welcomeFishImageWrap">
                  <MoyuAssetImage
                    :src="forest.welcomeFish.value.imagePath"
                    :alt="forest.welcomeFish.value.commonNameZh"
                    class="welcomeFishImage"
                  />
                  <span class="welcomeHabitat">{{ forest.welcomeFish.value.habitatLabel }}</span>
                </div>
                <figcaption class="welcomeFishCopy">
                  <div class="welcomeFishHeading">
                    <h2 class="welcomeFishName">{{ forest.welcomeFish.value.commonNameZh }}</h2>
                    <p class="welcomeScientificName">{{ forest.welcomeFish.value.scientificName }}</p>
                  </div>
                  <p class="welcomeFishSummary">{{ forest.welcomeFish.value.summary }}</p>
                  <p class="welcomeFishFact"><span>习性</span>{{ forest.welcomeFish.value.habits }}</p>
                  <p class="welcomeFishFact"><span>分布</span>{{ forest.welcomeFish.value.distribution }}</p>
                  <p v-if="forest.protectionNotice.value" class="welcomeProtectionNote" role="note">
                    <span>保护提示</span>{{ forest.protectionNotice.value }}
                  </p>
                </figcaption>
              </figure>
            </Transition>
          </div>
        </div>
        <p class="welcomeHint">轻触，回到森林</p>
      </div>
    </section>
  </Transition>
</template>
