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
      :aria-label="forest.fishOverlayMode.value === 'entry' ? '进入摸鱼森林' : '看鱼'"
    >
      <MoyuAssetImage src="/assets/backgrounds/mist-lake-dawn.webp" alt="" class="welcomeBackground" />
      <div class="welcomeScrim" aria-hidden="true" />
      <button
        type="button"
        class="welcomeDismiss"
        :aria-label="forest.fishOverlayMode.value === 'entry' ? '进入森林' : '回到森林'"
        @click="forest.handleDismissFish"
      />
      <div class="welcomeContent" :class="{ welcomeDetailContent: forest.fishOverlayMode.value === 'detail' }">
        <p class="welcomeEyebrow">{{ forest.fishOverlayMode.value === "entry" ? "一处不计算产出的地方" : "林中水域" }}</p>
        <h1 class="welcomeTitle">{{ forest.fishOverlayMode.value === "entry" ? "你一定要记得摸鱼" : "看一会儿鱼" }}</h1>

        <div v-if="forest.fishOverlayMode.value === 'entry'" class="welcomePortalStage">
          <figure v-if="forest.welcomeFish.value" class="welcomePortalCard">
            <MoyuAssetImage
              :src="forest.welcomeFish.value.imagePath"
              :alt="forest.welcomeFish.value.commonNameZh"
              class="welcomePortalFish"
            />
            <figcaption>
              <strong>{{ forest.welcomeFish.value.commonNameZh }}</strong>
              <span>它只是从这里游过，不要求你记住什么。</span>
            </figcaption>
          </figure>
        </div>

        <div v-else class="welcomeFishStage">
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
        <div v-if="forest.fishOverlayMode.value === 'detail'" class="welcomeFishActions">
          <button type="button" class="welcomeFishAction" @click="forest.handleNextFish">换一条</button>
          <button type="button" class="welcomeFishAction welcomeFishActionPrimary" @click="forest.handleDismissFish">
            回到森林
          </button>
        </div>
        <p class="welcomeHint">
          {{ forest.fishOverlayMode.value === "entry" ? "轻触，进入森林" : "不需要认识它，只看一会儿也很好" }}
        </p>
      </div>
    </section>
  </Transition>
</template>
