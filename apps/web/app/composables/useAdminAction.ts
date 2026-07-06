import { useToast } from '@print-shop/ui'

interface AdminActionMessages {
  /** Success toast; omit for silent success. */
  success?: string
  /** Error toast fallback when the API response carries no message. */
  error?: string
  /** Set false to skip the refresh after a successful action. */
  refresh?: boolean
}

/**
 * Shared try/toast/refresh wrapper for admin mutations.
 *
 * Runs the given request, shows a success/error toast (preferring the API's
 * `message` from the error body), refreshes the page data and guards against
 * concurrent submissions via the returned `pending` ref.
 */
export function useAdminAction(options?: { refresh?: () => Promise<unknown> }) {
  const toast = useToast()
  const pending = ref(false)

  async function run(
    action: () => Promise<unknown>,
    messages: AdminActionMessages = {},
  ): Promise<boolean> {
    if (pending.value) return false
    pending.value = true
    try {
      await action()
      if (messages.success) toast.show(messages.success, { variant: 'success' })
      if (messages.refresh !== false) await options?.refresh?.()
      return true
    } catch (err) {
      const data = (err as { data?: { error?: string; message?: string } })?.data
      // Curated API messages (conflict, bad_request, …) are user-facing; the
      // generic zod text and internal errors are not — fall back to German.
      const apiMessage =
        data?.error && data.error !== 'validation_error' && data.error !== 'internal_error'
          ? data.message
          : undefined
      toast.show(apiMessage ?? messages.error ?? 'Aktion fehlgeschlagen', { variant: 'error' })
      return false
    } finally {
      pending.value = false
    }
  }

  return { run, pending }
}
