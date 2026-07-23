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
</template>
