<script setup lang="ts">
const forest = useMoyuForest();
</script>

<template>
  <MoyuOverlaySheet
    v-if="forest.sheet.value === 'settings' && forest.view.value === 'forest'"
    title="区域 / 职业"
    @close="forest.sheet.value = null"
  >
    <div class="settingsPanel">
      <MoyuOccupationPicker
        id-prefix="settings"
        :occupation-options="forest.industryOptions.value"
        v-model:occupation-draft="forest.industryDraft.value"
        v-model:custom-occupation-draft="forest.customIndustryDraft.value"
      />
      <MoyuLocationPicker id-prefix="settings" v-model="forest.locationDraft.value" />
      <div class="sheetActions">
        <button type="button" class="primaryButton" :disabled="!forest.profileValid.value" @click="forest.handleSaveProfile">保存</button>
      </div>
    </div>
  </MoyuOverlaySheet>

  <Transition name="fade">
    <div v-if="forest.onboardingOpen.value" class="onboardingBackdrop">
      <section class="onboardingCard">
        <h2 class="onboardingTitle">你在哪里？</h2>
        <MoyuLocationPicker id-prefix="onboarding" v-model="forest.locationDraft.value" />
        <MoyuOccupationPicker
          id-prefix="onboarding"
          :occupation-options="forest.industryOptions.value"
          v-model:occupation-draft="forest.industryDraft.value"
          v-model:custom-occupation-draft="forest.customIndustryDraft.value"
        />
        <button type="button" class="primaryButton" :disabled="!forest.profileValid.value" @click="forest.handleSaveProfile">
          进入森林
        </button>
      </section>
    </div>
  </Transition>
</template>
