<script setup lang="ts">
type ImageProps = {
  src: string;
  alt?: string;
  loading?: "lazy" | "eager";
  decoding?: "async" | "auto" | "sync";
  fetchPriority?: "high" | "low" | "auto";
};

const props = withDefaults(defineProps<ImageProps>(), {
  alt: "",
  loading: "eager",
  decoding: "async",
  fetchPriority: "auto",
});

const assetUrl = useAssetUrl();
</script>

<template>
  <img
    :src="assetUrl(props.src)"
    :alt="props.alt"
    :loading="props.loading"
    :decoding="props.decoding"
    :fetchpriority="props.fetchPriority"
    referrerpolicy="strict-origin-when-cross-origin"
  >
</template>
