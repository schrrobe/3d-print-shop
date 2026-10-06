<script setup lang="ts">
import { formatCents } from '@print-shop/utils'
import type { Locale } from '@print-shop/types'

/**
 * Voucher entry, shared by cart and checkout. Not a <form>: it may sit inside the checkout
 * form, so Enter in the field applies the code instead of submitting the order.
 */
const { t, locale } = useI18n()
const cart = useCartStore()

const code = ref('')
const error = ref('')
const pending = ref(false)
const id = useId()

async function apply() {
  if (!code.value.trim() || pending.value) return
  pending.value = true
  error.value = ''
  try {
    const result = await cart.applyVoucher(code.value)
    if (result.valid) {
      code.value = ''
    } else {
      error.value = t(`cart.voucherReason.${result.reason}`, {
        amount: formatCents(result.minOrderCents ?? 0, locale.value as Locale),
      })
    }
  } catch {
    error.value = t('common.error')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div v-if="!cart.voucher">
    <label :for="id" class="kb-label">{{ t('shop.voucher.label') }}</label>
    <div class="flex gap-2">
      <input
        :id="id"
        v-model="code"
        type="text"
        class="kb-input min-w-0 flex-1 uppercase"
        :placeholder="t('cart.voucherPlaceholder')"
        autocomplete="off"
        autocapitalize="characters"
        spellcheck="false"
        enterkeyhint="done"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? `${id}-error` : undefined"
        data-testid="voucher-input"
        @keydown.enter.prevent="apply"
      />
      <button
        type="button"
        class="kb-btn kb-btn-line shrink-0"
        :disabled="pending"
        data-testid="voucher-apply"
        @click="apply"
      >
        {{ t('cart.voucherApply') }}
      </button>
    </div>
    <p v-if="error" :id="`${id}-error`" class="kb-error" role="alert" data-testid="voucher-error">
      {{ error }}
    </p>
  </div>
</template>
