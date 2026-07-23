<script setup lang="ts">
const forest = useMoyuForest();
</script>

<template>
  <MoyuOverlaySheet
    v-if="forest.sheet.value === 'quotes' && forest.quoteExplorerEntry.value"
    title="句子森林"
    @close="forest.sheet.value = null"
  >
    <div class="quoteExplorer">
      <p class="quoteExplorerLead">每次只往前走一句。方向相近，不保证答案相同。</p>

      <Transition name="quote" mode="out-in">
        <article :key="forest.quoteExplorerEntry.value.id" class="quoteExplorerCard">
          <div v-if="forest.quoteExplorerTags.value.length" class="quoteExplorerTags" aria-label="这句话的内容线索">
            <span v-for="tag in forest.quoteExplorerTags.value" :key="tag">{{ tag }}</span>
          </div>
          <blockquote>{{ forest.quoteExplorerEntry.value.content }}</blockquote>
          <p>{{ forest.quoteExplorerEntry.value.title }}</p>
        </article>
      </Transition>

      <div class="quoteExplorerPaths" aria-label="选择下一条路径">
        <button type="button" class="quotePathButton" @click="forest.advanceQuoteExplorer('wander')">
          <small>不按线索</small>
          <strong>换条小路</strong>
        </button>
        <button type="button" class="quotePathButton quotePathButtonPrimary" @click="forest.advanceQuoteExplorer('related')">
          <small>沿着相近的情绪</small>
          <strong>继续往里走</strong>
        </button>
      </div>

      <button
        type="button"
        class="quoteCollectButton"
        :disabled="forest.quoteExplorerSaved.value"
        @click="forest.handleCollectQuote"
      >
        {{ forest.quoteExplorerSaved.value ? "已经收进卡册" : "把这句话收进卡册" }}
      </button>
    </div>
  </MoyuOverlaySheet>
</template>
