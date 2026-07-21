<script setup lang="ts">
defineProps<{
  title: string;
}>();

const emit = defineEmits<{
  close: [];
  bodyScroll: [event: Event];
}>();
</script>

<template>
  <button type="button" class="sheetBackdrop" aria-label="关闭面板" @click="emit('close')" />
  <section class="sheet" role="dialog" aria-modal="true" :aria-label="title">
    <div class="sheetHandle" />
    <header class="sheetHeader">
      <h2 class="sheetTitle">{{ title }}</h2>
      <button type="button" class="closeButton" aria-label="关闭" @click="emit('close')">
        <MoyuAssetImage src="/assets/icons/close.svg" alt="" class="icon" aria-hidden="true" />
      </button>
    </header>
    <div v-if="$slots.sticky" class="sheetPinned">
      <slot name="sticky" />
    </div>
    <div class="sheetBody" @scroll="emit('bodyScroll', $event)">
      <slot />
    </div>
  </section>
</template>
