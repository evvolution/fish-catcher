<script setup lang="ts">
import { computed, ref } from "vue";
import type { getOperatorConsoleData } from "~~/src/lib/moyu-content";

import "~/assets/css/operator.css";

type OperatorData = Awaited<ReturnType<typeof getOperatorConsoleData>>;

useHead({ title: "摸鱼内容台" });

const { data, refresh } = await useFetch<OperatorData>("/api/operator");
const feedback = ref("");
const optionLabelById = computed(() => new Map(data.value?.catalog.dimensionGroups.flatMap((group) =>
  group.options.map((option) => [option.id, `${group.label} · ${option.label}`] as const)) ?? []));
const activityLabelById = computed(() => new Map(data.value?.activities.map((activity) => [activity.id, activity.name]) ?? []));
const allOptions = computed(() => data.value?.catalog.dimensionGroups.flatMap((group) => group.options.map((option) => ({
  id: option.id,
  label: `${group.label} · ${option.label}`,
}))) ?? []);
const dimensionUsage = computed(() => {
  const usage = new Map<string, number>();
  for (const entry of [...(data.value?.copyEntries ?? []), ...(data.value?.backgrounds ?? [])]) {
    for (const item of entry.dimensions) usage.set(item.optionId, (usage.get(item.optionId) ?? 0) + 1);
  }
  return usage;
});

async function submitRecord(event: Event, endpoint: "/api/operator/copy" | "/api/operator/background", action: string) {
  const formElement = event.currentTarget as HTMLFormElement;
  const form = new FormData(formElement);
  const payload = {
    ...Object.fromEntries(form.entries()),
    action,
    isActive: form.get("isActive") === "on",
    dimensionOptionIds: form.getAll("dimensionOptionIds").map(String),
  };
  feedback.value = "保存中…";
  try {
    await $fetch(endpoint, { method: "POST", body: payload });
    if (action === "create") formElement.reset();
    await refresh();
    feedback.value = "已保存";
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : "保存失败";
  }
}

async function deleteRecord(endpoint: "/api/operator/copy" | "/api/operator/background", id: string) {
  if (!window.confirm("确定删除这条记录？")) return;
  feedback.value = "删除中…";
  try {
    await $fetch(endpoint, { method: "POST", body: { action: "delete", id } });
    await refresh();
    feedback.value = "已删除";
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : "删除失败";
  }
}
</script>

