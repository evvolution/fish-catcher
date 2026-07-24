<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

import { regionalCatalog, type RegionalCity } from "~~/src/lib/regional-catalog";

type LocationDraft = {
  mode: "standard" | "custom";
  provinceCode: string;
  cityCode: string;
  districtCode: string;
  customName: string;
};

type SelectOption = { value: string; label: string };

const props = defineProps<{
  idPrefix: string;
  modelValue: LocationDraft;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: LocationDraft];
}>();

const activeLevel = ref<"province" | "city" | "district" | null>(null);
const dialogTitleId = computed(() => `${props.idPrefix}-location-dialog-title`);
const selectedCity = computed(() => regionalCatalog.cities.find((city) => city.code === props.modelValue.cityCode));
const selectedProvince = computed(() => regionalCatalog.regions.find((province) => province.code === props.modelValue.provinceCode));
const availableCities = computed(() => selectedProvince.value
  ? regionalCatalog.cities.filter((city) => city.provinceCode === selectedProvince.value?.code)
  : []);
const availableDistricts = computed(() => selectedCity.value?.districts ?? []);
const activeOptions = computed<SelectOption[]>(() => activeLevel.value === "province"
  ? regionalCatalog.regions.map((province) => ({ value: province.code, label: province.name }))
  : activeLevel.value === "city"
    ? availableCities.value.map((city) => ({ value: city.code, label: city.officialName }))
    : activeLevel.value === "district"
      ? availableDistricts.value.map((district) => ({ value: district.code, label: district.name }))
      : []);
const activeValue = computed(() => activeLevel.value === "province"
  ? props.modelValue.provinceCode
  : activeLevel.value === "city"
    ? props.modelValue.cityCode
    : props.modelValue.districtCode);
const activeTitle = computed(() => activeLevel.value === "province"
  ? "选择省级地区"
  : activeLevel.value === "city" ? "选择市 / 州" : "选择区 / 县");

function chooseCity(city: RegionalCity) {
  emit("update:modelValue", {
    mode: "standard",
    provinceCode: city.provinceCode,
    cityCode: city.code,
    districtCode: city.districts[0]?.code ?? city.code,
    customName: "",
  });
}

function chooseLocationOption(optionValue: string) {
  if (activeLevel.value === "province") {
    const city = regionalCatalog.cities.find((item) => item.provinceCode === optionValue);
    if (city) chooseCity(city);
  } else if (activeLevel.value === "city") {
    const city = regionalCatalog.cities.find((item) => item.code === optionValue);
    if (city) chooseCity(city);
  } else if (activeLevel.value === "district") {
    emit("update:modelValue", { ...props.modelValue, mode: "standard", districtCode: optionValue, customName: "" });
  }
  activeLevel.value = null;
}

function closeOnEscape(event: KeyboardEvent) {
  if (event.key === "Escape") activeLevel.value = null;
}

onMounted(() => window.addEventListener("keydown", closeOnEscape));
onBeforeUnmount(() => window.removeEventListener("keydown", closeOnEscape));
</script>

<template>
  <div class="field">
    <span class="fieldLabel">地区</span>
    <div class="locationCascade" role="group" aria-label="地区">
      <div class="cascadeField">
        <button
          type="button"
          class="cascadeButton"
          aria-label="选择省级地区"
          aria-haspopup="dialog"
          :aria-expanded="activeLevel === 'province'"
          @click="activeLevel = 'province'"
        >
          <span>{{ selectedProvince?.name ?? "请选择" }}</span>
          <span class="cascadeButtonIcon" aria-hidden="true">⌄</span>
        </button>
      </div>
      <div class="cascadeField">
        <button
          type="button"
          class="cascadeButton"
          aria-label="选择市或州"
          aria-haspopup="dialog"
          :aria-expanded="activeLevel === 'city'"
          :disabled="!selectedProvince"
          @click="activeLevel = 'city'"
        >
          <span>{{ selectedCity?.officialName ?? "请选择" }}</span>
          <span class="cascadeButtonIcon" aria-hidden="true">⌄</span>
        </button>
      </div>
      <div class="cascadeField">
        <button
          type="button"
          class="cascadeButton"
          aria-label="选择区或县"
          aria-haspopup="dialog"
          :aria-expanded="activeLevel === 'district'"
          :disabled="!selectedCity"
          @click="activeLevel = 'district'"
        >
          <span>{{ availableDistricts.find((district) => district.code === modelValue.districtCode)?.name ?? "请选择" }}</span>
          <span class="cascadeButtonIcon" aria-hidden="true">⌄</span>
        </button>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <button
          v-if="activeLevel"
          type="button"
          class="cityPickerBackdrop"
          aria-label="关闭地区列表"
          @click="activeLevel = null"
        />
      </Transition>
      <Transition name="dialog-rise">
        <section
          v-if="activeLevel"
          class="cityPickerDialog"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="dialogTitleId"
        >
          <header class="cityPickerHeader">
            <h3 :id="dialogTitleId" class="cityPickerTitle">{{ activeTitle }}</h3>
            <button type="button" class="closeButton" aria-label="关闭" @click="activeLevel = null">
              <MoyuAssetImage src="/assets/icons/close.svg" alt="" class="icon" aria-hidden="true" />
            </button>
          </header>
          <div class="cityRankGrid locationOptionGrid" role="listbox">
            <button
              v-for="option in activeOptions"
              :key="option.value"
              type="button"
              class="cityRankButton locationOptionButton"
              :class="{ cityRankButtonActive: activeValue === option.value }"
              role="option"
              :aria-selected="activeValue === option.value"
              @click="chooseLocationOption(option.value)"
            >
              <span>{{ option.label }}</span>
            </button>
          </div>
        </section>
      </Transition>
    </Teleport>
  </div>
</template>
