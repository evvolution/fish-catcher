<script setup lang="ts">
import { formatDuration } from "~~/src/lib/moyu-engine";
import { formatBackpackAmount, formatLogDate } from "~/utils/moyu-forest";

const forest = useMoyuForest();
</script>

<template>
  <MoyuOverlaySheet
    v-if="forest.sheet.value === 'album' && forest.view.value === 'forest'"
    title="我的摸鱼"
    @close="forest.sheet.value = null"
    @body-scroll="forest.handleLibraryScroll"
  >
    <template #sticky>
      <div class="libraryTabs" role="tablist" aria-label="卡册、日志和背包">
        <button type="button" role="tab" :aria-selected="forest.libraryTab.value === 'cards'" :class="{ libraryTabActive: forest.libraryTab.value === 'cards' }" @click="forest.changeLibraryTab('cards')">
          卡册 <small>{{ forest.store.value.cards.length }} 张</small>
        </button>
        <button type="button" role="tab" :aria-selected="forest.libraryTab.value === 'logs'" :class="{ libraryTabActive: forest.libraryTab.value === 'logs' }" @click="forest.changeLibraryTab('logs')">
          日志 <small>{{ forest.store.value.records.length }} 次</small>
        </button>
        <button type="button" role="tab" :aria-selected="forest.libraryTab.value === 'backpack'" :class="{ libraryTabActive: forest.libraryTab.value === 'backpack' }" @click="forest.changeLibraryTab('backpack')">
          背包 <small>{{ forest.backpackItems.value.length }} 种</small>
        </button>
      </div>
    </template>

    <div v-if="forest.libraryTab.value === 'cards'" class="cardGrid">
      <template v-if="forest.store.value.cards.length">
        <article
          v-for="card in forest.store.value.cards.slice(0, forest.visibleCardCount.value)"
          :key="card.id"
          class="cardItem"
        >
          <div><p class="cardItemTitle">{{ card.title }}</p><p class="cardItemContent">{{ card.content }}</p></div>
          <button type="button" class="deleteButton" :aria-label="`删除 ${card.title}`" @click="forest.handleDeleteCard(card.id)">
            <MoyuAssetImage src="/assets/icons/trash.svg" alt="" class="icon" aria-hidden="true" />
          </button>
        </article>
      </template>
      <article v-else class="emptyCard">还没有卡片掉落。</article>
      <p v-if="forest.visibleCardCount.value < forest.store.value.cards.length" class="loadMoreHint">继续下滑，加载更多</p>
    </div>

    <div v-else-if="forest.libraryTab.value === 'logs'" class="logList">
      <template v-if="forest.store.value.records.length">
        <article
          v-for="record in forest.store.value.records.slice(0, forest.visibleLogCount.value)"
          :key="record.id"
          class="logItem"
          :class="{ fishLogItem: record.fishSlug }"
        >
          <header>
            <span>{{ record.activityName }} · {{ formatDuration(record.durationSec) }}</span>
            <time :datetime="record.endedAt">{{ formatLogDate(record.endedAt) }}</time>
          </header>
          <div v-if="record.fishSlug && record.fishImagePath" class="fishLogPreview">
            <div class="fishLogImageWrap">
              <MoyuAssetImage
                :src="record.fishImagePath"
                :alt="record.fishName ?? '本次看到的鱼'"
                class="fishLogImage"
                loading="lazy"
                fetch-priority="low"
              />
            </div>
            <div class="fishLogCopy">
              <div><strong>{{ record.fishName ?? "看鱼" }}</strong><em>{{ record.copyTitle }}</em></div>
              <p>{{ record.copyContent }}</p>
            </div>
          </div>
          <p v-else class="logCopy">{{ record.copyContent }}</p>
          <p v-if="record.snackSummary" class="logFood">{{ record.snackSummary }}</p>
        </article>
      </template>
      <article v-else class="emptyCard">第一条摸鱼日志，等你亲自写下。</article>
      <p v-if="forest.visibleLogCount.value < forest.store.value.records.length" class="loadMoreHint">继续下滑，加载更多</p>
    </div>

    <div v-else class="backpackPanel">
      <header class="backpackHeader">
        <div><p>累计收进背包</p><strong>{{ forest.backpackItems.value.length }} 种食物</strong></div>
        <span>零散时光会优先凑成完整份数</span>
      </header>
      <div v-if="forest.backpackItems.value.length" class="backpackGrid">
        <article v-for="item in forest.backpackItems.value" :key="`${item.name}-${item.unit}`" class="backpackItem">
          <span class="backpackFoodMark" aria-hidden="true">{{ item.name.slice(0, 1) }}</span>
          <div class="backpackFoodName">
            <strong>{{ item.name }}</strong>
            <small>{{ item.isPartial ? "零头继续积攒中" : "已凑成完整份数" }}</small>
          </div>
          <p class="backpackAmount">{{ formatBackpackAmount(item.amount) }}<small>{{ item.unit }}</small></p>
        </article>
      </div>
      <article v-else class="emptyCard">背包还是空的，摸一会儿鱼就有了。</article>
    </div>
  </MoyuOverlaySheet>
</template>
