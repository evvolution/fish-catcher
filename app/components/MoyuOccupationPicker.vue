<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

type OccupationOption = { value: string; label: string };

const CUSTOM_OCCUPATION_VALUE = "__custom_occupation__";
const PRIMARY_OCCUPATION_VALUES = ["programmer", "medical", "teacher", "accounting"];
const OCCUPATION_SHORT_LABELS: Record<string, string> = {
  programmer: "程序设计",
  medical: "全科医师",
  teacher: "中小学教师",
  accounting: "会计",
};

const props = defineProps<{
  idPrefix: string;
  occupationOptions: OccupationOption[];
  occupationDraft: string;
  customOccupationDraft: string;
}>();

const emit = defineEmits<{
  "update:occupationDraft": [value: string];
  "update:customOccupationDraft": [value: string];
}>();

const isExpanded = ref(false);
const labelId = computed(() => `${props.idPrefix}-occupation-label`);
const dialogTitleId = computed(() => `${props.idPrefix}-occupation-dialog-title`);
const primaryOptions = computed(() => PRIMARY_OCCUPATION_VALUES
  .map((value) => props.occupationOptions.find((occupation) => occupation.value === value))
  .filter((occupation): occupation is OccupationOption => Boolean(occupation)));
const expandedSelection = computed(() => props.occupationOptions.find(
  (occupation) => occupation.value === props.occupationDraft && !PRIMARY_OCCUPATION_VALUES.includes(occupation.value),
));

function togglePrimary(value: string) {
  emit("update:occupationDraft", props.occupationDraft === value ? "" : value);
}

function closeOnEscape(event: KeyboardEvent) {
  if (event.key === "Escape") isExpanded.value = false;
}

onMounted(() => window.addEventListener("keydown", closeOnEscape));
onBeforeUnmount(() => window.removeEventListener("keydown", closeOnEscape));
</script>

<template>
  <div class="field">
    <span :id="labelId" class="fieldLabel">你的行业 / 职业</span>
    <div class="choiceWrap cityChoiceWrap" role="group" :aria-labelledby="labelId">
      <button
        v-for="occupation in primaryOptions"
        :key="occupation.value"
        type="button"
        class="choiceChip"
        :class="{ choiceChipActive: occupationDraft === occupation.value }"
        :aria-pressed="occupationDraft === occupation.value"
        @click="togglePrimary(occupation.value)"
      >
        {{ OCCUPATION_SHORT_LABELS[occupation.value] ?? occupation.label }}
      </button>
      <button
        type="button"
        class="choiceChip customOccupationChip"
        :class="{ choiceChipActive: occupationDraft === CUSTOM_OCCUPATION_VALUE }"
        :aria-expanded="occupationDraft === CUSTOM_OCCUPATION_VALUE"
        @click="emit('update:occupationDraft', CUSTOM_OCCUPATION_VALUE)"
      >
        自定义
      </button>
      <button
        type="button"
        class="expandOccupationButton"
        :class="{ expandOccupationButtonActive: expandedSelection }"
        aria-haspopup="dialog"
        :aria-expanded="isExpanded"
        @click="isExpanded = true"
      >
        展开
      </button>
    </div>
    <span v-if="expandedSelection" class="citySelectionNote">已选 · {{ expandedSelection.label }}</span>
    <div v-if="occupationDraft === CUSTOM_OCCUPATION_VALUE" class="customCityField">
      <input
        class="textInput"
        :value="customOccupationDraft"
        maxlength="32"
        autocomplete="organization-title"
        placeholder="输入你的职业"
        aria-label="自定义职业"
        @input="emit('update:customOccupationDraft', ($event.target as HTMLInputElement).value)"
      >
      <span class="fieldHint">只用于匹配语气，不会公开展示。</span>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <button
          v-if="isExpanded"
          type="button"
          class="cityPickerBackdrop"
          aria-label="关闭职业列表"
          @click="isExpanded = false"
        />
      </Transition>
      <Transition name="dialog-rise">
        <section
          v-if="isExpanded"
          class="cityPickerDialog"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="dialogTitleId"
        >
          <header class="cityPickerHeader">
            <h3 :id="dialogTitleId" class="cityPickerTitle">选择职业</h3>
            <button type="button" class="closeButton" aria-label="关闭" @click="isExpanded = false">
              <MoyuAssetImage src="/assets/icons/close.svg" alt="" class="icon" aria-hidden="true" />
            </button>
          </header>
          <div class="cityRankGrid occupationGrid">
            <button
              v-for="occupation in occupationOptions"
              :key="occupation.value"
              type="button"
              class="cityRankButton occupationButton"
              :class="{ cityRankButtonActive: occupationDraft === occupation.value }"
              :aria-pressed="occupationDraft === occupation.value"
              @click="emit('update:occupationDraft', occupation.value); isExpanded = false"
            >
              <span>{{ occupation.label }}</span>
            </button>
          </div>
          <button
            type="button"
            class="cityCustomAction"
            @click="emit('update:occupationDraft', CUSTOM_OCCUPATION_VALUE); isExpanded = false"
          >
            <span>自定义职业</span>
            <span aria-hidden="true">→</span>
          </button>
        </section>
      </Transition>
    </Teleport>
  </div>
</template>
