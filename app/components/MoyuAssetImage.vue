<script setup lang="ts">
const props = defineProps<{
  src: string;
  alt?: string;
}>();

const assetUrl = useAssetUrl();
</script>

<template>
  <img :src="assetUrl(props.src)" :alt="props.alt ?? ''" referrerpolicy="strict-origin-when-cross-origin">
</template>
