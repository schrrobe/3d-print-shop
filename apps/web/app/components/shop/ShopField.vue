<script setup lang="ts">
/**
 * Labelled text field with hint + error wiring (aria-invalid / aria-describedby).
 * Passes any other attribute (name, autocomplete, inputmode, type, …) to the <input>.
 */
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  label: string
  error?: string
  hint?: string
  optional?: boolean
}>()

const model = defineModel<string>({ default: '' })
const { t } = useI18n()
// Layout classes belong on the wrapper; everything else goes to the <input>
const attrs = useAttrs()
const inputAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})
const id = useId()
const describedBy = computed(
  () =>
    [props.hint ? `${id}-hint` : '', props.error ? `${id}-error` : ''].filter(Boolean).join(' ') ||
    undefined,
)
</script>

<template>
  <div :class="attrs.class">
    <label :for="id" class="kb-label">
      {{ props.label }}
      <span v-if="props.optional" class="font-normal text-ink-2"
        >({{ t('shop.form.optional') }})</span
      >
    </label>
    <input
      :id="id"
      v-model="model"
      v-bind="inputAttrs"
      class="kb-input"
      :aria-invalid="props.error ? 'true' : undefined"
      :aria-describedby="describedBy"
    />
    <p v-if="props.hint" :id="`${id}-hint`" class="kb-hint">{{ props.hint }}</p>
    <p v-if="props.error" :id="`${id}-error`" class="kb-error">
      {{ props.error }}
    </p>
  </div>
</template>
