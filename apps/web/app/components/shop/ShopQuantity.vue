<script setup lang="ts">
/** Quantity stepper: 48px − / + buttons around a numeric field (1–99). */
const props = withDefaults(defineProps<{ label: string; testid?: string; max?: number }>(), {
  testid: 'quantity-input',
  max: 99,
})
const model = defineModel<number>({ default: 1 })
const { t } = useI18n()
const id = useId()

function set(value: number) {
  model.value = Math.min(props.max, Math.max(1, Math.round(Number.isFinite(value) ? value : 1)))
}
</script>

<template>
  <div>
    <label :for="id" class="kb-label">{{ props.label }}</label>
    <div class="inline-flex border border-rule-strong bg-paper-raised">
      <button
        type="button"
        class="kb-btn kb-btn-icon min-h-12 min-w-12 rounded-none"
        :aria-label="t('shop.quantity.decrease')"
        :disabled="model <= 1"
        @click="set(model - 1)"
      >
        <ShopIcon name="minus" />
      </button>
      <input
        :id="id"
        :value="model"
        type="number"
        inputmode="numeric"
        min="1"
        :max="props.max"
        class="kb-num w-14 border-x border-rule bg-transparent text-center text-[1.0625rem] font-bold [appearance:textfield] focus-visible:outline-2 focus-visible:outline-offset-[-2px] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        :data-testid="props.testid"
        @change="set(Number(($event.target as HTMLInputElement).value))"
      />
      <button
        type="button"
        class="kb-btn kb-btn-icon min-h-12 min-w-12 rounded-none"
        :aria-label="t('shop.quantity.increase')"
        :disabled="model >= props.max"
        @click="set(model + 1)"
      >
        <ShopIcon name="plus" />
      </button>
    </div>
  </div>
</template>
