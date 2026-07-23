<script setup lang="ts">
const config = useRuntimeConfig();
const assetOrigin = new URL(String(config.public.assetBaseUrl)).origin;

useHead({
  link: [
    { rel: "preconnect", href: assetOrigin, crossorigin: "anonymous" },
    { rel: "dns-prefetch", href: assetOrigin },
  ],
});
</script>

<template>
  <NuxtPage />
</template>