<template>
  <main v-if="data" class="page">
    <section class="hero">
      <div>
        <p class="eyebrow">Operator Console</p>
        <h1 class="title">摸鱼内容台</h1>
      </div>
      <div class="heroLinks">
        <span v-if="feedback" class="recordMeta" aria-live="polite">{{ feedback }}</span>
        <NuxtLink to="/" class="linkButton">回到森林</NuxtLink>
      </div>
    </section>

    <section class="statsGrid">
      <article class="statCard"><p class="statLabel">行为</p><p class="statValue">{{ data.activities.length }}</p></article>
      <article class="statCard"><p class="statLabel">维度组选项</p><p class="statValue">{{ allOptions.length }}</p></article>
      <article class="statCard"><p class="statLabel">文案</p><p class="statValue">{{ data.copyEntries.length }}</p></article>
      <article class="statCard"><p class="statLabel">背景图</p><p class="statValue">{{ data.backgrounds.length }}</p></article>
    </section>

    <section class="section">
      <div class="sectionHeader"><div><p class="sectionEyebrow">Dimension Map</p><h2 class="sectionTitle">当前维度总览</h2></div></div>
      <div class="dimensionGrid">
        <article v-for="group in data.catalog.dimensionGroups" :key="group.id" class="dimensionCard">
          <h3 class="dimensionTitle">{{ group.label }}</h3>
          <p class="dimensionDescription">{{ group.description }}</p>
          <div class="dimensionPills">
            <span v-for="option in group.options" :key="option.id" class="dimensionPill">
              {{ option.label }}<em>{{ dimensionUsage.get(option.id) ?? 0 }}</em>
            </span>
          </div>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="sectionHeader"><div><p class="sectionEyebrow">Copywriting</p><h2 class="sectionTitle">新增文案</h2></div></div>
      <form class="formCard" @submit.prevent="submitRecord($event, '/api/operator/copy', 'create')">
        <div class="formGrid">
          <label class="field"><span>Slug</span><input name="slug" class="input" placeholder="可留空，自动生成"></label>
          <label class="field"><span>类型</span><select name="kind" class="input"><option value="RESULT">RESULT</option><option value="CARD">CARD</option><option value="GREETING">GREETING</option><option value="GUIDE">GUIDE</option></select></label>
          <label class="field"><span>行为</span><select name="activityId" class="input"><option value="">通用</option><option v-for="activity in data.activities" :key="activity.id" :value="activity.id">{{ activity.name }}</option></select></label>
          <label class="checkboxRow"><input type="checkbox" name="isActive" checked><span>启用这条文案</span></label>
        </div>
        <label class="field"><span>标题</span><input name="title" class="input" required></label>
        <label class="field"><span>正文</span><textarea name="content" class="textarea" rows="4" required /></label>
        <div class="formGrid">
          <label class="field"><span>最短时长（秒）</span><input name="minDurationSec" class="input"></label>
          <label class="field"><span>最长时长（秒）</span><input name="maxDurationSec" class="input"></label>
          <label class="field"><span>权重</span><input name="weight" value="100" class="input"></label>
          <label class="field"><span>掉落率（卡片用）</span><input name="dropRate" value="20" class="input"></label>
        </div>
        <label class="field"><span>备注</span><input name="notes" class="input"></label>
        <label class="field"><span>维度标签</span><select name="dimensionOptionIds" multiple class="multiSelect"><option v-for="option in allOptions" :key="option.id" :value="option.id">{{ option.label }}</option></select></label>
        <button type="submit" class="submitButton">创建文案</button>
      </form>
    </section>

    <section class="section">
      <div class="sectionHeader"><div><p class="sectionEyebrow">Copywriting</p><h2 class="sectionTitle">文案库</h2></div></div>
      <div class="stack">
        <details v-for="entry in data.copyEntries" :key="entry.id" class="record">
          <summary class="recordSummary">
            <div><p class="recordMeta">{{ entry.kind }} {{ entry.isActive ? "· 启用" : "· 已停用" }}</p><h3 class="recordTitle">{{ entry.title }}</h3><p class="recordPreview">{{ entry.content }}</p></div>
            <div class="summaryTags">
              <span v-if="entry.activityId">{{ activityLabelById.get(entry.activityId) ?? "通用" }}</span>
              <span v-for="dimension in entry.dimensions.slice(0, 3)" :key="dimension.optionId">{{ optionLabelById.get(dimension.optionId) ?? dimension.optionId }}</span>
            </div>
          </summary>
          <form class="editForm" @submit.prevent="submitRecord($event, '/api/operator/copy', 'update')">
            <input type="hidden" name="id" :value="entry.id">
            <div class="formGrid">
              <label class="field"><span>Slug</span><input name="slug" :value="entry.slug" class="input"></label>
              <label class="field"><span>类型</span><select name="kind" :value="entry.kind" class="input"><option value="RESULT">RESULT</option><option value="CARD">CARD</option><option value="GREETING">GREETING</option><option value="GUIDE">GUIDE</option></select></label>
              <label class="field"><span>行为</span><select name="activityId" :value="entry.activityId ?? ''" class="input"><option value="">通用</option><option v-for="activity in data.activities" :key="activity.id" :value="activity.id">{{ activity.name }}</option></select></label>
              <label class="checkboxRow"><input type="checkbox" name="isActive" :checked="entry.isActive"><span>启用这条文案</span></label>
            </div>
            <label class="field"><span>标题</span><input name="title" :value="entry.title" class="input" required></label>
            <label class="field"><span>正文</span><textarea name="content" :value="entry.content" class="textarea" rows="4" required /></label>
            <div class="formGrid">
              <label class="field"><span>最短时长（秒）</span><input name="minDurationSec" :value="entry.minDurationSec ?? ''" class="input"></label>
              <label class="field"><span>最长时长（秒）</span><input name="maxDurationSec" :value="entry.maxDurationSec ?? ''" class="input"></label>
              <label class="field"><span>权重</span><input name="weight" :value="entry.weight" class="input"></label>
              <label class="field"><span>掉落率</span><input name="dropRate" :value="entry.dropRate" class="input"></label>
            </div>
            <label class="field"><span>备注</span><input name="notes" :value="entry.notes ?? ''" class="input"></label>
            <label class="field"><span>维度标签</span><select name="dimensionOptionIds" multiple class="multiSelect"><option v-for="option in allOptions" :key="option.id" :value="option.id" :selected="entry.dimensions.some((item) => item.optionId === option.id)">{{ option.label }}</option></select></label>
            <button type="submit" class="submitButton">保存文案</button>
          </form>
          <div class="deleteForm"><button type="button" class="deleteAction" @click="deleteRecord('/api/operator/copy', entry.id)">删除这条文案</button></div>
        </details>
      </div>
    </section>

    <section class="section">
      <div class="sectionHeader"><div><p class="sectionEyebrow">Backgrounds</p><h2 class="sectionTitle">新增背景图记录</h2></div></div>
      <form class="formCard" @submit.prevent="submitRecord($event, '/api/operator/background', 'create')">
        <div class="formGrid">
          <label class="field"><span>Slug</span><input name="slug" class="input" placeholder="可留空，自动生成"></label>
          <label class="field"><span>行为归属</span><select name="activityId" class="input"><option value="">通用</option><option v-for="activity in data.activities" :key="activity.id" :value="activity.id">{{ activity.name }}</option></select></label>
          <label class="field"><span>排序</span><input name="sortOrder" value="0" class="input"></label>
          <label class="checkboxRow"><input type="checkbox" name="isActive" checked><span>启用这张背景图</span></label>
        </div>
        <label class="field"><span>标题</span><input name="title" class="input" required></label>
        <label class="field"><span>图片路径</span><input name="imagePath" class="input" required></label>
        <div class="formGrid">
          <label class="field"><span>来源平台</span><input name="sourceName" value="Pixabay" class="input" required></label>
          <label class="field"><span>作者</span><input name="photographerName" class="input"></label>
          <label class="field"><span>许可标签</span><input name="licenseLabel" value="Pixabay Content License" class="input"></label>
          <label class="field"><span>主色</span><input name="blurColor" class="input" placeholder="#7c94a0"></label>
        </div>
        <label class="field"><span>来源页链接</span><input name="sourcePageUrl" class="input" required></label>
        <label class="field"><span>描述</span><textarea name="description" class="textarea" rows="3" /></label>
        <label class="field"><span>维度标签</span><select name="dimensionOptionIds" multiple class="multiSelect"><option v-for="option in allOptions" :key="option.id" :value="option.id">{{ option.label }}</option></select></label>
        <button type="submit" class="submitButton">创建背景图</button>
      </form>
    </section>

    <section class="section">
      <div class="sectionHeader"><div><p class="sectionEyebrow">Backgrounds</p><h2 class="sectionTitle">背景图库</h2></div></div>
      <div class="backgroundGrid">
        <details v-for="background in data.backgrounds" :key="background.id" class="backgroundCard">
          <summary class="backgroundSummary">
            <div class="backgroundPreview">
              <MoyuAssetImage
                :src="background.imagePath"
                :alt="background.title"
                class="backgroundImage"
                loading="lazy"
                fetch-priority="low"
              />
            </div>
            <div class="backgroundMeta"><p class="recordMeta">{{ background.isActive ? "启用中" : "已停用" }} · {{ background.sourceName }}</p><h3 class="recordTitle">{{ background.title }}</h3><p class="recordPreview">{{ background.imagePath }}</p></div>
          </summary>
          <form class="editForm" @submit.prevent="submitRecord($event, '/api/operator/background', 'update')">
            <input type="hidden" name="id" :value="background.id">
            <div class="formGrid">
              <label class="field"><span>Slug</span><input name="slug" :value="background.slug" class="input"></label>
              <label class="field"><span>行为归属</span><select name="activityId" :value="background.activityId ?? ''" class="input"><option value="">通用</option><option v-for="activity in data.activities" :key="activity.id" :value="activity.id">{{ activity.name }}</option></select></label>
              <label class="field"><span>排序</span><input name="sortOrder" :value="background.sortOrder" class="input"></label>
              <label class="checkboxRow"><input type="checkbox" name="isActive" :checked="background.isActive"><span>启用这张背景图</span></label>
            </div>
            <label class="field"><span>标题</span><input name="title" :value="background.title" class="input" required></label>
            <label class="field"><span>图片路径</span><input name="imagePath" :value="background.imagePath" class="input" required></label>
            <div class="formGrid">
              <label class="field"><span>来源平台</span><input name="sourceName" :value="background.sourceName" class="input" required></label>
              <label class="field"><span>作者</span><input name="photographerName" :value="background.photographerName ?? ''" class="input"></label>
              <label class="field"><span>许可标签</span><input name="licenseLabel" :value="background.licenseLabel ?? ''" class="input"></label>
              <label class="field"><span>主色</span><input name="blurColor" :value="background.blurColor ?? ''" class="input"></label>
            </div>
            <label class="field"><span>来源页链接</span><input name="sourcePageUrl" :value="background.sourcePageUrl" class="input" required></label>
            <label class="field"><span>描述</span><textarea name="description" :value="background.description ?? ''" class="textarea" rows="3" /></label>
            <label class="field"><span>维度标签</span><select name="dimensionOptionIds" multiple class="multiSelect"><option v-for="option in allOptions" :key="option.id" :value="option.id" :selected="background.dimensions.some((item) => item.optionId === option.id)">{{ option.label }}</option></select></label>
            <button type="submit" class="submitButton">保存背景图</button>
          </form>
          <div class="deleteForm"><button type="button" class="deleteAction" @click="deleteRecord('/api/operator/background', background.id)">删除这张背景图</button></div>
        </details>
      </div>
    </section>

    <section class="section">
      <div class="sectionHeader"><div><p class="sectionEyebrow">Supporting Data</p><h2 class="sectionTitle">行为与城市换算样例</h2></div></div>
      <div class="supportGrid">
        <article class="sideCard"><h3 class="sideTitle">行为集合</h3><ul class="simpleList"><li v-for="activity in data.activities" :key="activity.id"><strong>{{ activity.name }}</strong><span>{{ activity.prompt ?? "暂无提示" }}</span></li></ul></article>
        <article class="sideCard"><h3 class="sideTitle">城市小吃换算</h3><ul class="simpleList"><li v-for="city in data.cities" :key="city.id"><strong>{{ city.name }}</strong><span>{{ city.snacks.map((snack) => snack.name).join(" / ") }}</span></li></ul></article>
      </div>
    </section>
  </main>
</template>
