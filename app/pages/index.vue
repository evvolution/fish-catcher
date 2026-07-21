<script setup lang="ts">
import type { ForestCatalog } from "~~/src/lib/moyu-types";

const { data: catalog, error } = await useFetch<ForestCatalog>("/api/catalog");

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode ?? 500,
    statusMessage: "摸鱼森林加载失败",
    cause: error.value,
  });
}
</script>

<template>
  <MoyuForest v-if="catalog" :catalog="catalog" />
</template>
