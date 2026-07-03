<script setup lang="ts">
import { PsButton, PsCard, PsInput, PsOrderStatusBadge, PsPrice, PsSection } from '@print-shop/ui'
import type { Locale, OrderStatus } from '@print-shop/types'
import { requestPortalLink, usePortal } from '~/composables/usePortal'

/**
 * Magic-link portal: aggregate view of every order/quote/configuration for an
 * email. noindex + no-referrer so the token never leaks to a search index or
 * an outbound Referer header.
 */
const { t, locale } = useI18n()
const route = useRoute()
const token = String(route.params.token)

useHead({
  meta: [
    { name: 'robots', content: 'noindex, nofollow' },
    { name: 'referrer', content: 'no-referrer' },
  ],
})

const { orders, quotes, configurations, email, loading, errorKind, load, downloadInvoice } =
  usePortal(token)

const renewEmail = ref('')
const renewSubmitted = ref(false)

onMounted(load)

async function renew() {
  await requestPortalLink({ email: renewEmail.value || email.value || '', locale: locale.value })
  renewSubmitted.value = true
}

function productionLabel(order: (typeof orders.value)[number]): string {
  const p = order.production
  if (!p || p.total === 0) return t('portal.production.none')
  const done = (p.byStatus.shipped ?? 0) + (p.byStatus.ready_to_ship ?? 0)
  return t('portal.production.progress', { done, total: p.total })
}
</script>

<template>
  <PsSection>
    <div class="mx-auto max-w-[52rem]" data-testid="portal">
      <h1 class="text-heading-medium">{{ t('portal.title') }}</h1>
      <p v-if="email" class="mt-sm text-body-regular text-secondary">{{ email }}</p>

      <p v-if="loading" class="mt-xl text-body-regular text-secondary" data-testid="portal-loading">
        {{ t('common.loading') }}
      </p>

      <!-- Expired token → renewal form -->
      <PsCard v-else-if="errorKind === 'expired'" class="mt-xl" data-testid="portal-expired">
        <h2 class="text-label-medium">{{ t('portal.expired.title') }}</h2>
        <p class="mt-md text-body-regular text-secondary">{{ t('portal.expired.intro') }}</p>
        <div v-if="renewSubmitted" class="mt-md text-body-regular" data-testid="portal-renew-confirmation">
          {{ t('portal.request.confirmation') }}
        </div>
        <form v-else class="mt-md flex flex-col gap-md" @submit.prevent="renew">
          <PsInput
            v-model="renewEmail"
            type="email"
            :label="t('portal.request.email')"
            name="renewEmail"
            :placeholder="email ?? ''"
            data-testid="portal-renew-email"
          />
          <PsButton type="submit" data-testid="portal-renew-submit">{{ t('portal.expired.renew') }}</PsButton>
        </form>
      </PsCard>

      <PsCard v-else-if="errorKind" class="mt-xl" data-testid="portal-invalid">
        <p class="text-body-regular">{{ t('portal.invalid') }}</p>
        <NuxtLink :to="`/${locale === 'de' ? '' : locale + '/'}portal`" class="mt-md block text-brand hover:underline">
          {{ t('portal.requestNew') }}
        </NuxtLink>
      </PsCard>

      <template v-else>
        <!-- Orders -->
        <section class="mt-xl">
          <h2 class="text-label-medium">{{ t('portal.orders') }}</h2>
          <p v-if="orders.length === 0" class="mt-md text-body-regular text-secondary">
            {{ t('portal.noOrders') }}
          </p>
          <div class="mt-md flex flex-col gap-md">
            <PsCard
              v-for="order in orders"
              :key="order.orderNumber"
              data-testid="portal-order-card"
              :data-order="order.orderNumber"
            >
              <div class="flex flex-wrap items-center justify-between gap-md">
                <span class="text-label-medium">{{ order.orderNumber }}</span>
                <PsOrderStatusBadge
                  :status="order.status as OrderStatus"
                  :label="t(`order.statuses.${order.status}`)"
                />
              </div>
              <div class="mt-md flex flex-wrap items-center justify-between gap-md text-body-regular">
                <span class="text-secondary">{{ productionLabel(order) }}</span>
                <PsPrice :cents="order.totalCents" :locale="locale as Locale" size="sm" />
              </div>
              <p
                v-if="order.trackingNumber"
                class="mt-sm text-body-regular"
                data-testid="portal-order-tracking"
              >
                📦 {{ order.carrier?.toUpperCase() }} ·
                <span class="font-mono">{{ order.trackingNumber }}</span>
              </p>
              <div class="mt-md flex flex-wrap gap-sm">
                <a :href="order.orderUrl" target="_blank" rel="noopener">
                  <PsButton variant="secondary" size="sm" data-testid="portal-order-details">
                    {{ t('portal.actions.details') }}
                  </PsButton>
                </a>
                <PsButton
                  v-if="order.invoiceAvailable"
                  variant="ghost"
                  size="sm"
                  data-testid="portal-order-invoice"
                  @click="downloadInvoice(order.orderNumber)"
                >
                  {{ t('portal.actions.invoice') }}
                </PsButton>
                <NuxtLink :to="`/complaint/new?order=${order.orderNumber}&token=${order.accessToken}`">
                  <PsButton variant="ghost" size="sm" data-testid="portal-order-complaint">
                    {{ t('portal.actions.complaint') }}
                  </PsButton>
                </NuxtLink>
              </div>
              <div v-if="order.complaints.length" class="mt-md text-caption text-secondary">
                {{ t('portal.complaintsOnOrder') }}:
                {{ order.complaints.map((c) => c.complaintNumber).join(', ') }}
              </div>
            </PsCard>
          </div>
        </section>

        <!-- Quotes -->
        <section v-if="quotes.length" class="mt-xl" data-testid="portal-quotes">
          <h2 class="text-label-medium">{{ t('portal.quotes') }}</h2>
          <div class="mt-md flex flex-col gap-sm">
            <PsCard v-for="(quote, i) in quotes" :key="i">
              <div class="flex items-center justify-between gap-md">
                <span>{{ quote.quoteNumber ?? t('portal.quote') }}</span>
                <a v-if="quote.quoteUrl" :href="quote.quoteUrl" class="text-brand hover:underline">
                  {{ t('portal.actions.open') }}
                </a>
              </div>
            </PsCard>
          </div>
        </section>

        <!-- Saved configurations -->
        <section v-if="configurations.length" class="mt-xl" data-testid="portal-configurations">
          <h2 class="text-label-medium">{{ t('portal.configurations') }}</h2>
          <div class="mt-md flex flex-col gap-sm">
            <PsCard v-for="(config, i) in configurations" :key="i">
              <div class="flex flex-wrap items-center gap-sm">
                <span
                  v-for="(sw, j) in config.swatches ?? []"
                  :key="j"
                  class="inline-flex items-center gap-xs text-caption"
                >
                  <span
                    class="inline-block h-4 w-4 rounded-full border border-subtle"
                    :style="{ backgroundColor: sw.hex }"
                  />
                  {{ sw.name }}
                </span>
              </div>
            </PsCard>
          </div>
        </section>
      </template>
    </div>
  </PsSection>
</template>
