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
      :aria-label="forest.fishOverlayMode.value === 'entry' ? '进入一处安静的地方' : '看鱼'"
    >
      <MoyuAssetImage
        src="/assets/backgrounds/mist-lake-dawn.webp"
        alt=""
        class="welcomeBackground"
        loading="eager"
        fetch-priority="high"
      />
      <div class="welcomeScrim" aria-hidden="true" />
      <button
        type="button"
        class="welcomeDismiss"
        :aria-label="forest.fishOverlayMode.value === 'entry' ? '进入' : '不看了'"
        @click="forest.handleDismissFish"
      />
      <div class="welcomeContent" :class="{ welcomeDetailContent: forest.fishOverlayMode.value === 'detail' }">
        <p class="welcomeEyebrow">{{ forest.fishOverlayMode.value === "entry" ? "先别急着做什么" : "它游过来了" }}</p>
        <h1 class="welcomeTitle">{{ forest.fishOverlayMode.value === "entry" ? "这里替你留了一块不赶时间的地方" : "看它一会儿" }}</h1>

        <div v-if="forest.fishOverlayMode.value === 'detail'" class="welcomeFishStage">
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
                    loading="eager"
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
          <button type="button" class="welcomeFishAction welcomeFishActionPrimary" @click="forest.handleDismissFish">
            不看了
          </button>
          <button type="button" class="welcomeFishAction" @click="forest.handleNextFish">换一条</button>
        </div>
        <p class="welcomeHint">
          {{ forest.fishOverlayMode.value === "entry" ? "轻触，进去坐一会儿" : "不用认识它，看着就好" }}
        </p>
      </div>
    </section>
  </Transition>
</template>
